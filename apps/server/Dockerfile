FROM oven/bun:1.3.4 AS build

WORKDIR /app

# Copy root package files for monorepo
COPY package.json package.json
COPY bun.lock bun.lock

# Copy workspace package files (copy each package individually for better caching)
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/domain/package.json ./packages/domain/package.json
COPY packages/web-ui/package.json ./packages/web-ui/package.json

COPY apps/server/package.json ./apps/server/package.json

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY packages ./packages
COPY apps/server ./apps/server

# Set working directory to server
WORKDIR /app/apps/server

# Build the server
ENV NODE_ENV=production

RUN bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--target bun-linux-x64 \
	--outfile server \
	src/index.ts

# Use distroless base image for smaller size
FROM gcr.io/distroless/base

WORKDIR /app

# Copy the compiled binary
COPY --from=build /app/apps/server/server server

ENV NODE_ENV=production

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Run the server
CMD ["./server"]
