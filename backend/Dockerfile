# syntax=docker/dockerfile:1
FROM node:20.19-alpine

WORKDIR /app

RUN apk update && apk add --no-cache postgresql-client bash git python3 make g++ cmake ffmpeg

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN chmod +x start-backend.sh

CMD ["sh", "./start-backend.sh"]
