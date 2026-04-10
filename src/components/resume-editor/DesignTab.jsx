import { useMemo } from 'react';
import { ChevronUp } from 'lucide-react';
import { FONT_OPTIONS, paperToPx } from './editorUtils.js';

const SWATCHES = [
  { hex: '#7c3aed' },
  { hex: '#059669' },
  { hex: '#2563eb' },
  { hex: '#000000' },
  { hex: '#ec4899' },
  { hex: '#f59e0b' },
  { hex: '#dc2626' },
];

export default function DesignTab({ design, setDesign, templates, selectedTemplate, onTemplateChange, styleOpen, setStyleOpen }) {
  const paper = design?.paperSize === 'letter' ? 'letter' : 'a4';
  const dims = useMemo(() => paperToPx(paper), [paper]);
  const merge = (patch) => setDesign((d) => ({ ...d, ...patch }));

  return (
    <div className="re-left-scroll">
      <div className="re-design">
        <button type="button" className="re-design__head" onClick={() => setStyleOpen(!styleOpen)}>
          Style Settings
          <ChevronUp size={18} style={{ transform: styleOpen ? 'rotate(0)' : 'rotate(180deg)' }} />
        </button>
        {styleOpen && (
          <>
            <div className="re-field">
              <label>Template</label>
              <select className="re-select" value={selectedTemplate} onChange={(e) => onTemplateChange(e.target.value)}>
                {(templates || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="re-field">
              <label>Paper Size</label>
              <select className="re-select" value={paper} onChange={(e) => merge({ paperSize: e.target.value })}>
                <option value="a4">A4 (8.27 x 11.69 in)</option>
                <option value="letter">Letter (8.5 x 11 in)</option>
              </select>
            </div>
            <div className="re-field">
              <label>Font</label>
              <select
                className="re-select"
                value={design?.fontFamily || FONT_OPTIONS[0].value}
                onChange={(e) => merge({ fontFamily: e.target.value })}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.label} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="re-slider-row">
              <label>
                <span>Font Size</span>
                <span>{Number(design?.fontSizePt ?? 11).toFixed(1)} pt</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range"
                  min={8}
                  max={14}
                  step={0.5}
                  value={Number(design?.fontSizePt ?? 11)}
                  onChange={(e) => merge({ fontSizePt: parseFloat(e.target.value) })}
                />
                <input
                  className="re-num"
                  value={Number(design?.fontSizePt ?? 11).toFixed(1)}
                  onChange={(e) => merge({ fontSizePt: Math.min(14, Math.max(8, parseFloat(e.target.value) || 11)) })}
                />
              </div>
            </div>
            <div className="re-slider-row">
              <label>
                <span>Line Height</span>
                <span>{Number(design?.lineHeight ?? 1.125).toFixed(3)}</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range"
                  min={1}
                  max={2}
                  step={0.025}
                  value={Number(design?.lineHeight ?? 1.125)}
                  onChange={(e) => merge({ lineHeight: parseFloat(e.target.value) })}
                />
                <input
                  className="re-num"
                  value={Number(design?.lineHeight ?? 1.125).toFixed(3)}
                  onChange={(e) => merge({ lineHeight: Math.min(2, Math.max(1, parseFloat(e.target.value) || 1.125)) })}
                />
              </div>
            </div>
            <div className="re-slider-row">
              <label>
                <span>Left and Right Margins</span>
                <span>{Number(design?.marginLR ?? 0.39).toFixed(2)} in</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.01}
                  value={Number(design?.marginLR ?? 0.39)}
                  onChange={(e) => merge({ marginLR: parseFloat(e.target.value) })}
                />
                <input
                  className="re-num"
                  value={`${Number(design?.marginLR ?? 0.39).toFixed(2)} in`}
                  onChange={(e) => {
                    const n = parseFloat(String(e.target.value).replace(/in/i, '').trim());
                    if (!Number.isNaN(n)) merge({ marginLR: Math.min(1, Math.max(0.2, n)) });
                  }}
                />
              </div>
            </div>
            <div className="re-slider-row">
              <label>
                <span>Top and Bottom Margins</span>
                <span>{Number(design?.marginTB ?? 0.39).toFixed(2)} in</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.01}
                  value={Number(design?.marginTB ?? 0.39)}
                  onChange={(e) => merge({ marginTB: parseFloat(e.target.value) })}
                />
                <input
                  className="re-num"
                  value={`${Number(design?.marginTB ?? 0.39).toFixed(2)} in`}
                  onChange={(e) => {
                    const n = parseFloat(String(e.target.value).replace(/in/i, '').trim());
                    if (!Number.isNaN(n)) merge({ marginTB: Math.min(1, Math.max(0.2, n)) });
                  }}
                />
              </div>
            </div>
            <div className="re-field">
              <label>Accent Color</label>
              <div className="re-colors">
                {SWATCHES.map((s) => (
                  <button
                    key={s.hex}
                    type="button"
                    className={`re-color-swatch${design?.accentColor === s.hex ? ' selected' : ''}`}
                    style={{ background: s.hex }}
                    onClick={() => merge({ accentColor: s.hex })}
                  />
                ))}
                <label
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '1px dashed #94a3b8',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: '#64748b',
                  }}
                >
                  <input
                    type="color"
                    style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                    onChange={(e) => merge({ accentColor: e.target.value })}
                  />
                  +
                </label>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 16 }}>
              Preview: ~{dims.width}px x {dims.minHeight}px ({paper})
            </p>
          </>
        )}
      </div>
    </div>
  );
}
