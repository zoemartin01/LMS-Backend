import express from 'express';
import jsonwebtoken from 'jsonwebtoken';

const router = express.Router();
const accessTokenSecret = 'V50jPXQVocPUSPHl0yzPJhXZzh32bp';
const refreshTokenSecret = '3pqOHs7R1TrCgsRKksPp4J3Kfs0l0X';
var refreshTokens: any = [];

router.post('/token', (req, res) => {
  const { email, password } = req.body;

  // TODO: replace with db call
  const users = [
    {
      id: 1,
      email: 'admin',
      password: 'admin',
      role: 'admin',
    },
    {
      id: 2,
      email: 'visitor',
      password: 'visitor',
      role: 'visitor',
    },
  ];

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).send({
      message: 'Invalid email or password',
    });
  } else {
    const accessToken = jsonwebtoken.sign(
      {
        userId: user.id
      },
      accessTokenSecret,
      {
        expiresIn: '20m',
      }
    );

    const refreshToken = jsonwebtoken.sign(
      {
        userId: user.id
      },
      refreshTokenSecret,
    );

    refreshTokens.push(refreshToken);

    res.json({ accessToken, refreshToken, role: user.role });
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

  jsonwebtoken.verify(token, refreshTokenSecret, (err: any, user: any) => {
    if (err) {
      return res.sendStatus(403);
    }

    const accessToken = jsonwebtoken.sign({ email: user.email, role: user.role }, accessTokenSecret, { expiresIn: '20m' });

    res.json({accessToken});
  });
});

router.delete('token', (req, res) => {
  const { token } = req.body;
  refreshTokens = refreshTokens.filter((t: any) => t !== token);

  res.send('Logout successful');
});

const authenticateJWT = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jsonwebtoken.verify(token, accessTokenSecret, (err: any, user: any) => {
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

router.get('/token/check', authenticateJWT, (_, res) => {
  res.json({
    "authenticated": true,
  });
});

module.exports = router;