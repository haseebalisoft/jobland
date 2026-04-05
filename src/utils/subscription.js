export function isFreePlanUser(user) {
  return String(user?.subscription_plan || 'free').toLowerCase() === 'free';
}

/**
 * When `VITE_BYPASS_PAYWALL=true`, free-tier accounts are treated like paid for **UI routes and locks**
 * (PaidRoute, sidebar locks, resume download, etc.). Use for local testing only.
 * Plan labels in Settings still use {@link isFreePlanUser}.
 */
export function isPaywallBypassEnabled() {
  return import.meta.env.VITE_BYPASS_PAYWALL === 'true';
}

/** True if free-tier gating should apply (upgrade prompts, locked nav, paid routes). */
export function isPaywallBlocking(user) {
  if (isPaywallBypassEnabled()) return false;
  return isFreePlanUser(user);
}
