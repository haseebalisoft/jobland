export default function EditorField({ label, value, onChange, type = 'text', rows = 4 }) {
  return (
    <div className="re-field">
      <label>{label}</label>
      {type === 'textarea' ? (
        <textarea className="re-textarea" rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="re-input" type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
