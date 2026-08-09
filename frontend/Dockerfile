# Stage 1: Build the React application
FROM node:24-slim AS build

RUN npm install -g pnpm@11.17.0

WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY . .
# Set VITE_BASE_URL to empty to use relative paths behind Nginx
ENV VITE_BASE_URL=""
RUN pnpm build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts to nginx's static files directory
COPY --from=build /app/dist /usr/share/nginx/html

# Port mapping is handled in docker-compose.yml or at runtime
# EXPOSE is intentionally omitted
CMD ["nginx", "-g", "daemon off;"]
