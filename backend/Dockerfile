FROM node:22.22.1-bookworm-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Railway provides PORT env variable
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
