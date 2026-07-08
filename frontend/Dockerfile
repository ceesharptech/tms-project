# frontend/Dockerfile

# Stage 1 — Build the React app
FROM node:22.22.1-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL is injected at build time from docker-compose
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2 — Serve with Nginx
FROM nginx:alpine

# Copy the compiled app from stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx config to handle React Router (client-side routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]