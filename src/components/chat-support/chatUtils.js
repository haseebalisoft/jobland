export function getSupportAvailabilityLine() {
  return 'Pick a lead and chat directly with your BD about that role.';
}

export function formatRelativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
}

export function firstNameFromUser(user) {
  if (!user?.name) return 'there';
  const part = String(user.name).trim().split(/\s+/)[0];
  return part || 'there';
}
