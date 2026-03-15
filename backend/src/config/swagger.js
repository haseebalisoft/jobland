import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'HiredLogics API',
    version: '1.0.0',
    description:
      'REST API aligned with hiredlogics_prod schema (001_initial.sql): users, profiles, jobs, user_bd_assignments, job_assignments, applications, subscription_plans, subscriptions, refresh_tokens.',
  },
  servers: [
    {
      url: `${config.clientUrl.replace(/\/$/, '')}/api`.replace('5173', '5000'),
      description: 'API server (DB: hiredlogics_prod)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      oneclickApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: 'Bearer &lt;oneclick_api_key&gt; — get from GET /bd/oneclick-token when logged in as BD',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Creates a user with is_verified=false, subscription_plan=free, is_active=false. Sends verification email. Does not log the user in.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'confirm_password'],
                properties: {
                  full_name: { type: 'string', example: 'John Doe', description: 'Full name (use with name or alone)' },
                  name: { type: 'string', example: 'John Doe', description: 'Alias for full_name' },
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  password: {
                    type: 'string',
                    minLength: 8,
                    description: 'Min 8 chars, must include uppercase, lowercase, number, and special character',
                  },
                  confirm_password: { type: 'string', description: 'Must match password' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User created, verification email sent',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string', example: 'User created. Check email to verify account.' } },
                },
              },
            },
          },
          400: { description: 'Validation error (errors array or message)' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive JWT access token',
        description: 'Returns accessToken and user. Sets httpOnly cookie refreshToken for token rotation. Only allowed if email is verified.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string', description: 'JWT access token (Bearer)' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string', enum: ['user', 'admin', 'bd'] },
                        emailVerified: { type: 'boolean' },
                        isActive: { type: 'boolean' },
                        subscription_plan: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid credentials' },
          403: { description: 'Email not verified' },
        },
      },
    },
    '/auth/refresh-token': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description: 'Uses refreshToken from httpOnly cookie. Returns new accessToken and rotates refresh token cookie.',
        security: [],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          200: {
            description: 'New access token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { accessToken: { type: 'string' } },
                },
              },
            },
          },
          401: { description: 'No refresh token or invalid/expired' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user (requires JWT)',
        parameters: [],
        responses: {
          200: {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' },
                    emailVerified: { type: 'boolean' },
                    isActive: { type: 'boolean' },
                    subscription_plan: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized or invalid token' },
          403: { description: 'Email not verified' },
        },
      },
    },
    '/auth/verify-email': {
      get: {
        tags: ['Auth'],
        summary: 'Verify email via token (query or path)',
        description: 'Token as query: GET /auth/verify-email?token=...',
        security: [],
        parameters: [
          { in: 'query', name: 'token', required: true, schema: { type: 'string' }, description: 'Verification token' },
        ],
        responses: {
          200: {
            description: 'Email verified',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    emailVerified: { type: 'boolean' },
                    userId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid or expired verification token' },
        },
      },
    },
    '/auth/verify-email/{token}': {
      get: {
        tags: ['Auth'],
        summary: 'Verify email via token (path)',
        description: 'Same as GET /auth/verify-email?token=... but token in path.',
        security: [],
        parameters: [
          { in: 'path', name: 'token', required: true, schema: { type: 'string' }, description: 'Verification token' },
        ],
        responses: {
          200: {
            description: 'Email verified',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    emailVerified: { type: 'boolean' },
                    userId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid or expired verification token' },
        },
      },
    },
    '/auth/admin/login': {
      post: {
        tags: ['Auth'],
        summary: 'Admin login',
        description: 'Login for admin only. Only users with role=admin can authenticate. Returns accessToken, user, and sets refreshToken cookie. Use for /admin/login page.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@hiredlogics.com' },
                  password: { type: 'string', example: 'admin123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Admin login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string', enum: ['admin'] },
                        emailVerified: { type: 'boolean' },
                        isActive: { type: 'boolean' },
                        subscription_plan: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid credentials or not an admin account' },
        },
      },
    },
    '/auth/set-password': {
      post: {
        tags: ['Auth'],
        summary: 'Set password (by email)',
        description: 'For paid users who completed checkout. Look up user by email and set password. Use when the set-password page has no session_id in the URL.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'confirm_password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: {
                    type: 'string',
                    minLength: 8,
                    description: 'Min 8 chars, uppercase, lowercase, number, special character',
                  },
                  confirm_password: { type: 'string', description: 'Must match password' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password set, returns accessToken and user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    accessToken: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                        emailVerified: { type: 'boolean' },
                        isActive: { type: 'boolean' },
                        subscription_plan: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error, no account for email, or payment not completed' },
        },
      },
    },
    '/auth/set-password-by-session': {
      post: {
        tags: ['Auth'],
        summary: 'Set password (by checkout session_id)',
        description: 'Preferred after Stripe checkout. Pass session_id from URL (?session_id=cs_xxx). Backend creates/updates user from session then sets password. No email needed.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['session_id', 'password', 'confirm_password'],
                properties: {
                  session_id: { type: 'string', description: 'Stripe checkout session ID from redirect URL' },
                  password: {
                    type: 'string',
                    minLength: 8,
                    description: 'Min 8 chars, uppercase, lowercase, number, special character',
                  },
                  confirm_password: { type: 'string', description: 'Must match password' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password set, returns accessToken and user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    accessToken: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                        emailVerified: { type: 'boolean' },
                        isActive: { type: 'boolean' },
                        subscription_plan: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error or session not found' },
          500: { description: 'Stripe or DB error' },
        },
      },
    },
    '/auth/bd/signup': {
      post: {
        tags: ['Auth'],
        summary: 'BD signup',
        description: 'Register a new BD. Stored in users table with role=bd. No email verification; appears in admin BD list.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'confirm_password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  confirm_password: { type: 'string', description: 'Must match password' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'BD account created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string', example: 'BD account created. You can sign in now.' } },
                },
              },
            },
          },
          400: { description: 'Validation error or email already in use' },
        },
      },
    },
    '/auth/bd/login': {
      post: {
        tags: ['Auth'],
        summary: 'BD login',
        description: 'Login for BD only. Authenticates users with role=bd. Returns accessToken and user (role=bd). No refresh token cookie.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'BD login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string', enum: ['bd'] },
                        isActive: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid credentials' },
          403: { description: 'BD account inactive' },
        },
      },
    },
    '/plans': {
      get: {
        tags: ['Plans'],
        summary: 'List paid subscription plans',
        description: 'Returns plans from subscription_plans table (excludes free). Used by pricing page.',
        security: [],
        responses: {
          200: {
            description: 'Array of plans from DB',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      plan_id: { type: 'string', example: 'professional_resume', description: 'Unique plan identifier' },
                      name: { type: 'string', example: 'Professional Resume' },
                      price: { type: 'number', example: 14.99 },
                      currency: { type: 'string', example: 'USD' },
                      billing_interval: { type: 'string', example: 'one-time', enum: ['one-time', 'monthly', 'never'] },
                      description: { type: 'string', description: 'Plan description' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/subscriptions/checkout-session': {
      post: {
        tags: ['Subscriptions', 'Stripe'],
        summary: 'Create Stripe Checkout session for subscription',
        description: 'Optional JWT (logged-in user) or anonymous. Creates Stripe Checkout Session. Send plan_id from GET /plans. Redirect user to returned url.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  plan_id: { type: 'string', description: 'Plan identifier from GET /plans (e.g. professional_resume, starter, success, elite)' },
                  planId: { type: 'string', description: 'Alias for plan_id' },
                  email: { type: 'string', format: 'email', description: 'Optional: customer email for checkout (overrides logged-in user email)' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Checkout URL for redirect',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url'],
                  properties: { url: { type: 'string', format: 'uri', description: 'Stripe Checkout URL or mock success URL' } },
                },
              },
            },
          },
          400: { description: 'plan_id / planId required or invalid plan' },
          401: { description: 'Unauthorized (if auth required by server)' },
          403: { description: 'Email not verified' },
        },
      },
    },
    '/subscriptions/checkout-session/{sessionId}': {
      get: {
        tags: ['Subscriptions', 'Stripe'],
        summary: 'Confirm checkout session',
        description: 'After Stripe redirect. Confirms session and activates user subscription. Requires JWT.',
        parameters: [
          { in: 'path', name: 'sessionId', required: true, schema: { type: 'string' }, description: 'Stripe checkout session ID from redirect URL' },
        ],
        responses: {
          200: {
            description: 'Session confirmed, user and subscription updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { type: 'object' },
                    subscription: { type: 'object' },
                    planId: { type: 'string' },
                    sessionId: { type: 'string' },
                    accountCreated: { type: 'boolean' },
                  },
                },
              },
            },
          },
          403: { description: 'Session does not belong to current user' },
        },
      },
    },
    '/payments/create-checkout-session': {
      post: {
        tags: ['Payments', 'Stripe'],
        summary: 'Create checkout session (verified email flow)',
        description: 'Alternative flow: requires verificationToken and planId. Used when user verifies email then goes to checkout. Returns Stripe checkout URL.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['verificationToken', 'planId'],
                properties: {
                  verificationToken: { type: 'string' },
                  planId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Checkout URL' },
          400: { description: 'Validation error' },
        },
      },
    },
    '/subscriptions/me': {
      get: {
        tags: ['Subscriptions'],
        summary: 'Get current user subscription',
        description: 'Requires JWT. Returns subscription_plan, is_active, is_verified from users table.',
        responses: {
          200: {
            description: 'Current user subscription info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    subscription_plan: { type: 'string' },
                    is_active: { type: 'boolean' },
                    is_verified: { type: 'boolean' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get dashboard summary',
        description: 'Requires JWT. Returns user, subscription, stats, profile. user.subscription_plan_name is the display name from subscription_plans (e.g. "Professional Resume").',
        responses: {
          200: {
            description: 'Dashboard summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        full_name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                        subscription_plan: { type: 'string', description: 'plan_id (e.g. professional_resume)' },
                        subscription_plan_name: { type: 'string', description: 'Display name from subscription_plans' },
                        is_active: { type: 'boolean' },
                      },
                    },
                    subscription: { type: 'object', nullable: true },
                    stats: { type: 'object' },
                    profile: { type: 'object', nullable: true },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get current user profile',
        description: 'Requires JWT.',
        responses: {
          200: { description: 'User profile' },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Profile'],
        summary: 'Save/update profile',
        description: 'Requires JWT.',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  full_name: { type: 'string' },
                  title: { type: 'string' },
                  employment_type: { type: 'string' },
                  experience_years: { type: 'number' },
                  preferred_country: { type: 'string' },
                  preferred_city: { type: 'string' },
                  remote_preference: { type: 'string' },
                  work_authorisation: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Profile saved' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Get user settings',
        description: 'Requires JWT. Returns user (with subscription_plan_name from subscription_plans) and subscription.',
        responses: {
          200: {
            description: 'Settings object',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        subscription_plan: { type: 'string' },
                        subscription_plan_name: { type: 'string', description: 'Display name for current plan' },
                      },
                    },
                    subscription: { type: 'object', nullable: true },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/settings/profile': {
      put: {
        tags: ['Settings'],
        summary: 'Update profile (full_name)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['full_name'],
                properties: { full_name: { type: 'string', minLength: 2 } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Profile updated' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/settings/password': {
      put: {
        tags: ['Settings'],
        summary: 'Change password',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['current_password', 'new_password'],
                properties: {
                  current_password: { type: 'string' },
                  new_password: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password changed' },
          400: { description: 'Validation error or wrong current password' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/user/onboarding': {
      post: {
        tags: ['User'],
        summary: 'Save onboarding preferences',
        description: 'Creates/updates profile (profiles table). Uses user_bd_assignments for bd_id if set. Schema: title, employment_type, experience_years, experience_level, earliest_start_date, preferred_country, preferred_city, remote_preference, work_authorisation, job_functions (TEXT[]), job_types (employment_type[]).',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  jobFunction: { type: 'string' },
                  jobFunctions: { type: 'array', items: { type: 'string' } },
                  jobTypes: { type: 'array', items: { type: 'string' } },
                  preferredLocations: { type: 'array', items: { type: 'string' } },
                  preferredCity: { type: 'string' },
                  earliestStartDate: { type: 'string', format: 'date' },
                  experienceLevel: { type: 'string' },
                  openToRemote: { type: 'boolean' },
                  workAuthorisation: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Onboarding saved' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/cv/profile': {
      get: {
        tags: ['CV'],
        summary: 'Get resume profile for builder',
        description: 'Returns resume data in builder format (personal, professional, education, links) from profiles + profile_education + profile_work_experience.',
        responses: {
          200: { description: 'Resume profile object' },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['CV'],
        summary: 'Save resume profile',
        description: 'Accepts builder-format profile; persists to profiles, profile_education, profile_work_experience.',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  personal: { type: 'object', properties: { fullName: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, location: { type: 'string' } } },
                  professional: { type: 'object', properties: { currentTitle: { type: 'string' }, summary: { type: 'string' }, skills: { type: 'array', items: { type: 'string' } }, workExperience: { type: 'array' } } },
                  education: { type: 'array' },
                  links: { type: 'object', properties: { linkedin: { type: 'string' }, github: { type: 'string' }, portfolio: { type: 'string' } } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Saved' },
          400: { description: 'Bad request' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/cv/improve-summary': {
      post: {
        tags: ['CV'],
        summary: 'AI improve professional summary',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { summary: { type: 'string' }, role: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Returns { improved }' },
          401: { description: 'Unauthorized' },
          500: { description: 'AI error' },
        },
      },
    },
    '/cv/optimize-experience': {
      post: {
        tags: ['CV'],
        summary: 'AI optimize experience bullet points',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { description: { type: 'string' }, role: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Returns { optimized }' },
          401: { description: 'Unauthorized' },
          500: { description: 'AI error' },
        },
      },
    },
    '/cv/optimize-full-resume': {
      post: {
        tags: ['CV'],
        summary: 'AI optimize full resume for job description',
        description: 'Runs gap analysis (JD vs resume) and returns optimized profile + gapAnalysis. Does not auto-save; client may apply and then POST /cv/profile.',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['profile', 'jd'],
                properties: { profile: { type: 'object' }, jd: { type: 'string', description: 'Job description text' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Returns { gapAnalysis, optimizedProfile }' },
          400: { description: 'Profile and jd required' },
          401: { description: 'Unauthorized' },
          500: { description: 'AI error' },
        },
      },
    },
    '/cv/templates': {
      get: {
        tags: ['CV'],
        summary: 'List resume templates',
        responses: {
          200: { description: 'Array of { id, name }' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/cv/download': {
      post: {
        tags: ['CV'],
        summary: 'Generate and download resume PDF',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['profile'],
                properties: { profile: { type: 'object', description: 'Builder-format profile' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'application/pdf attachment' },
          400: { description: 'Profile required' },
          401: { description: 'Unauthorized' },
          500: { description: 'PDF generation error' },
        },
      },
    },
    '/cv/parse': {
      post: {
        tags: ['CV'],
        summary: 'Upload and parse CV/resume',
        description: 'Accepts multipart/form-data with file field "resume". Extracts text, runs AI parse, saves to profiles + profile_education + profile_work_experience. Requires GROQ_API_KEY for AI.',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { resume: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Parsed profile (builder format)' },
          400: { description: 'No file or invalid' },
          401: { description: 'Unauthorized' },
          429: { description: 'AI rate limit' },
          500: { description: 'Parse error' },
        },
      },
    },
    '/bd/analytics': {
      get: {
        tags: ['BD'],
        summary: 'Get BD dashboard analytics',
        description: 'Requires JWT (BD or admin). Returns total leads, by status, over time, assigned users count, unassigned count.',
        responses: {
          200: {
            description: 'Analytics object',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    byStatus: { type: 'array', items: { type: 'object', properties: { status: { type: 'string' }, count: { type: 'integer' } } } },
                    last7Days: { type: 'integer' },
                    last30Days: { type: 'integer' },
                    unassignedCount: { type: 'integer' },
                    assignedUsersCount: { type: 'integer' },
                    overTime: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'BD or admin only' },
        },
      },
    },
    '/bd/oneclick-token': {
      get: {
        tags: ['BD'],
        summary: 'Get or create Capture API key',
        description: 'Requires JWT (BD or admin). Returns oneclick_api_key for use in the HiredLogics Capture browser extension (Authorization: Bearer &lt;key&gt;). Key is created on first call.',
        responses: {
          200: {
            description: 'API key for extension',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['oneclick_api_key'],
                  properties: {
                    oneclick_api_key: { type: 'string', description: 'Use in extension as Bearer token' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'BD or admin only' },
        },
      },
    },
    '/bd/my-users': {
      get: {
        tags: ['BD'],
        summary: 'List users assigned to current BD',
        description: 'Requires JWT (BD or admin). Returns users from user_bd_assignments for the current BD.',
        responses: {
          200: {
            description: 'Array of assigned users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      full_name: { type: 'string' },
                      email: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'BD or admin only' },
        },
      },
    },
    '/stripe/webhook': {
      post: {
        tags: ['Stripe'],
        summary: 'Stripe webhook endpoint',
        description: 'Server-to-server only. Stripe sends events here (checkout.session.completed, invoice.paid, customer.subscription.*, etc.). Raw body; Stripe-Signature header required. Do not call from client; no Bearer auth.',
        security: [],
        parameters: [
          { in: 'header', name: 'Stripe-Signature', required: true, schema: { type: 'string' }, description: 'Stripe webhook signature' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', description: 'Stripe event payload (raw body)' },
            },
          },
        },
        responses: {
          200: {
            description: 'Event received',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    received: { type: 'boolean' },
                    mock: { type: 'boolean', description: 'True if STRIPE_MOCK_MODE' },
                  },
                },
              },
            },
          },
          400: { description: 'Webhook signature verification failed' },
          500: { description: 'Webhook handler error' },
        },
      },
    },
    '/webhooks/stripe': {
      post: {
        tags: ['Stripe'],
        summary: 'Stripe webhook (legacy path)',
        description: 'Same as POST /stripe/webhook. Use for Stripe dashboard webhook URL: .../api/webhooks/stripe.',
        security: [],
        parameters: [
          { in: 'header', name: 'Stripe-Signature', required: true, schema: { type: 'string' } },
        ],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          200: { description: 'Event received' },
          400: { description: 'Webhook signature verification failed' },
          500: { description: 'Webhook handler error' },
        },
      },
    },
    '/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Get dashboard stats',
        responses: {
          200: { description: 'Stats for admin dashboard' },
          403: { description: 'Admin only' },
        },
      },
    },
    '/admin/analytics': {
      get: {
        tags: ['Admin'],
        summary: 'Get admin dashboard analytics',
        description: 'Returns summary counts, users by role, user growth, leads by status/over time, subscriptions by plan, applications by status.',
        responses: {
          200: {
            description: 'Analytics object',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    summary: { type: 'object', properties: { totalUsers: { type: 'integer' }, activeSubscriptions: { type: 'integer' }, totalLeads: { type: 'integer' }, totalApplications: { type: 'integer' } } },
                    usersByRole: { type: 'array' },
                    usersCreatedLast7Days: { type: 'array' },
                    usersCreatedLast30Days: { type: 'array' },
                    leadsByStatus: { type: 'array' },
                    leadsOverTime: { type: 'array' },
                    subscriptionsByPlan: { type: 'array' },
                    applicationsByStatus: { type: 'array' },
                    counts: { type: 'object' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
        },
      },
    },
    '/admin/users/{id}/subscription-plan': {
      put: {
        tags: ['Admin'],
        summary: 'Set user subscription plan',
        description: 'Admin sets subscription_plan (plan_id) for a user. Does not create Stripe subscription.',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'User ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['plan_id'],
                properties: {
                  plan_id: { type: 'string', nullable: true, description: 'Plan ID from subscription_plans, or null for free' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User plan updated' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
          404: { description: 'User not found' },
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all users',
        description: 'Returns users (role=user) with assigned_bds array. Admin only.',
        responses: {
          200: {
            description: 'Array of users with assigned_bds',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                      subscription_plan: { type: 'string' },
                      isBlocked: { type: 'boolean' },
                      created_at: { type: 'string', format: 'date-time' },
                      assigned_bds: {
                        type: 'array',
                        items: { type: 'object', properties: { id: { type: 'string' }, full_name: { type: 'string' }, email: { type: 'string' } } },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
        },
      },
    },
    '/admin/bds': {
      get: {
        tags: ['Admin'],
        summary: 'List all BDs',
        description: 'Returns users with role=bd. Admin only.',
        responses: {
          200: {
            description: 'Array of BDs',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      full_name: { type: 'string' },
                      email: { type: 'string' },
                      is_active: { type: 'boolean' },
                      created_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
        },
      },
    },
    '/admin/assign-bd': {
      post: {
        tags: ['Admin'],
        summary: 'Assign BDs to a user',
        description: 'Replaces existing assignments. Admin only.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user_id', 'bd_ids'],
                properties: {
                  user_id: { type: 'string', format: 'uuid', description: 'User to assign BDs to' },
                  bd_ids: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                    description: 'BD IDs to assign (can be empty to clear)',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Assignments updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    assigned_bds: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
          404: { description: 'User not found' },
        },
      },
    },
    '/admin/users/{id}/block': {
      post: {
        tags: ['Admin'],
        summary: 'Block a user',
        description: 'Sets user is_active = false. Admin only.',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'User ID' },
        ],
        responses: {
          200: { description: 'User blocked' },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
          404: { description: 'User not found' },
        },
      },
    },
    '/admin/users/{id}/unblock': {
      post: {
        tags: ['Admin'],
        summary: 'Unblock a user',
        description: 'Sets user is_active = true. Admin only.',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'User ID' },
        ],
        responses: {
          200: { description: 'User unblocked' },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
          404: { description: 'User not found' },
        },
      },
    },
    '/admin/users/{id}/reset-password': {
      post: {
        tags: ['Admin'],
        summary: 'Reset user/BD password',
        description: 'Admin sets a new password for any user (users table). Admin only.',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'User ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['new_password'],
                properties: {
                  new_password: { type: 'string', minLength: 6, description: 'New password' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password reset' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
          404: { description: 'User not found' },
        },
      },
    },
    '/admin/subscriptions': {
      get: {
        tags: ['Admin'],
        summary: 'List all subscriptions',
        responses: {
          200: { description: 'Array of subscriptions' },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
        },
      },
    },
    '/admin/subscriptions/{id}/cancel': {
      post: {
        tags: ['Admin'],
        summary: 'Cancel a subscription',
        description: 'Admin only.',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Subscription ID' },
        ],
        responses: {
          200: { description: 'Subscription cancelled' },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
          404: { description: 'Not found' },
        },
      },
    },
    '/admin/plans': {
      get: {
        tags: ['Admin'],
        summary: 'List plans (admin)',
        responses: {
          200: { description: 'Array of plans' },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
        },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a plan (admin)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'number' },
                  stripePriceId: { type: 'string' },
                  features: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Plan created' },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
        },
      },
    },
    '/admin/plans/{id}': {
      put: {
        tags: ['Admin'],
        summary: 'Update a plan (admin)',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'number' },
                  stripePriceId: { type: 'string' },
                  features: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Plan updated' },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
          404: { description: 'Plan not found' },
        },
      },
    },
    '/leads': {
      get: {
        tags: ['Leads'],
        summary: 'List leads by role',
        description: 'Returns leads based on logged-in user: users see leads from BDs assigned to them (user_bd_assignments); BDs/admins see leads they created. Same query params as /leads/bd and /leads/user.',
        parameters: [
          { in: 'query', name: 'range', schema: { type: 'string', enum: ['today', '3days', '7days', '15days', 'all'] }, description: 'Date filter' },
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Paginated list (items, total, page, limit)' },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Leads'],
        summary: 'Create a new lead (BD or admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['job_title', 'company_name', 'job_link'],
                properties: {
                  job_id: { type: 'string', format: 'uuid', nullable: true },
                  job_title: { type: 'string' },
                  company_name: { type: 'string' },
                  job_link: { type: 'string' },
                  assigned_user_id: { type: 'string', format: 'uuid', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Lead created' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/leads/{id}/assign': {
      patch: {
        tags: ['Leads'],
        summary: 'Assign a lead to a user (BD or admin)',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['assigned_user_id'],
                properties: {
                  assigned_user_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Lead assignment updated' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
          404: { description: 'Lead not found' },
        },
      },
    },
    '/leads/{id}/status': {
      patch: {
        tags: ['Leads'],
        summary: 'Update lead (job_assignment) status (BD or admin)',
        description: 'job_assignments.status uses job_assignment_status enum: pending, assigned, completed, failed.',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['pending', 'assigned', 'completed', 'failed'],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Lead status updated' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
          404: { description: 'Lead not found' },
        },
      },
    },
    '/leads/bd': {
      get: {
        tags: ['Leads'],
        summary: 'List leads created by the current BD',
        parameters: [
          {
            in: 'query',
            name: 'range',
            schema: {
              type: 'string',
              enum: ['today', '3days', '7days', '15days', 'all'],
              default: 'all',
            },
          },
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', default: 1 },
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          200: { description: 'Paginated list of BD leads' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/leads/user': {
      get: {
        tags: ['Leads'],
        summary: 'List leads for the current user',
        description: 'Leads from all BDs assigned to this user via user_bd_assignments. Supports range (today, 3days, 7days, 15days, all), page, limit.',
        parameters: [
          {
            in: 'query',
            name: 'range',
            schema: {
              type: 'string',
              enum: ['today', '3days', '7days', '15days', 'all'],
              default: 'all',
            },
          },
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', default: 1 },
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          200: { description: 'Paginated list of user leads' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/leads/filter': {
      get: {
        tags: ['Leads'],
        summary: 'Filter leads by date range (admin)',
        parameters: [
          {
            in: 'query',
            name: 'range',
            schema: {
              type: 'string',
              enum: ['today', '3days', '7days', '15days', 'all'],
              default: 'all',
            },
          },
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', default: 1 },
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          200: { description: 'Paginated list of leads' },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
        },
      },
    },
    '/leads/{id}/applied': {
      post: {
        tags: ['Leads'],
        summary: 'Mark a lead as applied and create an application (assigned user only)',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Lead marked as applied' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
          404: { description: 'Lead not found' },
        },
      },
    },
    '/leads/stats': {
      get: {
        tags: ['Leads'],
        summary: 'Get aggregate lead statistics (admin)',
        responses: {
          200: { description: 'Lead statistics' },
          401: { description: 'Unauthorized' },
          403: { description: 'Admin only' },
        },
      },
    },
    '/extension/jobs': {
      post: {
        tags: ['Extension (Capture)'],
        summary: 'Submit job from HiredLogics Capture extension',
        description: 'Creates or reuses job by job_url, then creates job_assignment for the BD. Auth via Bearer token: use the oneclick_api_key from GET /bd/oneclick-token. Data appears in BD dashboard (Your leads) and admin/user dashboards.',
        security: [{ oneclickApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'company_name', 'job_url'],
                properties: {
                  title: { type: 'string', description: 'Job title' },
                  company_name: { type: 'string', description: 'Company name' },
                  job_url: { type: 'string', format: 'uri', description: 'Job listing URL (unique per job)' },
                  platform: { type: 'string', description: 'Optional e.g. LinkedIn, Indeed' },
                  location: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Job saved, lead created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    job_id: { type: 'string', format: 'uuid' },
                    lead_id: { type: 'string', format: 'uuid' },
                    job_title: { type: 'string' },
                    company_name: { type: 'string' },
                    job_link: { type: 'string' },
                    status: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'title, company_name, job_url required' },
          401: { description: 'Missing or invalid Capture API key' },
          403: { description: 'API key not for BD/admin' },
          409: { description: 'Duplicate job URL (already added by you)' },
        },
      },
    },
  },
};

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [], // we define everything inline above for now
});

