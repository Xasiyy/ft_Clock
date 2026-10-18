FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
ENV NODE_ENV=production
ENV PORT=2441
EXPOSE 2441
CMD ["node", "index.js"]