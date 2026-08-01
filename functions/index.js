const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// 1. Initiate Cloud Call - Verifies point balance
exports.initiateCloudCall = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Precisa de estar ligado à Connected.");
  }

  const callerId = context.auth.uid;
  const { targetUserId } = data;

  const callerRef = admin.firestore().collection("users").doc(callerId);
  const callerDoc = await callerRef.get();

  if (!callerDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Utilizador não encontrado.");
  }

  const userData = callerDoc.data();
  const currentPoints = userData.points || 0;

  if (currentPoints < 10) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Pontos insuficientes! Publique conteúdos úteis na rede para ganhar saldo de chamadas."
    );
  }

  await callerRef.update({
    points: admin.firestore.FieldValue.increment(-10)
  });

  const callSession = await admin.firestore().collection("calls").add({
    callerId: callerId,
    receiverId: targetUserId,
    status: "Ringing",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, callId: callSession.id, remainingPoints: currentPoints - 10 };
});

// 2. Reward deep/informative posts with points
exports.rewardDeepPost = functions.firestore
  .document("posts/{postId}")
  .onCreate(async (snap, context) => {
    const post = snap.data();
    const authorId = post.userId;
    const content = post.content || "";

    let pointsAwarded = 5;

    if (content.length > 100) pointsAwarded += 10;
    if (content.length > 250) pointsAwarded += 20;
    if (content.length > 500) pointsAwarded += 30;
    if (post.image) pointsAwarded += 15;

    const userRef = admin.firestore().collection("users").doc(authorId);
    await userRef.update({
      points: admin.firestore.FieldValue.increment(pointsAwarded),
      communityImpactScore: admin.firestore.FieldValue.increment(pointsAwarded)
    });

    console.log(`Reward of ${pointsAwarded} points awarded to user ${authorId}.`);
  });

// 3. Reward helpful comments
exports.rewardHelpfulComment = functions.firestore
  .document("posts/{postId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const comment = snap.data();
    const authorId = comment.userId;
    const content = comment.content || "";

    let pointsAwarded = 1;
    if (content.length > 50) pointsAwarded = 5;
    else if (content.length > 20) pointsAwarded = 3;

    const userRef = admin.firestore().collection("users").doc(authorId);
    await userRef.update({
      points: admin.firestore.FieldValue.increment(pointsAwarded),
    });

    console.log(`Reward of ${pointsAwarded} points awarded to user ${authorId} for comment.`);
  });

// 4. Deduct points per minute of call
exports.deductCallTime = functions.firestore
  .document("calls/{callId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== "connected" && after.status === "connected") {
      const callerId = after.callerId;
      const userRef = admin.firestore().collection("users").doc(callerId);
      await userRef.update({
        points: admin.firestore.FieldValue.increment(-10),
      });
      console.log(`Deducted 10 points from ${callerId} for call connection.`);
    }
  });

// 5. Stripe webhook - credits points after confirmed payment
// Set STRIPE_SECRET (Signing secret) and STRIPE_PRICE_MAP ({"starter": "price_xxx", ...}) in firebase functions config:
//   firebase functions:config:set stripe.secret="whsec_..." stripe.price_map="{\"starter\":\"price_x\",\"basic\":\"price_y\",\"pro\":\"price_z\",\"premium\":\"price_w\"}"
// Test locally with: stripe listen --forward-to http://localhost:5001/<project>/<region>/stripeWebhook
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2023-10-16",
  });

  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

  if (!sig || !endpointSecret) {
    res.status(500).send("Webhook não configurado (STRIPE_WEBHOOK_SECRET).");
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Stripe signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const purchaseId = session.client_reference_id;

    if (!purchaseId) {
      console.warn("checkout.session.completed sem client_reference_id; ignorado.");
      res.json({ received: true });
      return;
    }

    const purchaseRef = admin.firestore().collection("purchases").doc(purchaseId);
    const purchaseDoc = await purchaseRef.get();

    if (!purchaseDoc.exists) {
      console.error(`Compra ${purchaseId} não encontrada.`);
      res.json({ received: true, error: "purchase-not-found" });
      return;
    }

    const purchase = purchaseDoc.data();

    if (purchase.status === "confirmed") {
      console.log(`Compra ${purchaseId} já confirmada.`);
      res.json({ received: true });
      return;
    }

    await purchaseRef.update({
      status: "confirmed",
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      confirmedBy: "stripe-webhook",
      stripeSessionId: session.id,
      stripeAmount: session.amount_total || null,
    });

    const userRef = admin.firestore().collection("users").doc(purchase.userId);
    await userRef.update({
      points: admin.firestore.FieldValue.increment(purchase.points || 0),
    });

    await admin.firestore().collection("notifications").add({
      userId: purchase.userId,
      type: "purchase",
      message: `${purchase.points} pontos foram creditados na tua conta (pagamento Stripe confirmado).`,
      actorId: "system",
      actorName: "Connected",
      actorAvatar: "",
      link: "",
      read: false,
      createdAt: admin.firestore.Timestamp.now().toMillis(),
    });

    console.log(`Compra ${purchaseId} confirmada via Stripe; ${purchase.points} pts creditados.`);
  }

  res.json({ received: true });
});

// 6. Auto-confirm purchases (fallback if webhook misses) - triggered by reference match
exports.autoConfirmPurchases = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const cutoff = now - dayMs;

    const pending = await admin.firestore()
      .collection("purchases")
      .where("status", "==", "pending")
      .where("createdAt", "<", cutoff)
      .get();

    pending.forEach(async (snap) => {
      const p = snap.data();
      if (p.provider === "bank" && p.reference && p.reference.startsWith("CONN-")) {
        const ref = admin.firestore().collection("purchases").doc(snap.id);
        await ref.update({ status: "expired", note: "Expirada automaticamente após 24h sem confirmação." });
        console.log(`Compra ${snap.id} expirada.`);
      }
    });

    console.log(`autoConfirmPurchases: ${pending.size} compras antigas processadas.`);
  });
