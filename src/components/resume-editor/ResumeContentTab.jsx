import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import EditorField from './EditorField.jsx';

const FIXED_KEYS = ['personal', 'links', 'summary'];

const DRAG_KEYS = ['work', 'skills', 'projects', 'awards', 'education', 'certifications'];

function SortableRow({ id, title, expanded, onToggle, children, hasHandle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <button
        type="button"
        className={`re-section-row${isDragging ? ' dragging' : ''}`}
        onClick={onToggle}
      >
        {hasHandle ? (
          <span className="re-section-row__handle" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
            <GripVertical size={18} />
          </span>
        ) : (
          <span style={{ width: 26 }} />
        )}
        <span className="re-section-row__title">{title}</span>
        {expanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
      </button>
      {expanded && <div className="re-section-body">{children}</div>}
    </div>
  );
}

export default function ResumeContentTab({
  profile,
  updateProfile,
  patchProfessional,
  patchEducation,
  expandedId,
  setExpandedId,
  dragOrder,
  onDragOrderChange,
  workExpIndex,
  setWorkExpIndex,
  educationIndex,
  setEducationIndex,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const order = useMemo(() => dragOrder.filter((k) => DRAG_KEYS.includes(k)), [dragOrder]);

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id);
    const newIndex = order.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onDragOrderChange(arrayMove(order, oldIndex, newIndex));
  };

  const toggle = (id) => setExpandedId(expandedId === id ? null : id);

  const personalOpen = expandedId === 'personal';
  const linksOpen = expandedId === 'links';
  const summaryOpen = expandedId === 'summary';

  return (
    <div className="re-left-scroll">
      <button type="button" className="re-section-row" onClick={() => toggle('personal')}>
        <span className="re-section-row__title re-section-row__title--pi">Personal Information</span>
        {personalOpen ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
      </button>
      {personalOpen && (
        <div className="re-section-body">
          <EditorField label="Full Name" value={profile.personal?.fullName} onChange={(v) => updateProfile('personal', 'fullName', v)} />
          <EditorField label="Professional Title" value={profile.professional?.currentTitle} onChange={(v) => updateProfile('professional', 'currentTitle', v)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <EditorField label="Email" value={profile.personal?.email} onChange={(v) => updateProfile('personal', 'email', v)} />
            <EditorField label="Phone" value={profile.personal?.phone} onChange={(v) => updateProfile('personal', 'phone', v)} />
          </div>
        </div>
      )}

      <button type="button" className="re-section-row re-section-row--topline" onClick={() => toggle('links')}>
        <span className="re-section-row__title">Website & Social Links</span>
        {linksOpen ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
      </button>
      {linksOpen && (
        <div className="re-section-body">
          <EditorField label="LinkedIn" value={profile.links?.linkedin || ''} onChange={(v) => updateProfile('links', 'linkedin', v)} />
          <EditorField label="GitHub" value={profile.links?.github || ''} onChange={(v) => updateProfile('links', 'github', v)} />
          <EditorField label="Portfolio" value={profile.links?.portfolio || ''} onChange={(v) => updateProfile('links', 'portfolio', v)} />
        </div>
      )}

      <button type="button" className="re-section-row re-section-row--topline" onClick={() => toggle('summary')}>
        <span className="re-section-row__title">Professional Summaries</span>
        {summaryOpen ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
      </button>
      {summaryOpen && (
        <div className="re-section-body">
          <EditorField label="Summary" type="textarea" rows={6} value={profile.professional?.summary} onChange={(v) => updateProfile('professional', 'summary', v)} />
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((key) => {
            if (key === 'work') {
              return (
                <SortableRow
                  key="work"
                  id="work"
                  title="Work Experience"
                  expanded={expandedId === 'work'}
                  onToggle={() => toggle('work')}
                  hasHandle
                >
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                    Keep in sync with Profile.{' '}
                    <Link to="/profile" className="re-inline-link">
                      Manage in Profile
                    </Link>
                  </p>
                  {(() => {
                    const work = profile.professional?.workExperience || [];
                    const i = Math.min(workExpIndex, Math.max(0, work.length - 1));
                    if (work.length === 0) {
                      return (
                        <button
                          type="button"
                          className="re-add-link"
                          onClick={() => {
                            patchProfessional('workExperience', [{ company: '', role: '', period: '', description: '' }]);
                            setWorkExpIndex(0);
                          }}
                        >
                          <Plus size={16} /> Add experience
                        </button>
                      );
                    }
                    const exp = work[i];
                    return (
                      <>
                        <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>
                              {i + 1} / {work.length}
                            </span>
                            <button
                              type="button"
                              aria-label="Delete"
                              onClick={() => {
                                const nw = work.filter((_, idx) => idx !== i);
                                patchProfessional('workExperience', nw);
                                setWorkExpIndex(Math.max(0, Math.min(i, nw.length - 1)));
                              }}
                            >
                              <Trash2 size={16} color="#94a3b8" />
                            </button>
                          </div>
                          <EditorField label="Company" value={exp.company} onChange={(v) => updateProfile('experience', 'company', v, i)} />
                          <EditorField label="Role" value={exp.role} onChange={(v) => updateProfile('experience', 'role', v, i)} />
                          <EditorField label="Period" value={exp.period || ''} onChange={(v) => updateProfile('experience', 'period', v, i)} />
                          <EditorField label="Description" type="textarea" value={exp.description} onChange={(v) => updateProfile('experience', 'description', v, i)} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                          <button type="button" className="re-btn-outline" disabled={i === 0} onClick={() => setWorkExpIndex((x) => Math.max(0, x - 1))}>
                            <ChevronLeft size={16} /> Prev
                          </button>
                          <button
                            type="button"
                            className="re-btn-outline"
                            disabled={i >= work.length - 1}
                            onClick={() => setWorkExpIndex((x) => Math.min(work.length - 1, x + 1))}
                          >
                            Next <ChevronRight size={16} />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="re-add-link"
                          onClick={() => {
                            const nw = [...work, { company: '', role: '', period: '', description: '' }];
                            patchProfessional('workExperience', nw);
                            setWorkExpIndex(nw.length - 1);
                          }}
                        >
                          <Plus size={16} /> Add another
                        </button>
                      </>
                    );
                  })()}
                </SortableRow>
              );
            }
            if (key === 'skills') {
              return (
                <SortableRow key="skills" id="skills" title="Skills & Interests" expanded={expandedId === 'skills'} onToggle={() => toggle('skills')} hasHandle>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(profile.professional?.skills || []).map((skill, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {skill}
                        <button
                          type="button"
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                          onClick={() => {
                            const ns = profile.professional.skills.filter((_, j) => j !== idx);
                            patchProfessional('skills', ns);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <input
                      className="re-input"
                      style={{ maxWidth: 160 }}
                      placeholder="+ Add skill"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const ns = [...(profile.professional?.skills || []), e.target.value.trim()];
                          patchProfessional('skills', ns);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </SortableRow>
              );
            }
            if (key === 'projects') {
              const list = profile.professional?.projects || [];
              return (
                <SortableRow key="projects" id="projects" title="Projects" expanded={expandedId === 'projects'} onToggle={() => toggle('projects')} hasHandle>
                  {list.map((proj, idx) => (
                    <div key={idx} style={{ marginBottom: 12, padding: 12, border: '1px solid #e2e8f0', borderRadius: 10 }}>
                      <EditorField label="Project name" value={proj.name || ''} onChange={(v) => {
                        const next = [...list];
                        next[idx] = { ...next[idx], name: v };
                        patchProfessional('projects', next);
                      }} />
                      <EditorField label="Description" type="textarea" value={proj.description || ''} onChange={(v) => {
                        const next = [...list];
                        next[idx] = { ...next[idx], description: v };
                        patchProfessional('projects', next);
                      }} />
                    </div>
                  ))}
                  <button type="button" className="re-add-link" onClick={() => patchProfessional('projects', [...list, { name: '', description: '' }])}>
                    <Plus size={16} /> Add another
                  </button>
                </SortableRow>
              );
            }
            if (key === 'awards') {
              const list = profile.professional?.awards || [];
              return (
                <SortableRow key="awards" id="awards" title="Awards & Achievements" expanded={expandedId === 'awards'} onToggle={() => toggle('awards')} hasHandle>
                  {list.map((a, idx) => (
                    <div key={idx} style={{ marginBottom: 12 }}>
                      <EditorField label="Title" value={a.title || ''} onChange={(v) => {
                        const next = [...list];
                        next[idx] = { ...next[idx], title: v };
                        patchProfessional('awards', next);
                      }} />
                      <EditorField label="Detail" type="textarea" value={a.detail || ''} onChange={(v) => {
                        const next = [...list];
                        next[idx] = { ...next[idx], detail: v };
                        patchProfessional('awards', next);
                      }} />
                    </div>
                  ))}
                  <button type="button" className="re-add-link" onClick={() => patchProfessional('awards', [...list, { title: '', detail: '' }])}>
                    <Plus size={16} /> Add another
                  </button>
                </SortableRow>
              );
            }
            if (key === 'education') {
              return (
                <SortableRow key="education" id="education" title="Education" expanded={expandedId === 'education'} onToggle={() => toggle('education')} hasHandle>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                    <Link to="/profile" className="re-inline-link">
                      Manage in Profile
                    </Link>
                  </p>
                  {(() => {
                    const eduList = profile.education || [];
                    const j = Math.min(educationIndex, Math.max(0, eduList.length - 1));
                    if (eduList.length === 0) {
                      return (
                        <button
                          type="button"
                          className="re-add-link"
                          onClick={() => {
                            patchEducation([{ degree: '', institution: '', period: '' }]);
                            setEducationIndex(0);
                          }}
                        >
                          <Plus size={16} /> Add education
                        </button>
                      );
                    }
                    const edu = eduList[j];
                    return (
                      <>
                        <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <EditorField label="Degree" value={edu.degree} onChange={(v) => updateProfile('education', 'degree', v, j)} />
                          <EditorField label="Institution" value={edu.institution} onChange={(v) => updateProfile('education', 'institution', v, j)} />
                          <EditorField label="Period / Year" value={edu.period || edu.year || ''} onChange={(v) => updateProfile('education', 'period', v, j)} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                          <button type="button" className="re-btn-outline" disabled={j === 0} onClick={() => setEducationIndex((x) => Math.max(0, x - 1))}>
                            <ChevronLeft size={16} /> Prev
                          </button>
                          <button
                            type="button"
                            className="re-btn-outline"
                            disabled={j >= eduList.length - 1}
                            onClick={() => setEducationIndex((x) => Math.min(eduList.length - 1, x + 1))}
                          >
                            Next <ChevronRight size={16} />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="re-add-link"
                          onClick={() => {
                            const ne = [...eduList, { degree: '', institution: '', period: '' }];
                            patchEducation(ne);
                            setEducationIndex(ne.length - 1);
                          }}
                        >
                          <Plus size={16} /> Add another
                        </button>
                      </>
                    );
                  })()}
                </SortableRow>
              );
            }
            if (key === 'certifications') {
              const list = profile.professional?.certifications || [];
              return (
                <SortableRow
                  key="certifications"
                  id="certifications"
                  title="Certifications"
                  expanded={expandedId === 'certifications'}
                  onToggle={() => toggle('certifications')}
                  hasHandle
                >
                  {list.map((c, idx) => (
                    <div key={idx} style={{ marginBottom: 12 }}>
                      <EditorField label="Name" value={c.name || ''} onChange={(v) => {
                        const next = [...list];
                        next[idx] = { ...next[idx], name: v };
                        patchProfessional('certifications', next);
                      }} />
                      <EditorField label="Issuer / Year" value={c.detail || ''} onChange={(v) => {
                        const next = [...list];
                        next[idx] = { ...next[idx], detail: v };
                        patchProfessional('certifications', next);
                      }} />
                    </div>
                  ))}
                  <button type="button" className="re-add-link" onClick={() => patchProfessional('certifications', [...list, { name: '', detail: '' }])}>
                    <Plus size={16} /> Add another
                  </button>
                </SortableRow>
              );
            }
            return null;
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}
