## Clean multi-stage Dockerfile for backend service

FROM node:20-alpine AS deps
WORKDIR /app
# Copy only backend manifests to leverage Docker cache
COPY backend/package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
ENV NODE_ENV=development
COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma
COPY backend/src ./src
COPY backend/scripts ./scripts
# Generate Prisma client and build TypeScript
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --omit=dev
# Copy build artifacts and prisma schema
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S backend -u 1001 \
    && mkdir -p uploads \
    && chown -R backend:nodejs /app
USER backend

EXPOSE 4000
ENV PORT=4000
CMD ["node", "dist/index.js"]