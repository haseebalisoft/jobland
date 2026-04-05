import {
  Monitor,
  Handshake,
  Briefcase,
  Phone,
  Crown,
  Users,
  TrendingUp,
  FileText,
  Code,
} from 'lucide-react';

const ICON_MAP = {
  technical: { Icon: Monitor, color: '#2563eb' },
  behavioral: { Icon: Handshake, color: '#10b981' },
  negotiation: { Icon: Briefcase, color: '#8b5cf6' },
  screening: { Icon: Phone, color: '#f59e0b' },
  leadership: { Icon: Crown, color: '#eab308' },
  situational: { Icon: Users, color: '#2563eb' },
  career_dev: { Icon: TrendingUp, color: '#10b981' },
  case_study: { Icon: FileText, color: '#2563eb' },
  code: { Icon: Code, color: '#2563eb' },
  phone: { Icon: Phone, color: '#f59e0b' },
};

export function getScenarioIconMeta(iconType) {
  return ICON_MAP[iconType] || ICON_MAP.technical;
}

export function categoryBadgeStyle(category) {
  const c = String(category || '').toLowerCase();
  if (c.includes('behavior')) return { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' };
  if (c.includes('technical') || c.includes('code')) return { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' };
  if (c.includes('lead')) return { bg: '#fefce8', border: '#fde047', text: '#a16207' };
  if (c.includes('screen')) return { bg: '#fff7ed', border: '#fdba74', text: '#c2410c' };
  return { bg: '#f5f3ff', border: '#c4b5fd', text: '#6d28d9' };
}
