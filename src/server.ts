import App from './app';
import {createConnection} from "typeorm";

// Controllers
import { UserController } from './routes/user.controller';
import { AuthController } from './routes/auth.controller';

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