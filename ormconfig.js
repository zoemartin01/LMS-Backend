if (process.env.NODE_ENV === "docker") {
  module.exports = {
    name: "default",
    type: "postgres",
    host: "db",
    port: 5432,
    username: "postgres",
    password: "postgres",
    database: "postgres",
    entities: ["src/models/*.ts"],
  };
} else {
  module.exports = {
    name: "default",
    type: "postgres",
    host: "127.0.0.1",
    port: 5432,
    username: "postgres",
    password: "postgres",
    database: "postgres",
    synchronize: true,
    entities: ["src/models/*.ts"],
  };
}
