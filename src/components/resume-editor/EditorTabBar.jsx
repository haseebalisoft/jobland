import { LayoutList, Sparkles, Palette } from 'lucide-react';

const TABS = [
  { id: 'content', label: 'Resume Content', icon: LayoutList },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles },
  { id: 'design', label: 'Design', icon: Palette },
];

export default function EditorTabBar({ active, onChange }) {
  return (
    <div className="re-tabs" role="tablist">
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`re-tab${isActive ? ' active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
