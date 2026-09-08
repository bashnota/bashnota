# syntax=docker/dockerfile:1.7
FROM node:22.14.0-alpine3.21 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_DEPLOY_BASE=/
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_DEPLOY_BASE=${VITE_DEPLOY_BASE} \
    VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27.4-alpine3.21 AS runtime

COPY --chown=101:101 docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:8080/healthz || exit 1
