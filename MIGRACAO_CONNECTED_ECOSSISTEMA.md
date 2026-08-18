# Migração para o projeto Firebase "connected-ecossistema"

## Estado atual (Augusto 2026)
- ✅ Firebase CLI instalado e ligado (`ocerebro936@gmail.com`)
- ✅ Firebase **ativado** no projeto GCP `connected-ecossistema` (`firebase projects:addfirebase`)
- ✅ App Web registada: "app-connected" — appId `1:1076717451627:web:544766e73c80d9640cf42e`
- ✅ `firebase-applet-config.json` já aponta para `connected-ecossistema` (firestoreDatabaseId `(default)`)
- ✅ Base de dados Firestore `(default)` **criada** e regras + índices **deployed**
- ✅ Firebase Hosting deployed: **https://connected-ecossistema.web.app** (SPA, PWA, dist/).
- ⚠️ Pendente no console (tela, 1x):

  **PENDENTE** — verificava últimas 1× no console:
  1. **Storage** (bucket default ainda NÃO criado): Build > Storage > Get started → criar bucket `connected-ecossistema.firebasestorage.app` (mesma região do Firestore). Depois correr `firebase deploy --only storage`.
   2. **Authentication**: Build > Authentication > Sign-in method → ativar **Google** e **Email/Password**; em *Authorized domains* adicionar `connected-ecossistema.web.app` (manter `ocerebro936-big.github.io` apenas se o GH Pages continuar ativo).
  3. (Se um dia começar App Hosting: exige plano Blaze + conta de billing no projeto — a conta `0189C7-F5843D-071E0F` está associada a `keen-cargo-m8qfq`, não a este projeto.)

## Comandos úteis
- Deploy total (regras + hosting): `firebase deploy`
- Só regras: `firebase deploy --only firestore:rules,firestore:indexes,storage:rules`
- Só hosting: `firebase deploy --only hosting`

## Nota
- Verificação de e-mail e 2FA exigem Authentication ativado e Template de e-mails configurado.
- As regras do repo cobrem 2FA, sessões, ledger financeiro e todos os módulos.
- Se houver dados no projeto antigo (`gen-lang-client-0029245143`, base `ai-studio-...`), a migração de dados é **export/import** Firestore: não é automática.