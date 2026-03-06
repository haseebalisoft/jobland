import { validationResult } from 'express-validator';
import {
  registerUser,
  registerBd,
  loginBd,
  loginAdmin,
  verifyEmail,
  loginUser,
  refreshTokens,
  setPasswordFromToken,
} from '../services/authService.js';
import { signAccessToken } from '../utils/jwt.js';

export async function signup(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, name, email, password } = req.body;
    const resolvedName = full_name || name;

    await registerUser({ full_name: resolvedName, email, password });
    res.status(201).json({ message: 'User created. Check email to verify account.' });
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

    const { email, password } = req.body;
    await registerBd({ email, password });
    res.status(201).json({ message: 'BD account created. You can sign in now.' });
  } catch (err) {
    next(err);
  }
}

export async function bdLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    const bd = await loginBd({ email, password });
    const accessToken = signAccessToken(bd);
    res.json({
      accessToken,
      user: {
        id: bd.id,
        name: bd.name,
        email: bd.email,
        role: 'bd',
        isActive: bd.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await loginAdmin({ email, password });

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: 'admin',
          emailVerified: user.emailVerified,
          isActive: user.isActive,
          subscription_plan: user.subscription_plan,
        },
      });
  } catch (err) {
    next(err);
  }
}

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

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await loginUser({ email, password });

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
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

export async function refreshTokenController(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    const { accessToken, refreshToken } = await refreshTokens(token);

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ accessToken });
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
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
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

