# ✅ Connected Production Checklist

> Checklist de produção da plataforma Connected — estado real auditado no código (data: 2026-08-01).
>
> Legenda: 🟢 Funcional · 🟡 Parcial / em desenvolvimento · 🔴 Com erro · ⚪ Não implementado

---

## 🔄 Atualização pós-correção (2026-08-01)

Todas as correções foram implementadas, publicadas e commitadas (`4db2ee2`). Estado novo por módulo:

| Módulo | Antes | Agora |
|---|---|---|
| Publicar fotos/vídeos | 🔴 sempre negado (`content: ''`) | 🟢 regras aceitam post só com media |
| Stories | 🔴 sempre negado (`expiresAt` número) | 🟢 publica + **exibidos no feed** (visualizador fullscreen, auto-avanço, expiração 24h) |
| Galeria | 🔴 nunca guardava | 🟢 publica (fotos+vídeos) e a grelha mostra **items reais** com likes/apagar/Enviar para TV |
| Chamadas | 🔴 `receiverId` vs `calleeId` | 🟢 regras alinhadas; **chamadas de voz** (audio-only) + vídeo, escolha na hora de ligar |
| Amigos | 🔴 sem regras | 🟢 regras `friendRequests` criadas (enviar/aceitar/recusar) + botão "Adicionar Amigo" no perfil de terceiros |
| SMS offline | 🔴 `timestamp` vs `createdAt` | 🟢 regras aceitam ambos |
| Comunidades | 🔴 `community_members` sem regras | 🟢 regras criadas |
| Bloqueios | 🔴 sem efeito | 🟢 posts e mensagens de bloqueados filtrados |
| Pesquisa | 🔴 cosmética | 🟢 pesquisa real: pessoas, empresas, publicações (painel com resultados) |
| Mensagens | 🟡 sem não lidas | 🟢 botão de mensagens no header com badge, lista de conversas, **estado entregue** (✓✓) |
| Contador de comentários | 🔴 race condition | 🟢 `increment()` |
| Likes após login | 🔴 estado errado | 🟢 re-subscrição com `user` nas deps |
| Notificações webhook | 🔴 mal ordenadas | 🟢 `createdAt` como número |
| Perfil | 🟡 | 🟢 contadores de fotos/vídeos em tempo real; nível criador (Prata/Ouro/Platina) calculado dos pontos |
| `storage.rules` + `firestore.indexes.json` | 🔴 inexistentes | 🟢 criados no repo |
| Erros reportados | 🔴 `throw` silencia alertas | 🟢 `handleFirestoreError` apenas regista |

**Ainda pendente (requer conta/CLI, não código):** deploy do `firestore.rules`/`storage.rules`/índices (CLI Firebase), deploy das functions (webhook Stripe), Payment Links Stripe, FCM push.

---

## 0. 🏗️ Infraestrutura / Backend

| Item | Estado | Notas |
|---|---|---|
| Frontend hospedado (GitHub Pages) | 🟢 | `https://ocerebro936-big.github.io/CONNECTD/` — deploy automático por `npm run build` + `gh-pages` |
| Autenticação Firebase Auth | 🟢 | Email + Google; funciona a partir de qualquer hosting (é um serviço cloud, não depende do GitHub Pages) |
| Firestore (base de dados) | 🟢 | Regras escritas no repo; **pendente deploy das regras** (CLI Firebase não instalada) |
| Firebase Storage (uploads) | 🟢 | Configurado no código (`src/firebase.ts:10`); **sem `storage.rules` no repo** — regras ativas dependem da console Firebase |
| Cloud Functions | 🟡 | `functions/index.js` pronto (webhook Stripe, auto-confirmação); **deploy bloqueado** (sem CLI) |
| Índices compostos (`firestore.indexes.json`) | 🔴 | **Não existe no repo**; `messages (participants, createdAt)` e `notifications (userId, createdAt)` exigem índices compostos que só funcionam se criados manualmente na console |
| Webhook Stripe + confirmação automática | 🔴 | Código pronto, mas sem deploy das functions e sem `STRIPE_WEBHOOK_SECRET` configurado |
| Deploy do `firestore.rules` (muitas regras novas: purchases admin, companies, etc.) | 🔴 | Escritas mas **não publicadas** — sem elas, várias funcionalidades falham |

