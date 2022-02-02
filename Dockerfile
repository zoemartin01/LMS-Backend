FROM node:lts-alpine as build

RUN mkdir -p /app
WORKDIR /app
COPY package*.json /app/

RUN npm install -g typescript
RUN npm ci

COPY . /app

RUN tsc

FROM node:lts-alpine

RUN mkdir -p /app
WORKDIR /app

COPY package*.json /app/
RUN npm ci --only=production

COPY ormconfig.js /app/
COPY --from=build /app/dist /app

EXPOSE 3000
ENTRYPOINT [ "node", "server.js" ]
