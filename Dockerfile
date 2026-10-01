# ---- Frontend build -------------------------------------------------------
# The Vite SPA is compiled here and copied into the runtime image, because the
# backend also serves frontend/dist (see backend/app.js). That is what lets one
# container serve both the API and the UI.
FROM node:24-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Runtime --------------------------------------------------------------
FROM node:24-alpine
WORKDIR /app/backend
ENV NODE_ENV=production
# Fly injects PORT=8080 (the [http_service] internal_port in fly.toml). Pinning
# it here keeps the image self-consistent on platforms that do not inject PORT.
ENV PORT=8080
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist
USER node
# MUST match [http_service] internal_port in fly.toml. If these disagree the
# proxy has no reachable target and returns its own "404 NOT_FOUND" page.
EXPOSE 8080
CMD ["npm", "start"]