---

## 1. 💬 Chat

| Item | Estado | Notas |
|---|---|---|
| Enviar mensagem | 🟢 | `ChatModal.tsx:136-164` — `addDoc` em `messages`, regras compatíveis |
| Mensagem aparece imediatamente para quem envia | 🟡 | Sem optimistic update — só após confirmação do servidor (spinner `isSending`) |
| Destinatário recebe em tempo real | 🟢 | `onSnapshot` em `messages` (`App.tsx:385-392`) |
| Indicador "a escrever..." | 🟢 | Coleção `typing`, doc por conversa, expira após 3s (`ChatModal.tsx:97-134`) |
| Estado enviada / entregue / lida | 🟡 | Só `read` (✓ / ✓✓); **"entregue" não existe** (`ChatModal.tsx:368-371`) |
| Contador de mensagens não lidas | ⚪ | Não existe lista de conversas (`ChatsPage` não existe); badge do sino é de notificações |
| Notificação ao receber mensagem | 🟡 | Só som; não cria notificação na coleção `notifications` |
| Enviar fotos/vídeos/áudio no chat | 🟢 | Upload para Storage + mensagem com URL (`ChatModal.tsx:174-207`) |
| Lista de conversas | ⚪ | Não implementada — chat abre só via Networking |
| Busca por `handleSendMessage` em `App.tsx:888-906` | 🔴 | **Código morto** (props nunca usadas no JSX) |

---

## 2. 📞 Chamadas

| Item | Estado | Notas |
|---|---|---|
| Iniciar chamada (vídeo) | 🔴 | **Quebrado**: app grava `receiverId`, regras exigem `calleeId` → `PERMISSION_DENIED` (`CallModal.tsx:216` vs `firestore.rules:272-285`) |
| Chamada de voz | ⚪ | Só vídeo (`type: 'video'` hardcoded — `CallModal.tsx:217`) |
| Receber chamada (banner + atender/recusar) | 🟡 | UI existe (`App.tsx:1768-1824`) mas nunca dispara pelo bug acima |
| Sinalização WebRTC | 🟡 | Real (STUN/TURN, offer/answer em `calls`, ICE em `calls/{id}/ice`) mas inutilizada pelo bug das regras |
| Silenciar / câmara on-off | 🟡 | Implementado via `applyMediaState`; não testável em produção com o bug das regras |
| Altifalante (alta-voz) | ⚪ | Não existe seleção de dispositivo de saída |
| Histórico de chamadas | ⚪ | Não implementado |
| Custo da chamada (10 pts + 10 pts/min) | 🟡 | Lógica presente (`CallModal.tsx:205-230`) mas bloqueada pelo bug |

---

## 3. 📷 Publicar Fotos

| Item | Estado | Notas |
|---|---|---|
| Selecionar foto | 🟢 | `FeedPage.tsx:276-295` |
| Upload para Storage | 🟢 | `uploadString` em `photos/<ts>_<uid>` (`FeedPage.tsx:96-99`) |
| Guardar post no Firestore | 🔴 | **Sempre negado**: o post grava `content: ''` (`FeedPage.tsx:106`) mas `isValidPost` exige `content.size() > 0` (`firestore.rules:86`) → "Erro ao enviar ficheiro" após upload (ficheiros órfãos no bucket) |
| Compressão/redimensionamento | ⚪ | Não existe no feed (só em foto de perfil) — fotos vão cruas em base64 |
| Barra de progresso | ⚪ | Não existe |
| Aparecer no feed imediatamente | 🟡 | Sem optimistic update; depende do snapshot (que falha com o bug acima) |

---

## 4. 🎥 Publicar Vídeos

