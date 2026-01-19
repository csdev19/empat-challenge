# Railway Deployment Guide

This guide explains how to deploy the Elysia server to Railway.

## Prerequisites

- Railway account
- Railway CLI (optional, for local testing)
- Environment variables configured

## Environment Variables

Make sure to set the following environment variables in Railway:

- `CORS_ORIGIN` - Your frontend URL (e.g., `https://your-app.vercel.app`)
- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_URL_DIRECT` - Direct PostgreSQL connection string (optional, falls back to `DATABASE_URL`)
- `BETTER_AUTH_SECRET` - Secret key for better-auth (generate a random string)
- `BETTER_AUTH_URL` - Your auth URL (e.g., `https://your-api.railway.app`)
- `PORT` - Automatically set by Railway (don't set manually)

## Deployment Methods

### Method 1: Using Railway Dashboard (Recommended)

1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo" (or "Empty Project" and connect later)
4. Select your repository
5. Railway will detect the Dockerfile in `apps/server/`
6. Configure environment variables in the project settings
7. Deploy!

### Method 2: Using Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Link to existing project (optional)
railway link

# Set environment variables
railway variables set CORS_ORIGIN=https://your-app.vercel.app
railway variables set DATABASE_URL=postgresql://...
railway variables set BETTER_AUTH_SECRET=your-secret-key
railway variables set BETTER_AUTH_URL=https://your-api.railway.app

# Deploy
railway up
```

## Dockerfile Location

The Dockerfile is located at `apps/server/Dockerfile`. Railway will automatically detect it when you deploy from the `apps/server/` directory.

If deploying from the monorepo root, you may need to configure the build context in Railway settings:

- **Build Context**: `apps/server`
- **Dockerfile Path**: `apps/server/Dockerfile`

## Build Process

The Dockerfile:

1. Uses `oven/bun:1` as the build image
2. Installs all dependencies (including workspace packages)
3. Compiles the server to a binary using Bun
4. Uses a distroless base image for the final runtime (smaller size)
5. Exposes port 3000 (Railway will set the `PORT` env var automatically)

## Port Configuration

Railway automatically assigns a port and sets it in the `PORT` environment variable. The server is configured to use this port:

```typescript
const port = Number(process.env.PORT) || 3000;
```

Elysia automatically binds to `0.0.0.0`, which works with Railway's networking.

## Health Check

The server includes a health check endpoint:

```
GET /api/v1/health
```

Railway can use this for health checks. Configure it in Railway settings:

- **Health Check Path**: `/api/v1/health`

## Troubleshooting

### Build Fails

- Check that all workspace packages are properly copied
- Verify `bun.lock` is up to date
- Check Railway build logs for specific errors

### Server Won't Start

- Verify all environment variables are set
- Check Railway logs: `railway logs`
- Ensure `DATABASE_URL` is correct and accessible

### Port Issues

- Railway automatically sets `PORT` - don't override it
- The server listens on `0.0.0.0` by default (correct for Railway)

### Database Connection Issues

- Verify `DATABASE_URL` is accessible from Railway's network
- Check if your database allows connections from Railway's IP ranges
- For Railway PostgreSQL, the connection string should work automatically

## Local Testing

Test the Railway build locally:

```bash
cd apps/server

# Build the Docker image
docker build -t elysia-server .

# Run the container
docker run -p 3000:3000 \
  -e CORS_ORIGIN=http://localhost:5173 \
  -e DATABASE_URL=your-db-url \
  -e BETTER_AUTH_SECRET=your-secret \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  elysia-server
```

## Monorepo Considerations

This setup works with the monorepo structure:

- All workspace packages are copied and installed
- Dependencies are resolved correctly
- The binary includes all necessary code

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Elysia Deployment Guide](https://elysiajs.com/patterns/deploy.html#railway)
- [Bun Build Documentation](https://bun.sh/docs/cli/bun#bun-build)
