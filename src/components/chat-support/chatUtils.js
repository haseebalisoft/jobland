export function getSupportAvailabilityLine() {
  const day = new Date().getDay();
  if (day === 0 || day === 6) {
    return "We'll be back online on Monday";
  }
  const h = new Date().getHours();
  if (h < 9 || h >= 17) {
    return 'Our team is offline — we typically reply on the next business day.';
  }
  return "We're online now — we usually reply within an hour.";
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
