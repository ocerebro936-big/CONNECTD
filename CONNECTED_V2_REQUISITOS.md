# 🌐 Connected v2.0 — Requisitos & Estado de Implementação

> Roadmap da versão 2.0 da plataforma Connected (Bluewhite Corporation Lda).
> Data: 2026-08-06 · Legenda: 🟢 Feito · 🟡 Em progresso · ⚪ Pendente

---

## 🎨 Glassmorphism Premium
- [x] Transparência 75–90% em todos os painéis
- [x] Blur suave para legibilidade
- [x] Bordas com brilho dourado (identidade Connected)
- [x] Reflexos de vidro (gradientes subtis + highlights)
- [x] Sombras leves — interface "flutuante" sobre o fundo
- Estado: 🟡 CSS base já existe (`.glass*`); falta refinar transparências/reflexos

## 🖼 Background Vivo
- [x] Categorias: 🌌 Universo, ☁️ Céu, 🌅 Nascer do Sol, 🌇 Pôr do Sol, 🌙 Noite, 🌿 Natureza, 🌊 Oceanos, 🏙 Cidades, 💻 Tecnologia, 🌍 Terra, 🎨 Arte Digital, 🎄 Sazonal
- [x] Adicionar categorias: 🌅 Nascer do Sol, 🌇 Pôr do Sol, 🌙 Noite, 🌊 Oceanos
- [ ] Alta resolução + adaptação automática ao dispositivo
- Estado: 🟡 `BackgroundSlider` já tem rotação/auto-rotate/preferências; faltam categorias novas

## 📤 Publicações Reais (eliminar demo)
- [x] Fluxo: Selecionar → Pré-visualização → Compressão → Upload Connected Cloud → Criação → Feed Global → Notificação aos seguidores
- [x] Compressão inteligente de fotos (canvas: max 1920px, JPEG 82%) em fotos, stories, galeria e chat
- [ ] Pré-visualização de fotos/vídeos antes do upload no feed
- [ ] Tipos: fotografias, vídeos, reels, texto, PDFs, slides, áudio
- Estado: ⚪ parcial (fotos/vídeos via Storage existem; falta pré-visualização, compressão inteligente, PDF/slides/áudio)

## 📺 Connect TV
- [x] Biblioteca organizada: Música, Filmes, Educação, Notícias, Desporto, Podcasts, Documentários, Lives
- [x] Cada vídeo: miniatura, título, criador, duração, pontuação, visualizações
- [x] Clique → reprodução imediata
- Estado: 🟢 biblioteca por categorias implementada

## 🎮 Games Online
- [x] Portal de jogos com categorias: 🎯 Ação, 🏎 Corridas, ⚽ Desporto, 🧩 Puzzle, 👨‍👩‍👧 Família, 🧠 Estratégia, 🎲 Cartas e Tabuleiro, 🌍 Multiplayer, 👶 Infantil, 🕹 Clássicos
- [x] Cada jogo: capa, nome, categoria, classificação etária, nº jogadores, botão "Jogar Agora"
- [x] Portal de Desenvolvedores → submissão → aprovação da moderação (painel admin)
- Estado: 🟢 portal completo

## ✨ Logótipo Animado
- [x] Brilho dourado pulsante
- [x] Partículas luminosas
- [x] Circuito interno iluminado (scan animado)
- [x] Efeito de respiração no ecrã inicial
- [ ] Rotação lenta em 3D
- [ ] Animação à abertura da app
- Estado: 🟡 animações core feitas; falta rotação 3D + entrada

## 👥 Amigos e Seguidores (reais)
- [ ] Seguir: clique → DB → contador → notificação → feed (existe: 🟢)
- [ ] Conectar Amigos: pedido → aceite → lista → chat → chamadas (existe base: 🟡 `friendRequests`)
- Estado: 🟡 falta completar pedidos/lista/remoção

## ⚡ Desempenho
- [ ] Carregamento inicial rápido
- [ ] Imagens progressivas (lazy loading)
- [ ] Vídeos adaptados à ligação
- [ ] Cache inteligente + compressão automática
- Estado: 🟡 SW/PWA já com cache; falta lazy loading de imagens

## 📱 Design Responsivo
- [ ] Smartphone: menus inferiores + gestos (existe: 🟢)
- [ ] Tablet: painéis laterais (🟢 parcial)
- [ ] Desktop: múltiplas colunas (🟢 parcial)
- Estado: 🟢 base feita, refinamento contínuo

## 📊 Validação de Tráfego (módulo de análise)
- [x] Utilização: utilizadores online, sessões ativas, tempo médio, crescimento diário
- [x] Conteúdo: publicações, vídeos, reels, fotos, comentários
- [x] Rede: CPU, memória, armazenamento, latência, largura de banda
- [x] Segurança: acessos indevidos, ataques bloqueados, auditoria
- Estado: ⚪ (base Analytics Engine no worker; falta painel + coleta de sessões)

## ☁️ Connected Cloud
- [ ] Armazenamento escalável para: fotos, vídeos, documentos, mensagens, chamadas, TV, games, faculdade, marketplace
- Estado: ⚪ (Firebase Storage atual; R2 planificado na Fase 1 do plano infra)

## 🤖 DIVINO IA — gestor técnico
- [ ] Monitorizar servidores
- [ ] Sugerir otimizações
- [ ] Identificar falhas
- [ ] Acompanhar desempenho
- [ ] Apoiar administradores
- Estado: 🟢 chat IA existe; gestão técnica ⚪ (depende do painel de monitorização)

## 🚀 Critérios para Produção (checklist de lançamento)
- [ ] Login e autenticação
- [ ] Publicação fotos/vídeos/textos/documentos
- [ ] Feed em tempo real
- [ ] Chat e chamadas
- [ ] Connect TV funcional
- [ ] Amigos e seguidores
- [ ] Carteira e pagamentos
- [ ] Pesquisa
- [ ] Notificações
- [ ] PWA
- [ ] Painel do utilizador
- [ ] Painel administrativo
- [ ] Connected Cloud
- [ ] DIVINO IA

---

## Ordem de implementação sugerida
1. Glassmorphism premium (CSS global)
2. Background Vivo — categorias novas + alta resolução
3. Publicações reais (pré-visualização + compressão + tipos novos)
4. Connect TV — biblioteca por categorias
5. Validação de tráfego (painel Admin)
6. DIVINO IA gestor técnico
7. Checklist final de produção