| Item | Estado | Notas |
|---|---|---|
| Selecionar vídeo | 🟢 | `FeedPage.tsx` |
| Upload para Storage | 🟢 | `videos/<ts>_<uid>` |
| Guardar post no Firestore | 🔴 | Mesmo bug do `content: ''` |
| Compressão de vídeo | ⚪ | Enviado cru (dataURL base64, inflação ~33% na rede) |
| Miniatura | ⚪ | Não gerada |
| Barra de progresso | ⚪ | Não existe |
| Playback no feed | 🟢 | `media.type === 'video'` renderizado |

---

## 5. 👥 Amigos

| Item | Estado | Notas |
|---|---|---|
| Enviar pedido de amizade | 🔴 | **Sem regras `friendRequests` no `firestore.rules`** → `PERMISSION_DENIED` (`App.tsx:185-203`) |
| Receber pedido | 🔴 | Idem (leitura negada) |
| Aceitar / recusar | 🔴 | Idem |
| Lista de amigos | 🟡 | UI existe (`ConnectionsPage.tsx:121-138`) mas vazia pelo bug acima |
| Remover amigo | ⚪ | Não implementado |
| Bloquear utilizador | 🔴 | Grava em `blocks` mas `blockedIds` nunca é usado para filtrar nada (`App.tsx:444-447`) |
| Pesquisar amigos (por nome) | ⚪ | Só filtro por país |
| Botão "Adicionar Amigo" no perfil | ⚪ | Não existe no `ProfilePage` |

---

## 6. ➕ Seguir

| Item | Estado | Notas |
|---|---|---|
| Seguir / deixar de seguir | 🟢 | `follows/{followerId}_{followingId}` (`App.tsx:480-488`), regras compatíveis |
| Contador atualiza em tempo real | 🟢 | `onSnapshot` (`DashboardPage.tsx:42-43`, `ProfilePage.tsx:40-42`) |
| Notificação ao seguido | 🟢 | `createNotification(..., 'follow', ...)` (`App.tsx:489`) |
| Feed "Seguindo" filtra por quem sigo | 🟢 | `FeedPage.tsx:147-148` |

---

## 7. 🔢 Contadores

| Item | Estado | Notas |
|---|---|---|
| Seguidores / A seguir (perfil) | 🟢 | Tempo real (`onSnapshot`) |
| Likes dos posts | 🟡 | Tempo real, mas **`isLiked`/`currentUserRating` não re-subscrito após login** (dependência `[]` em `App.tsx:317-337`) |
| Comentários | 🟡 | Tempo real só com painel aberto; contador atualizado por `getDoc`+`updateDoc` (**race condition** — deve ser `increment()`) |
| Fotos / Vídeos / Reels no perfil | ⚪ | Não existem contadores |
| Pontos (gamificação) | 🟡 | Chamadas/games debitam pontos; visibilidade parcial |
| Views de empresas | 🟢 | `increment(1)` server-side + lista em tempo real (sem anti-duplicado) |
| Pedidos de amizade pendentes | 🔴 | Quebrado com os pedidos de amizade |

---

## 8. 📰 Feed

