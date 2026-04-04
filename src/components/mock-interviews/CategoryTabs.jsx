import React, { useRef } from 'react';
import {
  LayoutGrid,
  Cpu,
  HeartHandshake,
  Scale,
  PhoneCall,
  Users,
  FolderOpen,
  Award,
  Palette,
  Rocket,
  DoorOpen,
  Factory,
} from 'lucide-react';

const TABS = [
  { id: 'All Scenario', label: 'All Scenario', Icon: LayoutGrid },
  { id: 'Technical', label: 'Technical', Icon: Cpu },
  { id: 'Behavioral', label: 'Behavioral', Icon: HeartHandshake },
  { id: 'Negotiations', label: 'Negotiations', Icon: Scale },
  { id: 'Screening', label: 'Screening', Icon: PhoneCall },
  { id: 'Situational', label: 'Situational', Icon: Users },
  { id: 'Case Studies', label: 'Case Studies', Icon: FolderOpen },
  { id: 'Leadership', label: 'Leadership', Icon: Award },
  { id: 'Cultural Fit', label: 'Cultural Fit', Icon: Palette },
  { id: 'Career Dev', label: 'Career Dev', Icon: Rocket },
  { id: 'Exit', label: 'Exit', Icon: DoorOpen },
  { id: 'Industry', label: 'Industry', Icon: Factory },
];

/** Map UI tab id → DB category label (seed uses these names) */
export function tabToCategoryFilter(tabId) {
  if (tabId === 'All Scenario') return 'All Scenario';
  if (tabId === 'Negotiations') return 'Negotiations';
  if (tabId === 'Case Studies') return 'Case Studies';
  if (tabId === 'Career Dev') return 'Career Dev';
  return tabId;
}

export default function CategoryTabs({ active, onChange }) {
  const scrollRef = useRef(null);

  return (
    <div className="mi-tabs-wrap">
      <div className="mi-tabs" ref={scrollRef}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`mi-tab${active === id ? ' mi-tab--active' : ''}`}
            onClick={() => onChange(id)}
          >
            <Icon size={16} aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
