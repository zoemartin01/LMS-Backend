import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';

const app = express();

app.use((_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api/v1/', require('./v1'));

app.listen(3000, () => {
  console.log('Listening on port 3000');
});

module.exports = app;
