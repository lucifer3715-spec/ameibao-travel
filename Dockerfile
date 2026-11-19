FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY server ./server
COPY public ./public
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8799
ENV DATA_DIR=/app/travel-data
VOLUME ["/app/travel-data"]
EXPOSE 8799
CMD ["node", "server.mjs"]
