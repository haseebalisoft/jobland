import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'JobLand SaaS API',
    version: '1.0.0',
    description:
      'REST API for JobLand subscription-based SaaS (auth, billing, admin dashboard).',
  },
  servers: [
    {
      url: `${config.clientUrl.replace(/\/$/, '')}/api`.replace('5173', '5000'),
      description: 'Local API server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
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
                  email: { type: 'string', format: 'email', example: 'admin@jobland.com' },
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
        summary: 'List active subscription plans',
        security: [],
        responses: {
          200: {
            description: 'Array of plans (id, name, price, stripePriceId, etc.)',
          },
        },
      },
    },
    '/subscriptions/checkout-session': {
      post: {
        tags: ['Subscriptions', 'Stripe'],
        summary: 'Create Stripe Checkout session for subscription',
        description: 'Requires JWT. Creates Stripe Checkout Session (or mock URL if STRIPE_MOCK_MODE). Redirect user to returned url.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['planId'],
                properties: {
                  planId: { type: 'string', description: 'Plan identifier (e.g. pro, enterprise)' },
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
          400: { description: 'planId is required' },
          401: { description: 'Unauthorized' },
          403: { description: 'Email not verified' },
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
        description: 'Requires JWT. Returns summary for user dashboard.',
        responses: {
          200: { description: 'Dashboard summary' },
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
        description: 'Requires JWT.',
        responses: {
          200: { description: 'Settings object' },
          401: { description: 'Unauthorized' },
        },
      },
      put: {
        tags: ['Settings'],
        summary: 'Update settings',
        description: 'Requires JWT. Use PUT /settings/profile for profile, PUT /settings/password for password.',
        responses: {
          200: { description: 'Updated' },
          400: { description: 'Validation error' },
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
        summary: 'Update lead status (BD or admin)',
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
                    enum: ['pending', 'applied', 'interview', 'rejected', 'offer'],
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
        summary: 'List leads assigned to the current user',
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
  },
};

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [], // we define everything inline above for now
});

