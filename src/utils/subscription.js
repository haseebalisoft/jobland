export function isFreePlanUser(user) {
  return String(user?.subscription_plan || 'free').toLowerCase() === 'free';
}
