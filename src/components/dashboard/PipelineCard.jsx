const ORDER = [
  { key: 'saved', label: 'Saved', cls: 'bar--purple' },
  { key: 'applied', label: 'Applied', cls: 'bar--mid' },
  { key: 'interviewing', label: 'Interviewing', cls: 'bar--green' },
  { key: 'offer', label: 'Offer', cls: 'bar--amber' },
  { key: 'rejected', label: 'Rejected', cls: 'bar--red' },
];

export default function PipelineCard({ counts = {} }) {
  const max = Math.max(...ORDER.map((i) => counts[i.key] || 0), 1);
  return (
    <section className="dash-card">
      <h3>Application Pipeline</h3>
      <div className="pipeline">
        {ORDER.map((item) => {
          const val = Number(counts[item.key] || 0);
          return (
            <div key={item.key} className="pipeline-row">
              <div className="pipeline-head">
                <span>{item.label}</span>
                <strong>{val}</strong>
              </div>
              <div className="pipeline-track">
                <span className={`pipeline-fill ${item.cls}`} style={{ width: `${(val / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
