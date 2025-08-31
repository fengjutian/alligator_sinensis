FROM oven/bun:alpine
WORKDIR /app
COPY . /app
RUN bun install --production
EXPOSE 3000
CMD ["bun","run","server.ts"]
