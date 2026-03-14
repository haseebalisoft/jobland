CREATE DATABASE hiredlogics_prod;


CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================
-- ENUM TYPES
-- =============================

CREATE TYPE employment_type AS ENUM (
    'full_time',
    'contract',
    'part_time',
    'internship'
);

CREATE TYPE remote_type AS ENUM (
    'remote_only',
    'onsite_only',
    'hybrid',
    'remote_or_onsite'
);

CREATE TYPE user_role AS ENUM ('user', 'bd', 'admin');

CREATE TYPE application_status AS ENUM (
  'applied',
  'interview',
  'acceptance',
  'rejection',
  'withdrawn'
);

CREATE TYPE subscription_status AS ENUM (
  'active',
  'trialing',
  'canceled',
  'past_due'
);

CREATE TYPE job_assignment_status AS ENUM (
  'pending',
  'assigned',
  'completed',
  'failed'
);

-- =============================
-- USERS
-- =============================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,

    role user_role NOT NULL DEFAULT 'user',

    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'free',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,

    stripe_customer_id TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_unique_lower ON users (LOWER(email));
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);

-- =============================
-- PROFILES
-- =============================

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bd_id UUID REFERENCES users(id) ON DELETE SET NULL,

    title VARCHAR(255) NOT NULL,

    employment_type employment_type,
    experience_years INTEGER CHECK (experience_years >= 0),
    experience_level VARCHAR(50),

    earliest_start_date DATE,

    preferred_country VARCHAR(100),
    preferred_city VARCHAR(100),
    remote_preference remote_type,

    work_authorisation VARCHAR(255),

    job_functions TEXT[],
    job_types employment_type[],

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_bd_id ON profiles(bd_id);
CREATE INDEX idx_profiles_job_functions_gin ON profiles USING GIN (job_functions);
CREATE INDEX idx_profiles_job_types_gin ON profiles USING GIN (job_types);

-- =============================
-- PROFILE EDUCATION
-- =============================

CREATE TABLE profile_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    degree VARCHAR(255),
    field_of_study VARCHAR(255),
    institution VARCHAR(255),
    start_date DATE,
    end_date DATE,
    description TEXT
);

CREATE INDEX idx_profile_education_profile_id 
ON profile_education(profile_id);

-- =============================
-- PROFILE WORK EXPERIENCE
-- =============================

CREATE TABLE profile_work_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    job_title VARCHAR(255),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT
);

CREATE INDEX idx_profile_work_profile_id 
ON profile_work_experience(profile_id);

-- =============================
-- JOBS
-- =============================

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    company_website TEXT,
    title VARCHAR(255) NOT NULL,
    job_url TEXT UNIQUE NOT NULL,
    platform VARCHAR(100),
    location VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_platform ON jobs(platform);
CREATE INDEX idx_jobs_company_name ON jobs(company_name);

-- =============================
-- USER ↔ BD ASSIGNMENTS
-- =============================

CREATE TABLE user_bd_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bd_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, bd_id),
    CONSTRAINT no_self_bd_assignment CHECK (user_id <> bd_id)
);

-- =============================
-- JOB ASSIGNMENTS
-- =============================

CREATE TABLE job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bd_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  status job_assignment_status NOT NULL DEFAULT 'pending',

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_assignments_job_id ON job_assignments(job_id);
CREATE INDEX idx_job_assignments_user_id ON job_assignments(user_id);
CREATE INDEX idx_job_assignments_bd_id ON job_assignments(bd_id);
CREATE INDEX idx_job_assignments_status ON job_assignments(status);

-- =============================
-- APPLICATIONS
-- =============================

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    bd_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    current_status application_status NOT NULL DEFAULT 'applied',

    applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_status_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, job_id),
    CONSTRAINT no_self_assignment CHECK (user_id <> bd_id)
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_profile_id ON applications(profile_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_bd_id ON applications(bd_id);
CREATE INDEX idx_applications_status ON applications(current_status);
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);

-- =============================
-- APPLICATION STATUS HISTORY
-- =============================

CREATE TABLE application_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    old_status application_status,
    new_status application_status NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_status_logs_app_id ON application_status_logs(application_id);
CREATE INDEX idx_app_status_logs_changed_at ON application_status_logs(changed_at DESC);

-- =============================
-- SUBSCRIPTION PLANS
-- =============================

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    billing_interval VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================
-- SUBSCRIPTIONS
-- =============================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,

    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    stripe_checkout_session_id TEXT UNIQUE,

    status subscription_status NOT NULL,
    current_period_end TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- =============================
-- REFRESH TOKENS
-- =============================

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- =============================
-- AUTO updated_at TRIGGER
-- =============================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_applications
BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_subscriptions
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_job_assignments
BEFORE UPDATE ON job_assignments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================
-- ROLE VALIDATION TRIGGERS
-- =============================

CREATE OR REPLACE FUNCTION validate_bd_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.bd_id 
      AND role = 'bd'
      AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 
      'bd_id must reference an active user with role = bd';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_bd_role_applications
BEFORE INSERT OR UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION validate_bd_role();

CREATE TRIGGER enforce_bd_role_assignments
BEFORE INSERT OR UPDATE ON user_bd_assignments
FOR EACH ROW EXECUTE FUNCTION validate_bd_role();