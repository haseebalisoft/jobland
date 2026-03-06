import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

function getUserId(user) {
  return (user.id || user._id || '').toString();
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: getUserId(user), role: user.role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn },
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: getUserId(user), role: user.role },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

