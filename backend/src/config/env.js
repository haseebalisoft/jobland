import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,

  // ✅ PostgreSQL configuration (REPLACED MongoDB)
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "hiredlogics_prod",
  },

  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "change_me_access",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "change_me_refresh",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  },

  emailVerification: {
    secret:
      process.env.EMAIL_VERIFICATION_SECRET ||
      process.env.JWT_ACCESS_SECRET ||
      "change_me_email_verification",
    expiresIn: process.env.EMAIL_VERIFICATION_EXPIRES || "1d",
  },

  /**
   * Used for OTP-based signup flow.
   * verificationToken returned by /auth/verify-otp is signed with this secret.
   */
  signupVerification: {
    secret:
      process.env.SIGNUP_VERIFICATION_SECRET ||
      process.env.JWT_ACCESS_SECRET ||
      "change_me_signup_verification",
    expiresIn: process.env.SIGNUP_VERIFICATION_EXPIRES || "1h",
  },

  passwordSetup: {
    secret:
      process.env.PASSWORD_SETUP_SECRET ||
      process.env.JWT_ACCESS_SECRET ||
      "change_me_password_setup",
    expiresIn: process.env.PASSWORD_SETUP_EXPIRES || "1d",
  },

  passwordReset: {
    secret:
      process.env.PASSWORD_RESET_SECRET ||
      process.env.JWT_ACCESS_SECRET ||
      "change_me_password_reset",
    expiresIn: process.env.PASSWORD_RESET_EXPIRES || "1h",
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    mockMode: process.env.STRIPE_MOCK_MODE === "true",
  },

  email: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || process.env.EMAIL_USER || "",
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || "",
    from:
      process.env.FROM_EMAIL ||
      process.env.EMAIL_USER ||
      "no-reply@example.com",
  },

  adminEmail: process.env.ADMIN_EMAIL || "admin@hiredlogics.com",
};