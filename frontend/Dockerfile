# Stage 1: Build the React application
FROM node:24-slim AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
# Set VITE_BASE_URL to empty to use relative paths behind Nginx
ENV VITE_BASE_URL=""
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts to nginx's static files directory
COPY --from=build /app/dist /usr/share/nginx/html

# Port mapping is handled in docker-compose.yml or at runtime
# EXPOSE is intentionally omitted as per user request
CMD ["nginx", "-g", "daemon off;"]
