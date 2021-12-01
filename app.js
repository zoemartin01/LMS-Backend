let express = require('express');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');

let app = express();

//enable CORS for all origins
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser())

app.use('/api/v1/', require('./routes/v1'));

app.listen(3000, () => {
    console.log('Listening on port 3000');
});

module.exports = app;
