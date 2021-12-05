import App from './app';

// Controllers
import { UserController } from './routes/UserController';


const app = new App(
    [
        new UserController(),
    ],
    3000,
);

app.listen();