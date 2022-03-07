# Development

Install the development dependencies with:

```
$ npm ci
$ npm run prepare
```

Run the servers with:

```
$ docker compose start db
$ npm run dev
```

To reset the database and seed it with test data:

```
$ npm run reseed
```

To run the demo:

```
$ npm run schema:drop
$ npx ts-mocha src/demo_seeds.ts
$ npm run dev
```
