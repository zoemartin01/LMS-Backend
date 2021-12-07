import App from './app';
import {createConnection} from "typeorm";

// Database connection initialization
const connection = async () => {
    await createConnection();
};

connection();

// Server initialization

const app = new App(
    3000,
);

app.listen();