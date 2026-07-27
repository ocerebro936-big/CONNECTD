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
