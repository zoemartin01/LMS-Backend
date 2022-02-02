/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const typeorm_seeding_1 = require("typeorm-seeding");
const uuid_1 = require("uuid");
const create_global_settings_seed_1 = __importDefault(
  require("./src/database/seeds/create-global_settings.seed")
);
const initDB = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield (0, typeorm_1.createConnection)();
    console.log("Database connected");
    yield (0, typeorm_seeding_1.useSeeding)();
    const password = (0, uuid_1.v4)().replace(/-/g, "");
    yield connection
      .createQueryBuilder()
      .insert()
      .into("users")
      .values({
        username: "admin",
        password: password,
      })
      .execute();
    console.log("Admin user created with password: \n", password);
    yield (0,
    typeorm_seeding_1.runSeeder)(create_global_settings_seed_1.default);
    console.log("Done initializing database");
  });
initDB();
