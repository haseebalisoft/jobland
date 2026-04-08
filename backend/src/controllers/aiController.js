import { query } from '../config/db.js';
import { aiChat } from '../utils/aiHelper.js';

export async function getSuggestions(req, res, next) {
  try {
    const userId = req.user.id;

    const [appsRes, scoreRes, interviewsRes] = await Promise.all([
      query(
        `
          SELECT COUNT(*)::int AS stale
          FROM applications
          WHERE user_id = $1
            AND created_at < NOW() - INTERVAL '7 days'
            AND current_status IN ('applied', 'interview', 'interviewing')
        `,
        [userId],
      ).catch((e) => (e?.code === '42P01' ? { rows: [{ stale: 0 }] } : Promise.reject(e))),
      query(
        `
          SELECT full_name, email
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [userId],
      ),
      query(
        `
          SELECT COUNT(*)::int AS weekly
          FROM interview_sessions
          WHERE user_id = $1
            AND created_at >= NOW() - INTERVAL '7 days'
        `,
        [userId],
      ).catch((e) => (e?.code === '42P01' ? { rows: [{ weekly: 0 }] } : Promise.reject(e))),
    ]);

    const staleApps = Number(appsRes.rows?.[0]?.stale || 0);
    const weeklyInterviews = Number(interviewsRes.rows?.[0]?.weekly || 0);
    const name = String(scoreRes.rows?.[0]?.full_name || 'there').split(' ')[0];
    const profileScore = Math.max(35, Math.min(95, 55 + Math.min(staleApps, 5) * 3 + (weeklyInterviews > 0 ? 10 : 0)));

    const suggestions = [];
    if (staleApps > 0) {
      suggestions.push({
        title: 'Follow up on older applications',
        body: `You have ${staleApps} application${staleApps === 1 ? '' : 's'} older than 7 days. A quick follow-up can increase response rate.`,
        action: 'Follow up now',
        route: '/dashboard/job-tracker',
      });
    }
    if (profileScore < 80) {
      suggestions.push({
        title: 'Improve your resume strength',
        body: `${name}, your profile quality is below 80. Tightening achievements and keywords can boost your match score.`,
        action: 'Fix resume',
        route: '/dashboard/score-resume',
      });
    }
    if (weeklyInterviews === 0) {
      suggestions.push({
        title: 'Practice before your next interview',
        body: 'No interview practice detected this week. Run one mock interview to sharpen answers and confidence.',
        action: 'Practice now',
        route: '/dashboard/mock-interviews',
      });
    }

    let finalSuggestions = suggestions.slice(0, 2);

    // AI polish (Gemini first, Groq fallback via aiChat) while preserving strict JSON format.
    if (finalSuggestions.length > 0) {
      try {
        const aiOut = await aiChat(
          [
            {
              role: 'system',
              content:
                'You are a job-search copilot. Rewrite the provided suggestions to be clear, concise, and actionable. Keep routes and actions valid. Return ONLY valid JSON: {"suggestions":[{"title":"","body":"","action":"","route":""}]}',
            },
            {
              role: 'user',
              content: JSON.stringify({ suggestions: finalSuggestions }),
            },
          ],
          { response_format: { type: 'json_object' }, temperature: 0.35, max_tokens: 600 },
        );
        const parsed = JSON.parse(String(aiOut || '{}'));
        if (Array.isArray(parsed?.suggestions) && parsed.suggestions.length > 0) {
          finalSuggestions = parsed.suggestions
            .map((s) => ({
              title: String(s?.title || '').trim(),
              body: String(s?.body || '').trim(),
              action: String(s?.action || '').trim(),
              route: String(s?.route || '').trim(),
            }))
            .filter((s) => s.title && s.body && s.action && s.route)
            .slice(0, 2);
        }
      } catch {
        // keep deterministic fallback suggestions
      }
    }

    if (finalSuggestions.length === 0) {
      finalSuggestions = [
        {
          title: 'Keep your momentum strong',
          body: 'You are on track this week. Add one new lead today to keep your pipeline healthy.',
          action: 'Add job',
          route: '/dashboard/job-tracker',
        },
      ];
    }

    res.json({ suggestions: finalSuggestions });
  } catch (err) {
    next(err);
  }
}
