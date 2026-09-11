FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1
FROM base AS build
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
