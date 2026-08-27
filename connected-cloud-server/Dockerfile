# Connected Cloud Gateway — imagem mínima de produção.
# Node puro (sem dependências externas); dados em /data (volume).
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev || true

COPY . .

ENV PORT=8787
ENV NODE_ENV=production
EXPOSE 8787

# CCS_API_KEY / CCS_SIGN_KEY / CCS_ALLOWED_ORIGINS devem vir do ambiente
# (secrets do host / GitHub Actions) — NUNCA do código ou .env commitado.
CMD ["node", "server.js"]
