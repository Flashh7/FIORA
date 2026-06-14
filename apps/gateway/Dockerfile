FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack for yarn/pnpm if needed, or just use npm
COPY package.json package-lock.json turbo.json ./
COPY packages/ ./packages/
COPY apps/gateway/ ./apps/gateway/

RUN npm install
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npx turbo run build --filter=gateway

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/gateway/dist ./apps/gateway/dist
COPY --from=builder /app/apps/gateway/package.json ./apps/gateway/package.json

EXPOSE 3001
CMD ["npm", "--prefix", "apps/gateway", "start"]
