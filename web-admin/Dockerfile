FROM node:20-alpine
WORKDIR /app

# Install dependencies first for caching
COPY package.json ./
RUN npm install

# Copy the rest and build
COPY . .
RUN npm run build

# Next.js defaults to 3000
EXPOSE 3000
ENV PORT 3000

CMD ["npm", "start"]
