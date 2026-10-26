FROM node:24-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS dependencies
WORKDIR /app
RUN apk upgrade --no-cache && apk add --no-cache openssl ca-certificates
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

FROM node:24-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS runner
RUN apk upgrade --no-cache && apk add --no-cache openssl ca-certificates
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
