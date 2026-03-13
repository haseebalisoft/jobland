import rateLimit from 'express-rate-limit';

function buildAuthLimiter(message, limit) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      message,
    },
  });
}

export const signupRateLimiter = buildAuthLimiter(
  'Too many signup attempts. Please try again later.',
  10,
);

export const loginRateLimiter = buildAuthLimiter(
  'Too many login attempts. Please try again later.',
  Number(process.env.LOGIN_RATE_LIMIT || 10),
);

export const passwordSetupRateLimiter = buildAuthLimiter(
  'Too many password setup attempts. Please try again later.',
  10,
);
