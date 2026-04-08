const toneClass = {
  purple: 'analytics-card--purple',
  green: 'analytics-card--green',
  mid: 'analytics-card--mid',
  amber: 'analytics-card--amber',
};

function Sparkline({ values = [] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="sparkline">
      {values.map((v, idx) => (
        <span key={`${idx}-${v}`} style={{ height: `${Math.max(6, (v / max) * 42)}px` }} />
      ))}
    </div>
  );
}

export default function AnalyticsGrid({ stats }) {
  const cards = [
    { key: 'totalLeads', label: 'Total Leads', tone: 'purple', delta: stats?.weeklyChanges?.leads ?? 0, spark: stats?.sparklines?.leads || [] },
    { key: 'totalApplied', label: 'Total Applied', tone: 'green', delta: stats?.weeklyChanges?.applied ?? 0, spark: stats?.sparklines?.applied || [] },
    { key: 'interviewsDone', label: 'Interviews Done', tone: 'mid', delta: stats?.weeklyChanges?.interviews ?? 0, spark: stats?.sparklines?.interviews || [] },
    { key: 'pendingResponse', label: 'Pending Response', tone: 'amber', delta: stats?.weeklyChanges?.pending ?? 0, spark: stats?.sparklines?.pending || [] },
  ];

  return (
    <section className="analytics-grid">
      {cards.map((card) => (
        <article key={card.key} className={`analytics-card ${toneClass[card.tone]}`}>
          <div className="analytics-stripe" />
          <h3>{card.label}</h3>
          <strong>{stats?.[card.key] ?? 0}</strong>
          <Sparkline values={card.spark} />
          <p>{card.key === 'pendingResponse' ? 'Awaiting replies' : `+${card.delta} this week`}</p>
        </article>
      ))}
    </section>
  );
}
