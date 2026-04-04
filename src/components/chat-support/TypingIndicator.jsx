import './chat-support.css';

export default function TypingIndicator() {
  return (
    <div className="cs-typing" aria-hidden>
      <span className="cs-typing__dot" />
      <span className="cs-typing__dot" />
      <span className="cs-typing__dot" />
    </div>
  );
}
