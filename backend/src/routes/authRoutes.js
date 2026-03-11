import express from 'express';
import { body } from 'express-validator';
import {
  startSignupController,
  startEmailVerificationController,
  verifyOtpController,
  setPassword,
  login,
  refreshToken,
  logout,
  me,
  verifyEmailController,
  setPasswordController,
  bdSignup,
  bdLogin,
} from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  loginRateLimiter,
  passwordSetupRateLimiter,
  signupRateLimiter,
} from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// Legacy OTP-based signup flow (pre-payment password) – kept for backwards compatibility
router.post(
  '/start-signup',
  signupRateLimiter,
  [body('email').isEmail().withMessage('Valid email is required')],
  startSignupController,
);

// New user onboarding: email verification before Stripe
router.post(
  '/start-email-verification',
  signupRateLimiter,
  [body('email').isEmail().withMessage('Valid email is required')],
  startEmailVerificationController,
);

router.post(
  '/verify-otp',
  signupRateLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 4, max: 10 }).withMessage('OTP is required'),
  ],
  verifyOtpController,
);

// Post-payment password setup for USERS
router.post(
  '/set-password',
  passwordSetupRateLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/[A-Z]/)
      .matches(/[a-z]/)
      .matches(/[0-9]/)
      .matches(/[^A-Za-z0-9]/)
      .withMessage(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      ),
    body('confirm_password')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
  ],
  setPassword,
);

// Unified USER login – admin/BD use separate flows
router.post(
  '/login',
  loginRateLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  login,
);

// BD signup
router.post(
  '/bd/signup',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('confirm_password')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
  ],
  bdSignup,
);

// BD login
router.post(
  '/bd/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  bdLogin,
);

router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Support both query and path token styles for legacy email verification links
router.get('/verify-email', verifyEmailController);
router.get('/verify-email/:token', verifyEmailController);

// Legacy password-setup endpoint for Stripe-provisioned accounts
router.post(
  '/set-password-legacy',
  passwordSetupRateLimiter,
  [
    body('token').isString().notEmpty().withMessage('Token is required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/[A-Z]/)
      .matches(/[a-z]/)
      .matches(/[0-9]/)
      .matches(/[^A-Za-z0-9]/)
      .withMessage(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      ),
    body('confirm_password')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
  ],
  setPasswordController,
);

router.get('/me', authMiddleware, me);

export default router;

