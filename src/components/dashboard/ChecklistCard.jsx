export default function ChecklistCard({ tasks = [] }) {
  return (
    <section className="dash-card">
      <h3>Today's Checklist</h3>
      <div className="checklist">
        {tasks.map((task) => (
          <div key={task.id} className="check-item">
            <span className={`check-dot ${task.done ? 'done' : ''}`} />
            <div>
              <p className={task.done ? 'done' : ''}>{task.text}</p>
              <small>{task.sub}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
