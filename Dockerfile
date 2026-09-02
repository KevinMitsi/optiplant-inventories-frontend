# ---- Stage 1: build ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Secreto inyectado en build time (docker build --build-arg COUNTRIES_API_KEY=...).
# Nunca hardcodear el valor real en el repo ni en este Dockerfile.
ARG COUNTRIES_API_KEY
RUN test -n "$COUNTRIES_API_KEY" || (echo "ERROR: falta --build-arg COUNTRIES_API_KEY" && exit 1)
RUN sed -i "s|__COUNTRIES_API_KEY__|$COUNTRIES_API_KEY|g" src/environments/environment.ts

RUN npm run build

# ---- Stage 2: runtime (SSR Node server) ----
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4200

COPY --from=build /app/dist/optiplant-inventarios-frontend ./dist/optiplant-inventarios-frontend

EXPOSE 4200

CMD ["node", "dist/optiplant-inventarios-frontend/server/server.mjs"]
