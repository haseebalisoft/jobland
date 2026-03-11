import { validationResult } from 'express-validator';
import {
  startSignup,
  verifyOtp,
  completeSignupWithPassword,
  loginUser,
  refreshTokens,
  revokeRefreshToken,
  verifyEmail,
  setPasswordFromToken,
  setPasswordForPaidUser,
} from '../services/authService.js';

const REFRESH_COOKIE_NAME = 'refreshToken';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function buildRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: ONE_WEEK_MS,
  };
}

export async function startSignupController(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    await startSignup({ email });
    res.status(200).json({ message: 'OTP sent to email if it exists' });
  } catch (err) {
    next(err);
  }
}

export async function startEmailVerificationController(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    await startSignup({ email });
    res.status(200).json({ message: 'OTP sent' });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtpController(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;
    const { verificationToken } = await verifyOtp({ email, otp });
    res.status(200).json({ verificationToken });
  } catch (err) {
    next(err);
  }
}

export async function setPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await setPasswordForPaidUser({
      email,
      password,
    });

    res
      .cookie(REFRESH_COOKIE_NAME, refreshToken, buildRefreshCookieOptions())
      .json({
        message: 'Password set successfully.',
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          isActive: user.isActive,
          subscription_plan: user.subscription_plan,
        },
      });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await loginUser({ email, password });

    res
      .cookie(REFRESH_COOKIE_NAME, refreshToken, buildRefreshCookieOptions())
      .json({
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          isActive: user.isActive,
          subscription_plan: user.subscription_plan,
        },
      });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    const { accessToken, refreshToken: newRefreshToken } = await refreshTokens(token);

    res
      .cookie(REFRESH_COOKIE_NAME, newRefreshToken, buildRefreshCookieOptions())
      .json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      await revokeRefreshToken(token);
    }
    res
      .clearCookie(REFRESH_COOKIE_NAME, buildRefreshCookieOptions())
      .status(204)
      .send();
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  const u = req.user;
  res.json({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    emailVerified: u.emailVerified,
    isActive: u.isActive,
    subscription_plan: u.subscription_plan,
  });
}

// Legacy email verification + password setup endpoints are kept for backwards compatibility
export async function verifyEmailController(req, res, next) {
  try {
    const token = req.params.token || req.query.token;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const user = await verifyEmail(token);
    res.json({ message: 'Email verified successfully.', emailVerified: true, userId: user.id });
  } catch (err) {
    next(err);
  }
}

export async function setPasswordController(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;
    const { user, accessToken, refreshToken } = await setPasswordFromToken({
      token,
      password,
    });

    res
      .cookie(REFRESH_COOKIE_NAME, refreshToken, buildRefreshCookieOptions())
      .json({
        message: 'Password set successfully.',
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          isActive: user.isActive,
          subscription_plan: user.subscription_plan,
        },
      });
  } catch (err) {
    next(err);
  }
}
