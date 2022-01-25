FROM node:lts-alpine as build

COPY ./ /usr/local/backend
WORKDIR /usr/local/backend

RUN npm ci
EXPOSE 3000
ENTRYPOINT [ "npx", "ts-node", "src/server.ts" ]
