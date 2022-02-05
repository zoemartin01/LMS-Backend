var settings = {
  name: "default",
  type: "postgres",
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "postgres",
  synchronize: "true",
  entities: ["src/models/!(*.spec).ts"],
};

if (process.env.NODE_ENV === "testing") {
  module.exports = {
    ...settings,
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 5433,
  };
} else {
  module.exports = {
    ...settings,
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 5432,
  };
}
