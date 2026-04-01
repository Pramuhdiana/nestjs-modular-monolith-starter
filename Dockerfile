# =============================================================================
# Multi-stage — image runtime berisi node_modules production + dist + Prisma client
# =============================================================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate && npm run build

# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

# Semua dependency runtime Nest/BullMQ/dll + Prisma CLI untuk migrate deploy
RUN npm ci --omit=dev && npm install prisma@6 --no-save

COPY --from=builder /app/dist ./dist

# Client hasil generate (harus match dengan schema yang di-copy)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
