import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import expressWs from 'express-ws';
import { Job } from './jobs/job';
import { RecordingAutoDeleteJob } from './jobs/recording_delete.job';
import AppRouter from './router';

class App {
  public app: expressWs.Application;
  public port: number;
  public router: AppRouter = new AppRouter();
  public jobs: Job[] = [];

  constructor(port: number) {
    const _expressWs = expressWs(express());
    this.router.init(_expressWs);
    this.app = _expressWs.app;
    this.port = port;

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeJobs();
  }

  private initializeMiddlewares() {
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Credentials', 'true');

      if (req.method.toUpperCase() === 'OPTIONS') {
        res.header(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        );
        res.header(
          'Access-Control-Allow-Headers',
          'Origin, X-Requested-With, Content-Type, Accept, Authorization'
        );
      }

      res.header('Access-Control-Expose-Headers', '*');

      next();
    });

    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(cookieParser());
  }

  private initializeRoutes() {
    this.app.use('/api/v1', this.router.router);
  }

  private initializeJobs() {
    this.jobs.push(new RecordingAutoDeleteJob());
  }

  public listen() {
    this.app.listen(this.port, () => {
      console.log(`App listening on the port ${this.port}`);
    });
  }
}

export default App;
