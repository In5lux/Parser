FROM node:18-alpine
WORKDIR /opt/app
ADD *.json ./
RUN npm install --only=prod
ADD . .
CMD ["node", "./src/index.js"]