import express from 'express';
import { body } from 'express-validator';
import {
  signup,
  startSignupController,
  startEmailVerificationController,
  verifyOtpController,
  completeOtpSignupController,
  setPassword,
  setPasswordBySession,
  login,
  adminLogin,
  refreshToken,
  logout,
  me,
  verifyEmailController,
  setPasswordController,
  bdSignup,
  bdLogin,
  forgotPasswordController,
  resetPasswordController,
  resendVerificationController,
} from '../controllers/authController.js';
import {
  getLinkedInStatus,
  getLinkedInOAuthUrl,
  linkedInCallback,
  deleteLinkedIn,
  postLinkedInSync,
} from '../controllers/linkedinAuthController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  loginRateLimiter,
  passwordSetupRateLimiter,
  signupRateLimiter,
} from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// Classic signup (email + password, sends verification email) – documented in Swagger as POST /auth/signup
router.post(
  '/signup',
  signupRateLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/[A-Z]/).withMessage('Password must contain uppercase')
      .matches(/[a-z]/).withMessage('Password must contain lowercase')
      .matches(/[0-9]/).withMessage('Password must contain number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain special character'),
    body('confirm_password').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  ],
  signup,
);

router.post(
  '/resend-verification',
  signupRateLimiter,
  [body('email').isEmail().withMessage('Valid email is required')],
  resendVerificationController,
);

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

router.post(
  '/complete-otp-signup',
  signupRateLimiter,
  [
    body('verificationToken').isString().notEmpty().withMessage('verificationToken is required'),
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
  completeOtpSignupController,
);

// Post-payment password setup for USERS (by email – use when no session_id in URL)
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

// Post-payment password setup by checkout session_id (preferred when user has session_id in URL)
router.post(
  '/set-password-by-session',
  passwordSetupRateLimiter,
  [
    body('session_id').isString().notEmpty().withMessage('Session ID is required'),
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
  setPasswordBySession,
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

// Admin login
router.post(
  '/admin/login',
  loginRateLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  adminLogin,
);

// BD signup
router.post(
  '/bd/signup',
  [
    body('full_name')
      .trim()
      .notEmpty()
      .withMessage('Full name is required')
      .isLength({ min: 2 })
      .withMessage('Full name must be at least 2 characters'),
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

router.post(
  '/forgot-password',
  passwordSetupRateLimiter,
  [body('email').isEmail().withMessage('Valid email is required')],
  forgotPasswordController,
);

router.post(
  '/reset-password',
  passwordSetupRateLimiter,
  [
    body('token').isString().notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirm_password').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  ],
  resetPasswordController,
);

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

router.get('/linkedin/status', authMiddleware, getLinkedInStatus);
router.get('/linkedin/oauth-url', authMiddleware, getLinkedInOAuthUrl);
router.delete('/linkedin', authMiddleware, deleteLinkedIn);
router.post('/linkedin/sync', authMiddleware, postLinkedInSync);
router.get('/linkedin/callback', linkedInCallback);

export default router;

