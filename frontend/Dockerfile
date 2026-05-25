FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build Next.js for production
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
