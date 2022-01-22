var settings = {
  name: "default",
  type: "postgres",
  username: "postgres",
  password: "postgres",
  database: "postgres",
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
