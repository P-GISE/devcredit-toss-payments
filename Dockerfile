FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS dependencies
WORKDIR /app
RUN apt-get update && apt-get upgrade -y --no-install-recommends && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS tools
ARG REVISION_SHA
LABEL org.opencontainers.image.revision=$REVISION_SHA
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src/lib/prisma.ts ./src/lib/prisma.ts
RUN npx prisma generate
USER node
CMD ["npx", "prisma", "migrate", "status"]

FROM tools AS build
USER root
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS runner
RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/*
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-* /root/.npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/corepack
ARG REVISION_SHA
LABEL org.opencontainers.image.revision=$REVISION_SHA
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
