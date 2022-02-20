import { Request, NextFunction, Response } from 'express';

export const ForbiddenInputMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const forbidden = ['id', 'createdAt', 'updatedAt', 'deletedAt'];

  if (Object.keys(req.body).some((key) => forbidden.includes(key))) {
    res.status(400).json({
      message:
        'Forbidden input: ' +
        Object.keys(req.body)
          .filter((key) => forbidden.includes(key))
          .join(', '),
    });
  } else {
    next();
  }
};
