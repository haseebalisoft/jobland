import express from 'express';
import { body } from 'express-validator';
import {
  signup,
  bdSignup,
  bdLogin,
  adminLogin,
  verifyEmailController,
  login,
  refreshTokenController,
  me,
  setPasswordController,
} from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  loginRateLimiter,
  passwordSetupRateLimiter,
  signupRateLimiter,
} from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

router.post(
  '/bd/signup',
  signupRateLimiter,
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

router.post('/bd/login', loginRateLimiter, bdLogin);

router.post('/admin/login', loginRateLimiter, adminLogin);

router.post(
  '/signup',
  signupRateLimiter,
  [
    body('full_name')
      .optional()
      .isLength({ min: 3 })
      .withMessage('Full name must be at least 3 characters'),
    body('name')
      .optional()
      .isLength({ min: 3 })
      .withMessage('Name must be at least 3 characters'),
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
  signup,
);

// Support both query and path token styles for verification
router.get('/verify-email', verifyEmailController);
router.get('/verify-email/:token', verifyEmailController);

router.post('/login', loginRateLimiter, login);
router.post('/refresh-token', refreshTokenController);
router.post(
  '/set-password',
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

