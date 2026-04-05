    -- Set when a resume PDF is successfully parsed via POST /cv/parse (job match requires this).
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_uploaded_at TIMESTAMPTZ;
