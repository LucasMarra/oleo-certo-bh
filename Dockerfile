FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY lib ./lib
COPY data ./data
COPY public ./public
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["npm", "start"]
