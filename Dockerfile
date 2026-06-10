FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# FIX v1.2.5-prod: NEXT_PUBLIC_* se inyecta en build-time en el bundle del cliente.
# Sin esto el browser intenta hablar a http://localhost:6601 (default del wrapper)
# y el banner global muestra "Sin conexión con el servicio AMS".
# Default sigue siendo localhost para dev local; producción pasa --build-arg.
ARG NEXT_PUBLIC_AGENT_API_URL=http://localhost:6601
ENV NEXT_PUBLIC_AGENT_API_URL=${NEXT_PUBLIC_AGENT_API_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