| Item | Estado | Notas |
|---|---|---|
| Publicar texto | 🟢 | `content` válido → regras aceitam |
| Publicar foto/vídeo | 🔴 | Bloqueado (bug `content: ''` — ver #3/#4) |
| Publicar story | 🔴 | **Sempre negado**: `expiresAt` número mas regra exige string (`FeedPage.tsx:133` vs `firestore.rules:258`); e stories nem sequer são exibidos em lado nenhum |
| Aparecer imediatamente após publicar | 🟡 | Sem optimistic update (depende de snapshot) |
| Notificação de post novo aos seguidores | ⚪ | Não implementado |
| Feed imersivo (slides, swipe, ratings) | 🟢 | Modo imersivo + lista (publicado) |
| Stories (exibição) | ⚪ | Sem leitura da coleção `stories` no app |

---

## 9. 👤 Perfil

| Item | Estado | Notas |
|---|---|---|
| Foto de perfil / capa | 🟢 | Upload com compressão canvas (máx. 800×800 / 1920×1080, qualidade 0.8) — `App.tsx:624-679`; guardado via `handleSaveProfile` |
| Editar perfil (nome, descrição, links, profissão) | 🟢 | `handleSaveProfile` (`App.tsx:681-710`) |
| Ver perfil de terceiros | ⚪ | `ProfilePage` só mostra o utilizador logado; o link `?user=` não é lido por ninguém |
| Contadores de fotos/vídeos | ⚪ | Não existem |
| Cartão "Nível Criador: Ouro" | 🔴 | Estático/hardcoded (`App.tsx:1330-1338`) — não reflete dados reais |

---

## 10. 🔔 Notificações

| Item | Estado | Notas |
|---|---|---|
| Notificações in-app (seguir, like, comentário, rating, pedido amizade, compra) | 🟢 | 7 eventos; painel com badge `9+`, marcar como lidas (`App.tsx:1415-1464`) |
| Notificação de mensagem privada | ⚪ | Não implementado (só som) |
| Notificações de menção (@) | ⚪ | Não implementado |
| Notificação de post novo de quem sigo | ⚪ | Não implementado |
| Ordenação do webhook Stripe | 🔴 | `createdAt` como Timestamp vs número nos outros → notificações de compra aparecem sempre no fim (`functions/index.js:181`) |
| Push FCM | ⚪ | Não implementado (sem `firebase/messaging`, sem service worker FCM) |

---

## 11. 🔍 Pesquisa

| Item | Estado | Notas |
|---|---|---|
| Barra de pesquisa no header | 🔴 | **Placeholder cosmético** — `onSubmit` só volta ao feed e limpa o campo (`App.tsx:1385-1402`) |
| Pesquisar pessoas | ⚪ | Não implementado |
| Pesquisar empresas/páginas | ⚪ | Não implementado |
| Pesquisar vídeos/fotos | ⚪ | Não implementado |
| Pesquisar grupos | ⚪ | Grupos não existem como funcionalidade |
| Pesquisar jogos | ⚪ | Não implementado |

---

## 12. 🤖 DIVINO IA

| Item | Estado | Notas |
|---|---|---|
| Chat com DIVINO IA | 🟢 | `DivinoIa.tsx` — Core local (base de conhecimento + memória localStorage) + Gemini 2.0 Flash com chave do utilizador (`divino-core.ts:251-302`) |
| Responder perguntas / base de conhecimento | 🟢 | `searchKnowledge` + `divinoLocalReply` |
| Analisar imagens | ⚪ | Não implementado (Gemini de texto apenas) |
| Gestor do ecossistema (dashboard) | 🟢 | `AiInsightsPage.tsx` — financeiro, previsões, infra, moderação, sugestões, CSV |
| Ajuda a administradores | 🟢 | Painel autónomo (`DivinoAutonomousPanel.tsx`) + gestor |
| IA via Cloud Functions (sem chave do utilizador) | ⚪ | Não existe endpoint de IA nas functions |

---

## 13. 💳 Pagamentos & Admin

| Item | Estado | Notas |
|---|---|---|
| Comprar pacotes (Stripe Payment Links + banco) | 🟡 | Fluxo real implementado; requer links Stripe configurados pelo admin (localStorage `connected_stripe_links`) |
| Pagamento por banco (referência CONN + IBAN) | 🟢 | Ref formatada + IBAN `MZ59 0003 0000 0000 0000 0000` |
| Confirmação automática (webhook) | 🔴 | Bloqueado — sem deploy das functions |
| Confirmação manual (admin) | 🟢 | `AdminPanel` (compras, denúncias, jogos) — só admin (`ocerebro936@gmail.com` ou role admin) |
| Regras de compras no Firestore | 🔴 | Escritas mas não publicadas (sem CLI) |

---

## 14. 🖥️ Interface (menus e páginas)

| Separador | Estado | Notas |
|---|---|---|
| Feed Principal | 🟢 | Imersivo + lista |
| Meu Perfil | 🟢 | Ver #9 |
| Dashboard | 🟢 | Membro / Trabalhar / Faculdade / Espaço Criador + Admin (para admin) |
| Integrações | 🟡 | Amigos quebrados (#5) |
| IA Insights | 🟢 | Gestor DIVINO |
| Networking | 🟡 | Chat DIVINO 🟢; comunidades (`community_members`) 🔴 — regras só cobrem `communities/{id}/members`; SMS offline 🔴 — `timestamp` vs `createdAt` (`NetworkPage.tsx:288-296` vs `firestore.rules:304-312`) |
| Galeria (Loja) | 🔴 | **Sempre negado**: app grava `imageUrl` sem `type`, regra exige `url`+`type` (`GalleryPage.tsx:64-70` vs `firestore.rules:262`); grelha mostra imagens hardcoded `picsum.photos` — items reais nunca exibidos |
| Connect TV | 🟢 | Lives + chat + som |
| Games Online | 🟢 | Jogos + pontos + som |
| Empresas | 🟢 | Perfis, loja, campanhas, estatísticas |
| Definições | 🟢 | Perfil, Identidade Sonora, etc. |
| Bottom nav mobile | 🟢 | 5 itens (Feed, Rede, Games, TV, Perfil) |

---

## 🔥 Bugs críticos (corrigir primeiro — todos pequenos e de alto impacto)

| # | Ficheiro:linha | Bug | Impacto |
|---|---|---|---|
| 1 | `FeedPage.tsx:106` + `firestore.rules:86` | Post de media grava `content: ''`; regra exige `content.size() > 0` | **Foto/vídeo nunca publica** |
| 2 | `FeedPage.tsx:133` + `firestore.rules:258` | Story grava `expiresAt` número; regra exige string | **Story nunca publica** |
| 3 | `GalleryPage.tsx:64-70` + `firestore.rules:262` | App grava `imageUrl` (sem `type`); regra exige `url`+`type` | **Galeria nunca guarda nada** |
| 4 | `CallModal.tsx:216` + `firestore.rules:272-285` | App grava `receiverId`; regras exigem `calleeId` | **Chamadas bloqueadas** |
| 5 | `firestore.rules` | Sem regras para `friendRequests` | **Amigos bloqueados** |
| 6 | `NetworkPage.tsx:288-296` + `firestore.rules:304-312` | SMS offline: `timestamp` vs `createdAt` | **SMS offline bloqueado** |
| 7 | `NetworkPage.tsx:201` | `community_members` fora do caminho das regras | **Participar em comunidades bloqueado** |
| 8 | `App.tsx:444-447` | `blockedIds` carregado mas nunca usado | **Bloqueio não funciona** |
| 9 | `App.tsx:1385-1402` | Barra de pesquisa sem efeito | **Pesquisa inexistente** |
| 10 | `App.tsx:317-337` | `isLiked`/`currentUserRating` sem re-subscrição após login | **Likes/ratings mostram estado errado** |
| 11 | `App.tsx:796-800` | Contador de comentários com `getDoc`+`updateDoc` | **Race condition** |
| 12 | `functions/index.js:181` | `createdAt` Timestamp vs número nas notificações | **Notificações de compra mal ordenadas** |
| 13 | `src/lib/firebase-errors.ts:51` | `handleFirestoreError` faz `throw` → alertas de erro são código morto | **Erros mal reportados** |
| 14 | — | Sem `storage.rules` e `firestore.indexes.json` no repo | **Uploads/índices dependem da console** |

---

## 📋 Ordem recomendada de correção

1. **Regras + alinhamento de campos** (bugs 1–7, 12): maioria são correções de 1 linha em `firestore.rules` ou no app — desbloqueiam fotos, vídeos, stories, galeria, amigos, chamadas, SMS, comunidades
2. **Deploy das regras** (firebase CLI) — sem isto, as correções anteriores não têm efeito em produção
3. **Funcionalidades em falta com maior impacto**: pesquisa real (pessoas + empresas + conteúdo), contador de não lidas, lista de conversas, botão Adicionar Amigo no perfil
4. **Contadores**: fotos/vídeos no perfil, likes após login, comentários com `increment()`
5. **FCM push** e **WebRTC voz** como fase seguinte
