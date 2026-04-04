-- Mock interview scenarios, sessions, and AI-generated reports
--
-- Ensures the shared trigger helper exists (normally created in 001_initial.sql).
-- Safe to run on DBs where 001 was skipped or the function was never installed.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS interview_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  duration_mins INT NOT NULL DEFAULT 25,
  focus_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  icon_type VARCHAR(40) NOT NULL DEFAULT 'technical',
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_scenarios_category ON interview_scenarios(category);
CREATE INDEX IF NOT EXISTS idx_interview_scenarios_premium ON interview_scenarios(is_premium);
CREATE INDEX IF NOT EXISTS idx_interview_scenarios_sort ON interview_scenarios(sort_order);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES interview_scenarios(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  user_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  conversation JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_sessions_status_chk CHECK (status IN ('active', 'completed', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user ON interview_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_scenario ON interview_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);

CREATE TABLE IF NOT EXISTS interview_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  overall_score INT NOT NULL,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
  better_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_reports_score_chk CHECK (overall_score >= 0 AND overall_score <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_reports_session ON interview_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_reports_user ON interview_reports(user_id, created_at DESC);

DROP TRIGGER IF EXISTS set_timestamp_interview_scenarios ON interview_scenarios;
CREATE TRIGGER set_timestamp_interview_scenarios
BEFORE UPDATE ON interview_scenarios
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_interview_sessions ON interview_sessions;
CREATE TRIGGER set_timestamp_interview_sessions
BEFORE UPDATE ON interview_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Seed scenarios (Hirdlogic mock interviews)
INSERT INTO interview_scenarios (title, description, category, duration_mins, focus_areas, icon_type, is_premium, sort_order)
SELECT * FROM (VALUES
  ('Mobile Developer (iOS/Android)', 'Candidate is applying for a mobile engineering role. Expect questions on Swift/Kotlin, app lifecycle, and shipping features.', 'Technical', 25,
   '["System design for mobile","UI performance","Testing on devices"]'::jsonb, 'technical', false, 1),
  ('Product Manager', 'Practice structuring answers for prioritization, stakeholder management, and metrics-driven decisions at a tech company.', 'Technical', 25,
   '["Roadmap tradeoffs","User research","Success metrics"]'::jsonb, 'technical', true, 2),
  ('QA / Test Engineer', 'Focus on test strategy, automation, bug triage, and collaboration with developers in an agile team.', 'Technical', 25,
   '["Test planning","Automation tradeoffs","Quality metrics"]'::jsonb, 'technical', false, 3),
  ('Security Engineer', 'Discuss threat modeling, secure SDLC, incident response, and balancing security with delivery speed.', 'Technical', 45,
   '["Threat modeling","Secure coding","Incident basics"]'::jsonb, 'technical', false, 4),
  ('Cloud Architect', 'Explore scalability, reliability, cost, and designing resilient systems on major cloud providers.', 'Technical', 45,
   '["Reliability","Cost vs performance","Architecture patterns"]'::jsonb, 'technical', false, 5),
  ('Walk Me Through Your Resume', 'Classic screening call: concise story, transitions, and relevance to the role you want.', 'Screening', 25,
   '["Clarity","Chronology","Impact statements"]'::jsonb, 'screening', false, 10),
  ('Why This Company', 'Articulate motivation, research, and cultural fit without generic answers.', 'Screening', 25,
   '["Research depth","Authenticity","Role alignment"]'::jsonb, 'screening', false, 11),
  ('Recruiter Initial Call', 'Short phone screen: salary expectations, timeline, and logistics.', 'Screening', 20,
   '["Communication","Expectations","Professional tone"]'::jsonb, 'screening', false, 12),
  ('Career Goals & Aspirations', 'Discuss long-term direction, learning appetite, and how this role fits your path.', 'Career Dev', 25,
   '["Direction","Growth mindset","Realistic plans"]'::jsonb, 'career_dev', false, 20),
  ('Handling Difficult Clients', 'Navigate conflict, expectations, and de-escalation while protecting the team.', 'Situational', 30,
   '["Empathy","Boundaries","Resolution steps"]'::jsonb, 'situational', false, 30),
  ('Dealing with Underperforming Team Members', 'Balance empathy with accountability; feedback and performance plans.', 'Leadership', 30,
   '["Feedback","Expectations","Follow-through"]'::jsonb, 'leadership', false, 31),
  ('Managing Tight Deadlines', 'Prioritize, communicate risk, and deliver under pressure.', 'Leadership', 25,
   '["Prioritization","Stakeholder updates","Quality tradeoffs"]'::jsonb, 'leadership', true, 32),
  ('Crisis Management', 'Respond to production outages or PR issues with calm structure.', 'Leadership', 35,
   '["Calm communication","Incident steps","Stakeholder alignment"]'::jsonb, 'leadership', true, 33),
  ('Salary & Offer Negotiation', 'Practice anchoring, framing value, and handling objections professionally.', 'Negotiations', 30,
   '["Value framing","BATNA","Professional tone"]'::jsonb, 'negotiation', false, 40),
  ('Behavioral: Team Conflict', 'STAR stories for disagreement, collaboration, and outcomes.', 'Behavioral', 25,
   '["STAR structure","Outcome focus","Ownership"]'::jsonb, 'behavioral', false, 50),
  ('Business Case Analysis', 'Structure a recommendation with data, risks, and next steps.', 'Case Studies', 45,
   '["Framework","Numbers","Risks"]'::jsonb, 'case_study', false, 60),
  ('Technical Problem Solving', 'Work through a constrained technical problem with clear reasoning.', 'Case Studies', 35,
   '["Problem framing","Tradeoffs","Verification"]'::jsonb, 'case_study', false, 61),
  ('System Design (High Level)', 'Design a scalable service with APIs, storage, and failure modes.', 'Technical', 45,
   '["Requirements","Components","Tradeoffs"]'::jsonb, 'code', false, 62),
  ('UX / UI Designer', 'Discuss portfolio, process, accessibility, and collaboration with PM and engineering.', 'Technical', 25,
   '["User empathy","Process","Accessibility"]'::jsonb, 'technical', false, 70),
  ('Cultural Fit & Values', 'Explore how you work, what you value in teams, and handling misalignment.', 'Cultural Fit', 25,
   '["Values","Collaboration","Adaptability"]'::jsonb, 'behavioral', false, 80),
  ('Exit Interview Simulation', 'Practice professional tone when leaving: feedback without burning bridges.', 'Exit', 20,
   '["Professionalism","Constructive feedback","Closure"]'::jsonb, 'behavioral', false, 90),
  ('FinTech Industry Deep Dive', 'Role-specific prompts for regulated environments, risk, and compliance awareness.', 'Industry', 35,
   '["Domain basics","Risk awareness","Customer trust"]'::jsonb, 'technical', false, 100)
) AS v(title, description, category, duration_mins, focus_areas, icon_type, is_premium, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM interview_scenarios LIMIT 1);
