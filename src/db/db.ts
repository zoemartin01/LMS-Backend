import isDocker from "is-docker";
import {createConnection, Connection} from "typeorm";

const connection: Connection = await (isDocker() ? createConnection("docker") : createConnection("dev"));

module.exports = connection;