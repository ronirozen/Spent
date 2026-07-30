# Use a Node.js LTS slim image based on Debian Bookworm
FROM node:22-bookworm-slim

# Install dependencies: Chromium, fonts, and build tools (for better-sqlite3 compilation if prebuilts are missing)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    python3 build-essential \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV SPENT_DISABLE_CHROMIUM_SANDBOX=1

# Set timezone
ENV TZ=Asia/Jerusalem

WORKDIR /app

# Copy dependency definition files
COPY package.json package-lock.json ./
COPY patches ./patches

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the application port
EXPOSE 41234

# Start the application, binding to 0.0.0.0 for LAN access
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "41234"]
