FROM node:lts-alpine as build

WORKDIR /usr/local/backend
COPY ./ /usr/local/backend

RUN npm install
EXPOSE 3000
ENTRYPOINT [ "node", "app.js" ]
