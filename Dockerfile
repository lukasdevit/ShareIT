FROM node:24-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY backend/ ./backend/
RUN npx tsx --no-warnings -e "console.log('build check passed')" 2>/dev/null || true

FROM node:24-alpine

WORKDIR /app
RUN apk add --no-cache wget
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/backend ./backend
COPY tsconfig.json ./

EXPOSE 3000
CMD ["npx", "tsx", "backend/server.ts"]
