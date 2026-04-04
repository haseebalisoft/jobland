import { query } from '../config/db.js';

// 001_initial: subscriptions has subscription_plan_id (FK to subscription_plans); plan_id lives on subscription_plans
async function getLatestSubscription(userId) {
  try {
    const subRes = await query(
      `
        SELECT s.stripe_customer_id,
               s.stripe_subscription_id,
               s.status,
               s.current_period_end,
               s.created_at,
               sp.plan_id,
               sp.name AS plan_name,
               sp.billing_interval
        FROM subscriptions s
        LEFT JOIN subscription_plans sp ON sp.id = s.subscription_plan_id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
        LIMIT 1
      `,
      [userId],
    );

    return subRes.rows[0] || null;
  } catch (err) {
    if (err?.code === '42P01') {
      return null;
    }
    throw err;
  }
}

export async function getDashboardSummary(req, res, next) {
  try {
    const userId = req.user.id;

    const userRes = await query(
      `
        SELECT u.id, u.full_name, u.email, u.role, u.subscription_plan, u.is_active,
               sp.name AS subscription_plan_name
        FROM users u
        LEFT JOIN subscription_plans sp ON sp.plan_id = u.subscription_plan
        WHERE u.id = $1
      `,
      [userId],
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRes.rows[0];

    const subscription = await getLatestSubscription(userId);

    // applications.current_status: application_status enum in 001 (applied, interview, acceptance, rejection, withdrawn)
    const appsRes = await query(
      `
        SELECT
          COUNT(*)::int AS total_applications,
          COALESCE(SUM(CASE WHEN current_status = 'interview' THEN 1 ELSE 0 END), 0)::int AS total_interviews
        FROM applications
        WHERE user_id = $1
      `,
      [userId],
    );

    const statsRow = appsRes.rows[0] || {
      total_applications: 0,
      total_interviews: 0,
    };

    const profileRes = await query(
      `
        SELECT id,
               title,
               employment_type,
               experience_years,
               preferred_country,
               preferred_city
        FROM profiles
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId],
    );

    const profile = profileRes.rows[0] || null;

    res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        subscription_plan: user.subscription_plan,
        subscription_plan_name: user.subscription_plan_name || null,
        is_active: user.is_active,
      },
      subscription,
      stats: statsRow,
      profile,
    });
  } catch (err) {
    next(err);
  }
}

/** Action-plan stepper metadata (client also uses GET /user/progress for current step). */
export async function getDashboardActionPlan(req, res, next) {
  try {
    res.json({
      activeTab: 'application_materials',
      tag: 'Resume & Profile',
      actionTitle: 'Create a new resume to get started',
      actionBody:
        "By creating a comprehensive master document now, you'll be able to quickly tailor your resume to any job.",
      ctaLabel: 'Create New Base Resume',
      bottomTitle: "You've Taken the First Step — Let's Go Further",
      bottomSubtitle:
        "You've already started your journey. Now explore all the AI-powered tools designed to help you land your next role.",
      tabs: [
        { id: 'application_materials', label: 'Application Materials', order: 0 },
        { id: 'jobs', label: 'Jobs', order: 1 },
        { id: 'networking', label: 'Networking', order: 2 },
        { id: 'interviews', label: 'Interviews', order: 3 },
      ],
      hero: {
        title: "You've Taken the First Step — Let's Go Further",
        subtitle:
          "You've already started your journey. Now explore all the AI-powered tools designed to help you land your job faster and stress less.",
        ctaLabel: 'Explore All Features',
        ctaPath: '/free-tools',
      },
      quickStats: {
        sectionTitle: 'Quick Stats',
        cards: [
          {
            id: 'job_tracker',
            title: 'Job Tracker',
            description:
              'Start tracking your job applications and stay organized throughout your search.',
            path: '/dashboard/applications',
            visual: 'kanban',
          },
          {
            id: 'networking',
            title: 'Networking Tracker',
            description: 'Keep tabs on your outreach and connections as you grow your network.',
            path: '/profile-builder',
            visual: 'contacts',
          },
        ],
      },
      upsell: {
        label: 'Plans starting from',
        crossedPrice: '$12.99',
        price: '$8.99',
        pricePeriod: '/ Week',
        description:
          'Supercharge your job search with Hirdlogic AI-powered tools built to get you hired faster.',
        ctaLabel: 'UPGRADE NOW',
        ctaPath: '/checkout',
        features: [
          'Unlimited AI resume analysis',
          'Unlimited AI cover letter generations',
          'AI LinkedIn post suggestions',
          'Priority email support',
          'And more!',
        ],
      },
      promos: [
        {
          id: 'experts',
          title: 'Human-crafted. ATS-optimized. Interview-ready!',
          body: 'Get your resume professionally reviewed or rewritten with our guided tools.',
          ctaLabel: 'Improve My Resume',
          path: '/resume-maker',
        },
        {
          id: 'extension',
          title: 'Supercharge LinkedIn with Hirdlogic',
          body: 'Optimize your profile and manage applications — right from your browser.',
          ctaLabel: 'Install Now',
          path: '/free-tools',
        },
      ],
      resources: {
        title: 'Resources',
        viewAllLabel: 'View All Resources',
        viewAllPath: '/',
        items: [
          {
            id: 'r1',
            title: 'How to tailor your resume to any job description',
            description:
              'Learn a repeatable framework to map your experience to what recruiters search for — without starting from scratch each time.',
            readMorePath: '/free-tools',
            accent: 'link',
          },
          {
            id: 'r2',
            title: 'AI and your job search: what to automate vs. what to own',
            description:
              'Use AI for speed on drafts and research, while keeping authenticity in your story and interviews.',
            readMorePath: '/free-tools',
            accent: 'spark',
          },
          {
            id: 'r3',
            title: 'Returning to work after a career break',
            description:
              'Address gaps with confidence: structure your resume narrative and prep for common interview questions.',
            readMorePath: '/free-tools',
            accent: 'doc',
          },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
}

