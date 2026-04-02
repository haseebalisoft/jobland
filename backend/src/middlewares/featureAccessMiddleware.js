export function requirePaidPlan(req, res, next) {
  const plan = String(req.user?.subscription_plan || 'free').toLowerCase();
  const isPaidPlan = plan !== 'free';

  if (!isPaidPlan) {
    return res.status(403).json({
      code: 'UPGRADE_REQUIRED',
      message: 'Resume generation is available on paid plans only.',
    });
  }

  return next();
}

