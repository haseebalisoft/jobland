export async function subscriptionMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({ message: 'Email not verified' });
  }

  if (!req.user.isActive) {
    return res.status(403).json({ message: 'Subscription inactive. Please choose a plan.' });
  }

  next();
}

