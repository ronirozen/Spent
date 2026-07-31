# Use a Node.js LTS slim image based on Debian Bookworm
FROM node:22-bookworm-slim

# Install dependencies: Chromium, fonts, build tools, and xvfb for headful browser support
RUN apt-get update && apt-get install -y \
    chromium xvfb xauth \
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
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches

# Install dependencies
RUN corepack enable pnpm && pnpm install --network-concurrency 1 --child-concurrency 1 --dangerously-allow-all-builds

# Copy the rest of the application
COPY . .

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN pnpm run build

# Expose the application port
EXPOSE 41234

# Make the startup script executable
RUN chmod +x /app/docker-start.sh

# Start the application using the wrapper script
CMD ["/app/docker-start.sh"]
