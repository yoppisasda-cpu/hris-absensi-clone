# 1. Base image (v1.0.6-FORCE-CACHE-BREAK)
FROM node:18-alpine

# Install openssl for Prisma (diperlukan di Alpine)
RUN apk add --no-cache openssl

# 2. Workdir
WORKDIR /app

# 3. Install dependencies
COPY package*.json ./
# Hapus node_modules jika terbawa dari Windows agar tidak corrupt
RUN rm -rf node_modules
RUN npm install

# 4. Copy source code
COPY . .

# Diagnostik: Lihat lokasi file sebenarnya di dalam container
RUN pwd && ls -la && ls -R prisma/

# 5. Build prisma client & TypeScript
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build

# 6. Expose port
EXPOSE 3000

# 7. Start app
CMD ["npm", "start"]
