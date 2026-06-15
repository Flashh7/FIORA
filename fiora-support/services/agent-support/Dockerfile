FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY packages/ ./packages/
COPY services/agent-support/ ./services/agent-support/

RUN npm install
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npx turbo run build --filter=@fiora/agent-support

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/agent-support/dist ./services/agent-support/dist
COPY --from=builder /app/services/agent-support/package.json ./services/agent-support/package.json

CMD ["npm", "--prefix", "services/agent-support", "start"]
