import './chat-support.css';

export default function ChatMessage({ role, content, nameLabel }) {
  const isUser = role === 'user';
  if (isUser) {
    return (
      <div className="cs-msg cs-msg--user">
        <div className="cs-msg__bubble cs-msg__bubble--user">{content}</div>
      </div>
    );
  }
  return (
    <div className="cs-msg cs-msg--ai">
      <div className="cs-msg__ai-row">
        <div className="cs-msg__avatar cs-msg__avatar--logo">
          <img src="/logo.png" alt="" />
        </div>
        <div className="cs-msg__ai-text">
          <div className="cs-msg__name">{nameLabel || 'Hirdlogic AI'}</div>
          <div className="cs-msg__bubble cs-msg__bubble--ai">{content}</div>
        </div>
      </div>
    </div>
  );
}
