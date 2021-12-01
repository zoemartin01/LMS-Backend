let express = require('express');
let router = express.Router();
const jwt = require("jsonwebtoken");

const accessTokenSecret = 'V50jPXQVocPUSPHl0yzPJhXZzh32bp';
const refreshTokenSecret = '3pqOHs7R1TrCgsRKksPp4J3Kfs0l0X';
let refreshTokens = [];

router.post('/token', (req, res) => {
  const { email, password } = req.body;

  //@todo needs to be replaced with db call
  const users = [
    {
      id: 1,
      email: 'admin',
      password: 'admin',
      role: 'admin'
    },
    {
      id: 11,
      email: 'visitor',
      password: 'visitor',
      role: 'visitor'
    }
  ];
  const user = users.find(u => { return u.email === email && u.password === password });

  if (user) {
    // generate an access token
    const accessToken = jwt.sign({ id: user.id }, accessTokenSecret, { expiresIn: '20m' });
    const refreshToken = jwt.sign({ id: user.id }, refreshTokenSecret);

    refreshTokens.push(refreshToken);

    res.json({accessToken, refreshToken, role: user.role});
  } else {
    res.sendStatus(401);
  }
});

router.post('/token/refresh', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.sendStatus(401);
  }

  if (!refreshTokens.includes(token)) {
    return res.sendStatus(403);
  }

  jwt.verify(token, refreshTokenSecret, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }

    const accessToken = jwt.sign({ email: user.email, role: user.role }, accessTokenSecret, { expiresIn: '20m' });

    res.json({accessToken});
  });
});

router.delete('/token', (req, res) => {
  const { token } = req.body;
  refreshTokens = refreshTokens.filter(t => t !== token);

  res.send("Logout successful");
});

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, accessTokenSecret, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

router.get('/token/check', authenticateJWT, (req, res) => {
  res.json({
    "authenticated": "true",
  });
});

module.exports = router;
