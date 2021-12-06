import App from './app';
import {createConnection} from "typeorm";

// Controllers
import { UserController } from './routes/UserController';
import { AuthController } from './routes/AuthController';

const connection = async () => {
    await createConnection();
};

connection();

const app = new App(
    [
        new UserController(),
        new AuthController(),
    ],
    3000,
);

app.listen();