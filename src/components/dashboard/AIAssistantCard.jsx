import { Link } from 'react-router-dom';

export default function AIAssistantCard({ suggestions = [] }) {
  return (
    <section className="dash-card dash-card--ai">
      <h3>AI Assistant</h3>
      <div className="ai-list">
        {suggestions.slice(0, 2).map((item) => (
          <article key={item.title} className="ai-item">
            <h4>{item.title}</h4>
            <p>{item.body}</p>
            <Link to={item.route || '/dashboard'}>{item.action || 'Open'}</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
