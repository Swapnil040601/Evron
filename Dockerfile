FROM node:18 AS builder
WORKDIR /app
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm ci && npm install @tailwindcss/oxide-linux-x64-gnu
COPY . .
RUN npm run build

FROM node:18-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 5193
ENV NODE_ENV=production
ENV PORT=5193
CMD ["node", "dist/server.cjs"]
