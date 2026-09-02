# ---- Stage 1: build ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: runtime (SSR Node server) ----
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4200

COPY --from=build /app/dist/optiplant-inventarios-frontend ./dist/optiplant-inventarios-frontend

EXPOSE 4200

CMD ["node", "dist/optiplant-inventarios-frontend/server/server.mjs"]
