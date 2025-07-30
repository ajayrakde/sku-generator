FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY . ./

RUN npm install --production

EXPOSE 5000

CMD ["node", "index.js"]