import { validationResult } from 'express-validator';
import { query } from '../config/db.js';
import {
  startSignup,
  verifyOtp,
  completeSignupWithPassword,
  decodeSignupVerificationToken,
  loginUser,
  loginAdmin as loginAdminService,
  refreshTokens,
  revokeRefreshToken,
  verifyEmail,
  setPasswordFromToken,
  setPasswordForPaidUser,
  setPasswordForUserId,
  registerUser,
  registerBd,
  loginBd,
  requestPasswordReset,
  resetPasswordWithToken,
  resendVerificationEmail,
  loginWithGoogle,
} from '../services/authService.js';
import { getOrCreateUserFromCheckoutSession } from '../services/subscriptionService.js';

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

export async function signup(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const full_name = req.body.full_name || req.body.name || '';
    const { email, password } = req.body;
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }
    const result = await registerUser({ full_name: full_name.trim(), email, password });
    if (result?.verificationResent) {
      return res.status(200).json({ message: 'Account already exists but is unverified. Verification email has been re-sent.' });
    }
    res.status(201).json({ message: 'User created. Check email to verify account.' });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function resendVerificationController(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const result = await resendVerificationEmail({ email });
    if (result.reason === 'already_verified') {
      return res.status(200).json({ message: 'Email is already verified. You can log in.' });
    }
    // Keep response generic to avoid email enumeration.
    return res.status(200).json({ message: 'If your account exists and is not verified, a verification email has been sent.' });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
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

/** After OTP verification: create free-tier account or finish onboarding without Stripe. */
export async function completeOtpSignupController(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { verificationToken, password } = req.body;
    const email = decodeSignupVerificationToken(verificationToken);
    const existingRes = await query(
      `
        SELECT subscription_plan
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email],
    );
    if (existingRes.rowCount > 0) {
      const sp = existingRes.rows[0].subscription_plan;
      if (sp && sp !== 'free') {
        return res.status(400).json({
          message:
            'An account with this email already has a paid plan. Log in to manage your subscription.',
        });
      }
    }

    const { user, accessToken, refreshToken } = await completeSignupWithPassword({
      verificationToken,
      password,
    });

    res
      .cookie(REFRESH_COOKIE_NAME, refreshToken, buildRefreshCookieOptions())
      .status(200)
      .json({
        message: 'Account ready.',
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

/** Set password using checkout session_id (no email needed). Creates user from session if needed. */
export async function setPasswordBySession(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { session_id, password } = req.body;
    const user = await getOrCreateUserFromCheckoutSession(session_id);
    const { user: updated, accessToken, refreshToken } = await setPasswordForUserId(user.id, password);

    res
      .cookie(REFRESH_COOKIE_NAME, refreshToken, buildRefreshCookieOptions())
      .json({
        message: 'Password set successfully.',
        accessToken,
        user: {
          id: updated._id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          emailVerified: updated.emailVerified,
          isActive: updated.isActive,
          subscription_plan: updated.subscription_plan,
        },
      });
  } catch (err) {
    next(err);
  }
}

/** Forgot password: send reset link to email (user role only). Always returns 200. */
export async function forgotPasswordController(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email } = req.body;
    await requestPasswordReset({ email });
    res.status(200).json({ message: 'If an account exists with this email, you will receive a password reset link.' });
  } catch (err) {
    next(err);
  }
}

/** Reset password with token from email link. Returns accessToken + user (same as login). */
export async function resetPasswordController(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { token, password } = req.body;
    const result = await resetPasswordWithToken({ token, password });
    if (!result) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }
    const { user, accessToken, refreshToken } = result;
    res
      .cookie(REFRESH_COOKIE_NAME, refreshToken, buildRefreshCookieOptions())
      .json({
        message: 'Password reset successfully.',
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
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function googleLogin(req, res, next) {
  try {
    const credential = req.body.credential || req.body.id_token;
    const { user, accessToken, refreshToken } = await loginWithGoogle({ idToken: credential });

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
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
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

export async function adminLogin(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await loginAdminService({ email, password });

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

export async function bdSignup(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, email, password } = req.body;
    await registerBd({ full_name, email, password });

    res.status(201).json({
      message: 'BD account created. You can sign in now.',
    });
  } catch (err) {
    next(err);
  }
}

export async function bdLogin(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await loginBd({ email, password });

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
