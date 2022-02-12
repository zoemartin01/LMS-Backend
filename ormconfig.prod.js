module.exports = {
  name: "default",
  type: "postgres",
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "postgres",
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT || 5432,
  synchronize: "true",
  entities: ["models/!(*.spec).js"],
  seeds: ["database/seeds/**/*.js}"],
  factories: ["database/factories/**/*.js"],
};
