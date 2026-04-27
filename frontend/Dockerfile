# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
