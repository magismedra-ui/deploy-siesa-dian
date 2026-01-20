FROM node:20-alpine AS builder
WORKDIR /app

# Argumento para la URL base del API durante el build
ARG NEXT_PUBLIC_API_BASE_URL=http://api:3000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/next-env.d.ts ./
# Copiar archivos fuente necesarios para las rutas API de Next.js App Router
COPY --from=builder /app/src ./src
COPY --from=builder /app/lib ./lib
EXPOSE 3000
CMD ["npm", "start"]
