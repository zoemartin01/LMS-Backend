import App from './app';
import {createConnection} from "typeorm";

// Controllers
import { UserController } from './routes/UserController';

const connection = async () => {
    await createConnection();
};

connection();

const app = new App(
    [
        new UserController(),
    ],
    3000,
);

app.listen();