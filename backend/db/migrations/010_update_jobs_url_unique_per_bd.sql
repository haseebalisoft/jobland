-- Allow same job_url to be used by different BDs.
-- Drop old unique constraint on jobs.job_url and replace with (job_url, bd_id).

ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS jobs_job_url_key;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_jobs_job_url_bd_id
  ON jobs(job_url, bd_id);

