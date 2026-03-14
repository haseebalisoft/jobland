import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2, Circle, ExternalLink, Loader2, Save,
    User as UserIcon, Briefcase, GraduationCap,
    Link as LinkIcon, LogOut, ChevronRight, Check, Pencil, Plus, Trash2
} from 'lucide-react';
import API from '../api';
import debounce from 'lodash.debounce';

const ProfileBuilder = () => {
    const [resumes, setResumes] = useState({ base: {}, customized: [] });
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        personal: { fullName: '', email: '', phone: '', location: '' },
        professional: { summary: '', skills: [], workExperience: [] },
        education: [],
        links: { linkedin: '', github: '', portfolio: '' }
    });
    const [status, setStatus] = useState({ completionPercent: 0 });
    const [activeTab, setActiveTab] = useState('Personal');
    const [showModal, setShowModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [editingSection, setEditingSection] = useState(null);
    const [autoApplyConfig, setAutoApplyConfig] = useState({
        site: 'indeed',
        jobTitle: '',
        location: '',
        maxJobs: 10,
        autoFill: true,
        autoSubmitApplication: false,
        autoSavePortal: true
    });

    const tabs = ['Personal', 'Education', 'Work Experience', 'Skills', 'Equal Employment', 'Resume'];

    const getProfilePreferredJobTitle = useCallback(() => {
        const currentTitle = profile?.professional?.currentTitle?.trim();
        if (currentTitle) return currentTitle;

        const workRole = profile?.professional?.workExperience?.[0]?.role?.trim();
        if (workRole) return workRole;

        const summary = profile?.professional?.summary?.trim();
        if (summary) {
            // Keep this short for search query defaults
            return summary.split(/[,.]/)[0].slice(0, 60).trim();
        }

        const topSkill = profile?.professional?.skills?.[0]?.trim();
        if (topSkill) return topSkill;

        return '';
    }, [profile]);

    useEffect(() => {
        fetchProfile();
    }, []);

    // Seed auto-apply defaults from profile once it's loaded
    useEffect(() => {
        const preferredTitle = getProfilePreferredJobTitle();
        setAutoApplyConfig(prev => ({
            ...prev,
            jobTitle: prev.jobTitle?.trim() || preferredTitle,
            location: prev.location || profile?.personal?.location || ''
        }));
    }, [profile, getProfilePreferredJobTitle]);

    const fetchProfile = async () => {
        try {
            const { data } = await API.get('/profile');
            if (data.profile) {
                setProfile(data.profile);
                setResumes(data.resumes || { base: {}, customized: [] });
            } else {
                setProfile(data);
            }
            updateStatus();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const generateBaseCV = async () => {
        setSaving(true);
        try {
            const { data } = await API.post('/cv/generate-base');
            setResumes(data.resumes);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // ... existing status and save logic ...

    const renderResumeTab = () => (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '12px' }}>Resume Management</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '15px' }}>
                    Your LinkedIn profile data is automatically compiled into a high-conversion LaTeX resume.
                </p>
            </div>

            {/* Base CV Card */}
            <div className="orion-card" style={{ padding: '32px', marginBottom: '40px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: resumes.base?.latex ? 'var(--accent)' : '#94a3b8' }}></div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: resumes.base?.latex ? 'var(--accent)' : '#64748b' }}>
                                {resumes.base?.latex ? 'Base CV Locked' : 'Not Generated'}
                            </span>
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>Professional Base CV</h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
                            Last synchronized: {resumes.base?.lastGenerated ? new Date(resumes.base.lastGenerated).toLocaleDateString() : 'Never'}
                        </p>
                    </div>
                    <button
                        className="btn-next"
                        style={{ padding: '8px 24px', fontSize: '14px' }}
                        onClick={() => navigate('/resume-maker')}
                    >
                        Open Resume Maker
                    </button>
                </div>

                {resumes.base?.latex && (
                    <div style={{ marginTop: '24px', padding: '16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '150px', overflow: 'hidden', position: 'relative' }}>
                        <pre style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{resumes.base.latex}</pre>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(transparent, white)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '8px' }}>
                            <button style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>View LaTeX Source</button>
                        </div>
                    </div>
                )}
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px' }}>Customized CVs</h2>
            {resumes.customized && resumes.customized.length > 0 ? (
                <div className="selection-grid" style={{ gap: '20px' }}>
                    {resumes.customized.map((cv, i) => (
                        <div key={i} className="orion-card" style={{ padding: '24px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>{cv.company}</div>
                            <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>{cv.jobTitle}</h4>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <ExternalLink size={14} /> Preview
                                </button>
                                <button style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Download</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: '40px', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: '12px', color: 'var(--text-dim)' }}>
                    <p>No customized resumes yet. HiredLogics will generate these for you during the application flow.</p>
                </div>
            )}
        </div>
    );

    const updateStatus = async () => {
        try {
            const { data } = await API.get('/profile/status');
            setStatus(data);
        } catch (err) {
            console.error(err);
        }
    };

    const saveChanges = async (updatedProfile = profile) => {
        setSaving(true);
        try {
            await API.put('/profile', updatedProfile);
            updateStatus();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const debouncedSave = useCallback(
        debounce((updatedProfile) => saveChanges(updatedProfile), 2000),
        []
    );

    const handleChange = (section, field, value, index = null) => {
        const newProfile = { ...profile };
        if (index !== null && section && Array.isArray(newProfile[section])) {
            newProfile[section][index][field] = value;
        } else if (index !== null && section === 'professional.workExperience') {
            newProfile.professional.workExperience[index][field] = value;
        } else if (section) {
            const keys = section.split('.');
            if (keys.length === 2) {
                newProfile[keys[0]][keys[1]][field] = value;
            } else {
                newProfile[section][field] = value;
            }
        } else {
            newProfile[field] = value;
        }
        setProfile(newProfile);
        debouncedSave(newProfile);
    };

    const removeItem = (section, index) => {
        const newProfile = { ...profile };
        if (section === 'education') {
            newProfile.education = newProfile.education.filter((_, i) => i !== index);
        } else if (section === 'professional.workExperience') {
            newProfile.professional.workExperience = newProfile.professional.workExperience.filter((_, i) => i !== index);
        }
        setProfile(newProfile);
        setEditingSection(null);
        debouncedSave(newProfile);
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center text-text-dim">
            <Loader2 className="animate-spin mb-4 text-accent" size={32} />
            <p className="font-medium">Syncing your profile...</p>
        </div>
    );

    const TimelineItem = ({ title, subtitle, period, description, onEdit, isFirst, isLast }) => (
        <div style={{ position: 'relative', paddingLeft: '40px', paddingBottom: '32px' }}>
            {/* Timeline Line */}
            <div style={{
                position: 'absolute',
                left: '7px',
                top: '24px',
                bottom: isLast ? 'auto' : '0',
                width: '2px',
                background: 'var(--accent)',
                opacity: 0.2,
                height: isLast ? '0' : '100%'
            }} />
            {/* Timeline Node */}
            <div style={{
                position: 'absolute',
                left: '0',
                top: '4px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '3px solid var(--accent)',
                background: 'white',
                zIndex: 2,
                boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.1)'
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    {period && <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: '500' }}>{period}</div>}
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{title}</h3>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-dim)' }}>{subtitle}</div>
                </div>
                <button
                    onClick={onEdit}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '8px' }}
                >
                    <Pencil size={18} />
                </button>
            </div>
            {description && <p style={{ marginTop: '12px', color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.6' }}>{description}</p>}
        </div>
    );

    return (
        <div className="onboarding-page" style={{ background: 'white' }}>
            <header style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                <div className="logo-area">
                    <div className="logo-icon">
                        <ChevronRight />
                    </div>
                    <div>
                        <div className="logo-text">HiredLogics</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '13px' }}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="text-accent" />}
                        {saving ? 'Saving...' : 'Syncing'}
                    </div>
                    <button className="logout-btn" onClick={() => navigate('/auth')}>
                        Logout
                    </button>
                </div>
            </header>

            {/* Tab Navigation */}
            <div style={{ borderBottom: '1px solid #f1f5f9', background: 'white', position: 'sticky', top: '0', zIndex: 10 }}>
                <div className="mobile-scroll-x" style={{ display: 'flex', gap: '32px', maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '20px 0',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: activeTab === tab ? '#000' : 'var(--text-dim)',
                                borderBottom: activeTab === tab ? '3px solid #000' : '3px solid transparent',
                                transition: 'all 0.2s ease',
                                flexShrink: 0
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <main className="container" style={{ padding: '60px 20px', maxWidth: '900px', margin: '0 auto' }}>

                {activeTab === 'Personal' && (
                    <div className="animate-fade-in" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                            {editingSection === 'personal' ? (
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <label className="orion-label">Full Name <span>*</span></label>
                                        <input
                                            className="orion-input"
                                            value={profile.personal.fullName}
                                            onChange={(e) => handleChange('personal', 'fullName', e.target.value)}
                                            placeholder="e.g. Hamza Awan"
                                            autoFocus
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label className="orion-label">Email Address <span>*</span></label>
                                            <input
                                                className="orion-input"
                                                value={profile.personal.email}
                                                onChange={(e) => handleChange('personal', 'email', e.target.value)}
                                                placeholder="e.g. name@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="orion-label">Phone Number <span>*</span></label>
                                            <input
                                                className="orion-input"
                                                value={profile.personal.phone}
                                                onChange={(e) => handleChange('personal', 'phone', e.target.value)}
                                                placeholder="e.g. +1 234 567 890"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="orion-label">Location <span>*</span></label>
                                        <input
                                            className="orion-input"
                                            value={profile.personal.location}
                                            onChange={(e) => handleChange('personal', 'location', e.target.value)}
                                            placeholder="e.g. New York, USA"
                                        />
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '10px' }}>
                                        <label className="orion-label" style={{ color: 'var(--text-dim)', marginBottom: '16px' }}>Social Links (Optional)</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    className="orion-input"
                                                    style={{ paddingLeft: '44px' }}
                                                    value={profile.links?.linkedin}
                                                    onChange={(e) => handleChange('links', 'linkedin', e.target.value)}
                                                    placeholder="LinkedIn Profile URL"
                                                />
                                                <LinkIcon size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    className="orion-input"
                                                    style={{ paddingLeft: '44px' }}
                                                    value={profile.links?.github}
                                                    onChange={(e) => handleChange('links', 'github', e.target.value)}
                                                    placeholder="GitHub Profile URL"
                                                />
                                                <LinkIcon size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    className="orion-input"
                                                    style={{ paddingLeft: '44px' }}
                                                    value={profile.links?.portfolio}
                                                    onChange={(e) => handleChange('links', 'portfolio', e.target.value)}
                                                    placeholder="Portfolio / Personal Website"
                                                />
                                                <LinkIcon size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className="btn-next"
                                        style={{ width: 'fit-content', marginTop: '12px' }}
                                        onClick={() => setEditingSection(null)}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div style={{ flex: 1 }}>
                                        <h1 style={{ fontSize: '36px', wordBreak: 'break-word', marginBottom: '16px' }}>{profile.personal.fullName || 'New Profile'}</h1>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                            <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontSize: '13px', fontWeight: '500' }}>
                                                <LinkIcon size={14} /> {profile.personal.email}
                                            </div>
                                            {profile.personal.phone && (
                                                <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontSize: '13px', fontWeight: '500' }}>
                                                    <Briefcase size={14} /> {profile.personal.phone}
                                                </div>
                                            )}
                                            {profile.personal.location && (
                                                <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontSize: '13px', fontWeight: '500' }}>
                                                    <Circle size={14} fill="currentColor" style={{ opacity: 0.2 }} /> {profile.personal.location}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setEditingSection('personal')}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '8px' }}
                                    >
                                        <Pencil size={24} />
                                    </button>
                                </>
                            )}
                        </div>

                        <div style={{ marginTop: '60px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label className="orion-label" style={{ marginBottom: 0 }}>Bio / Summary</label>
                                {editingSection !== 'summary' && (
                                    <button
                                        onClick={() => setEditingSection('summary')}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                                    >
                                        <Pencil size={18} />
                                    </button>
                                )}
                            </div>

                            {editingSection === 'summary' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <textarea
                                        className="orion-input"
                                        style={{ minHeight: '180px', background: 'white' }}
                                        value={profile.professional.summary}
                                        onChange={(e) => handleChange('professional', 'summary', e.target.value)}
                                        placeholder="Write a brief professional summary..."
                                        autoFocus
                                    />
                                    <button
                                        className="btn-next"
                                        style={{ width: 'fit-content' }}
                                        onClick={() => setEditingSection(null)}
                                    >
                                        Done
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => setEditingSection('summary')}
                                    style={{
                                        padding: '24px',
                                        background: '#f8fafc',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer',
                                        minHeight: '100px',
                                        lineHeight: '1.6',
                                        color: profile.professional.summary ? 'inherit' : 'var(--text-dim)'
                                    }}
                                >
                                    {profile.professional.summary || "Click to add a professional summary..."}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'Education' && (
                    <div className="animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
                            <h2 style={{ fontSize: '28px', fontWeight: '700' }}>Education</h2>
                            <button className="logout-btn" onClick={() => {
                                const newEdu = [...profile.education, { degree: '', institution: '', period: '' }];
                                setProfile({ ...profile, education: newEdu });
                                setEditingSection(`education-${newEdu.length - 1}`);
                            }}>
                                <Plus size={18} /> Add
                            </button>
                        </div>
                        <div style={{ paddingLeft: '8px' }}>
                            {profile.education.map((edu, i) => (
                                editingSection === `education-${i}` ? (
                                    <div key={i} className="orion-card" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--accent)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <input
                                                className="orion-input"
                                                value={edu.degree}
                                                onChange={(e) => handleChange('education', 'degree', e.target.value, i)}
                                                placeholder="Degree / Field of Study"
                                            />
                                            <input
                                                className="orion-input"
                                                value={edu.institution}
                                                onChange={(e) => handleChange('education', 'institution', e.target.value, i)}
                                                placeholder="Institution"
                                            />
                                            <input
                                                className="orion-input"
                                                value={edu.period || edu.year}
                                                onChange={(e) => handleChange('education', 'period', e.target.value, i)}
                                                placeholder="Period (e.g. 2018 - 2022)"
                                            />
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                                <button
                                                    className="btn-next"
                                                    style={{ width: 'fit-content' }}
                                                    onClick={() => setEditingSection(null)}
                                                >
                                                    Done
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Delete this education entry?')) {
                                                            removeItem('education', i);
                                                        }
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: '1px solid #ef4444',
                                                        color: '#ef4444',
                                                        padding: '12px',
                                                        borderRadius: '100px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <TimelineItem
                                        key={i}
                                        period={edu.period || edu.year}
                                        title={edu.degree}
                                        subtitle={edu.institution}
                                        isLast={i === profile.education.length - 1}
                                        onEdit={() => setEditingSection(`education-${i}`)}
                                    />
                                )
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'Work Experience' && (
                    <div className="animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
                            <h2 style={{ fontSize: '28px', fontWeight: '700' }}>Work Experience</h2>
                            <button className="logout-btn" onClick={() => {
                                const newWork = [...(profile.professional.workExperience || []), { company: '', role: '', period: '', description: '' }];
                                setProfile({ ...profile, professional: { ...profile.professional, workExperience: newWork } });
                                setEditingSection(`work-${newWork.length - 1}`);
                            }}>
                                <Plus size={18} /> Add
                            </button>
                        </div>
                        <div style={{ paddingLeft: '8px' }}>
                            {profile.professional.workExperience?.map((work, i) => (
                                editingSection === `work-${i}` ? (
                                    <div key={i} className="orion-card" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--accent)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <input
                                                className="orion-input"
                                                value={work.company}
                                                onChange={(e) => handleChange('professional.workExperience', 'company', e.target.value, i)}
                                                placeholder="Company Name"
                                            />
                                            <input
                                                className="orion-input"
                                                value={work.role}
                                                onChange={(e) => handleChange('professional.workExperience', 'role', e.target.value, i)}
                                                placeholder="Role / Title"
                                            />
                                            <input
                                                className="orion-input"
                                                value={work.period}
                                                onChange={(e) => handleChange('professional.workExperience', 'period', e.target.value, i)}
                                                placeholder="Period"
                                            />
                                            <textarea
                                                className="orion-input"
                                                style={{ minHeight: '100px' }}
                                                value={work.description}
                                                onChange={(e) => handleChange('professional.workExperience', 'description', e.target.value, i)}
                                                placeholder="Description of duties and achievements..."
                                            />
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                                <button
                                                    className="btn-next"
                                                    style={{ width: 'fit-content' }}
                                                    onClick={() => setEditingSection(null)}
                                                >
                                                    Done
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Delete this work experience?')) {
                                                            removeItem('professional.workExperience', i);
                                                        }
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: '1px solid #ef4444',
                                                        color: '#ef4444',
                                                        padding: '12px',
                                                        borderRadius: '100px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <TimelineItem
                                        key={i}
                                        period={work.period}
                                        title={work.company}
                                        subtitle={work.role}
                                        description={work.description}
                                        isLast={i === profile.professional.workExperience.length - 1}
                                        onEdit={() => setEditingSection(`work-${i}`)}
                                    />
                                )
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'Skills' && (
                    <div className="animate-fade-in">
                        <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '32px' }}>Skills</h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            {profile.professional.skills.map((skill, i) => (
                                <div key={i} style={{ padding: '8px 20px', background: '#F0FDF4', color: 'var(--accent)', borderRadius: '100px', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {skill}
                                    <span
                                        onClick={() => {
                                            const newSkills = profile.professional.skills.filter((_, index) => index !== i);
                                            handleChange('professional', 'skills', newSkills);
                                        }}
                                        style={{ cursor: 'pointer', opacity: 0.6 }}
                                    >
                                        ×
                                    </span>
                                </div>
                            ))}
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="orion-input"
                                    style={{ padding: '8px 20px', width: '200px', borderRadius: '100px', fontSize: '14px' }}
                                    placeholder="+ Add Skill"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            const newSkills = [...profile.professional.skills, e.target.value.trim()];
                                            handleChange('professional', 'skills', newSkills);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Equal Employment' && (
                    <div className="animate-fade-in">
                        <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '32px' }}>Equal Employment</h2>
                        <p style={{ color: 'var(--text-dim)' }}>Voluntary self-identification data for job applications.</p>
                        {/* Placeholder for EEO data */}
                        <div className="orion-card" style={{ marginTop: '32px', padding: '32px', border: '1px dashed var(--border)', background: '#f8fafc' }}>
                            <p style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No data yet. These fields will be auto-filled by the extension.</p>
                        </div>
                    </div>
                )}

            </main>

            {/* Bottom Finalize Bar */}
            <div style={{ position: 'fixed', bottom: '0', left: '0', right: '0', background: 'white', borderTop: '1px solid #f1f5f9', padding: '16px 20px', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
                <div style={{ maxWidth: '1200px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div
                        onClick={() => setShowStatusModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                    >
                        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent)' }}>{status.completionPercent}%</div>
                        <div className="mobile-hide" style={{ fontSize: '14px', color: 'var(--text-dim)', fontWeight: '500' }}>Profile accuracy</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="logout-btn mobile-hide" onClick={() => navigate('/resume-maker')} style={{ fontSize: '13px' }}>
                            Create Resume
                        </button>
                        <button className="btn-next" onClick={() => setShowModal(true)} style={{ padding: '12px 20px', fontSize: '13px' }}>
                            Auto-Apply to Jobs
                        </button>
                    </div>
                </div>
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="orion-card" style={{ maxWidth: '520px', width: '100%', padding: '32px 32px 28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '22px', fontWeight: '700' }}>Auto‑Apply Settings</h2>
                            <button
                                className="logout-btn"
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                                onClick={() => setShowModal(false)}
                            >
                                Close
                            </button>
                        </div>

                        <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                            Configure how many jobs to open and how the extensions should help you apply.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label className="orion-label">Target role</label>
                                <input
                                    type="text"
                                    className="orion-input"
                                    placeholder="e.g. Data Engineer"
                                    value={autoApplyConfig.jobTitle}
                                    onChange={(e) =>
                                        setAutoApplyConfig(prev => ({ ...prev, jobTitle: e.target.value }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="orion-label">Location (optional)</label>
                                <input
                                    type="text"
                                    className="orion-input"
                                    placeholder="e.g. New York, NY or Remote"
                                    value={autoApplyConfig.location}
                                    onChange={(e) =>
                                        setAutoApplyConfig(prev => ({ ...prev, location: e.target.value }))
                                    }
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label className="orion-label">Job board</label>
                                <select
                                    className="orion-input"
                                    value={autoApplyConfig.site}
                                    onChange={(e) =>
                                        setAutoApplyConfig(prev => ({ ...prev, site: e.target.value }))
                                    }
                                >
                                    <option value="indeed">Indeed.com</option>
                                </select>
                            </div>
                            <div>
                                <label className="orion-label">How many jobs to open?</label>
                                <select
                                    className="orion-input"
                                    value={autoApplyConfig.maxJobs}
                                    onChange={(e) =>
                                        setAutoApplyConfig(prev => ({ ...prev, maxJobs: Number(e.target.value) }))
                                    }
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label className="orion-label">Form filling (FormFiller)</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={autoApplyConfig.autoFill}
                                        onChange={(e) =>
                                            setAutoApplyConfig(prev => ({ ...prev, autoFill: e.target.checked }))
                                        }
                                    />
                                    Let extension auto‑fill application forms
                                </label>
                            </div>
                            <div>
                                <label className="orion-label">Application submission</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={autoApplyConfig.autoSubmitApplication}
                                        onChange={(e) =>
                                            setAutoApplyConfig(prev => ({ ...prev, autoSubmitApplication: e.target.checked }))
                                        }
                                    />
                                    Auto‑click final Submit button for me
                                </label>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label className="orion-label">Save applied jobs to portal (OneClicky)</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={autoApplyConfig.autoSavePortal}
                                    onChange={(e) =>
                                        setAutoApplyConfig(prev => ({ ...prev, autoSavePortal: e.target.checked }))
                                    }
                                />
                                Create a record in your Job Tracker for each application
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                className="logout-btn"
                                style={{ justifyContent: 'center' }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Clear any stored config to prevent auto-start
                                    localStorage.removeItem('orionAutoApplyConfig');
                                    // Send cancel message to extensions
                                    window.postMessage({
                                        source: 'ORION_WEB',
                                        type: 'ORION_AUTO_APPLY_CANCEL',
                                        payload: {}
                                    }, '*');
                                    setShowModal(false);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-next"
                                onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    // Disable button to prevent double-clicks
                                    e.target.disabled = true;
                                    e.target.textContent = 'Starting...';
                                    
                                    try {
                                        // Step 1: Get extension token
                                        const { data } = await API.post('/extension/token');
                                        const resolvedJobTitle = autoApplyConfig.jobTitle?.trim() || getProfilePreferredJobTitle();
                                        const resolvedLocation = autoApplyConfig.location?.trim() || profile?.personal?.location || '';

                                        const config = {
                                            ...autoApplyConfig,
                                            jobTitle: resolvedJobTitle,
                                            location: resolvedLocation,
                                            extensionToken: data.token
                                        };
                                        
                                        console.log('[Hiredlogic Web] Starting auto-apply workflow with config:', config);
                                        
                                        // Step 2: Broadcast to all open windows (extensions listening)
                                        window.postMessage({
                                            source: 'ORION_WEB',
                                            type: 'ORION_AUTO_APPLY_CONFIG',
                                            payload: config
                                        }, '*');

                                        // Step 3: Store in localStorage as backup
                                        localStorage.setItem('orionAutoApplyConfig', JSON.stringify({
                                            ...config,
                                            timestamp: Date.now()
                                        }));

                                        // Step 4: Prepare Indeed URL
                                        const title = resolvedJobTitle;
                                        const location = resolvedLocation;
                                        const q = encodeURIComponent(title);
                                        const loc = location ? `&l=${encodeURIComponent(location)}` : '';
                                        const indeedUrl = `https://www.indeed.com/jobs?q=${q}${loc}`;

                                        // Step 5: Open Indeed tab
                                        console.log('[Hiredlogic Web] Opening Indeed search:', indeedUrl);
                                        window.open(indeedUrl, '_blank');
                                        
                                        // Step 6: Show success message
                                        alert(`✅ Auto-apply started!\n\nJob Finder will automatically click Apply buttons on Indeed.\nFormFiller will auto-fill forms when job pages open.\n\nCheck the Indeed tab that just opened!`);
                                        
                                        setShowModal(false);
                                    } catch (err) {
                                        console.error('[Hiredlogic Web] Auto-apply error:', err);
                                        alert(`❌ Could not start auto-apply.\n\nError: ${err.message}\n\nPlease ensure:\n1. You are logged in\n2. Extensions are installed and enabled\n3. Backend server is running`);
                                        
                                        // Re-enable button on error
                                        e.target.disabled = false;
                                        e.target.textContent = 'Start Auto‑Apply';
                                    }
                                }}
                                disabled={!autoApplyConfig.jobTitle}
                            >
                                Start Auto‑Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showStatusModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="orion-card" style={{ maxWidth: '480px', padding: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '24px' }}>Profile Completion</h2>
                            <button
                                onClick={() => setShowStatusModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-dim)' }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent)' }}>{status.completionPercent}%</div>
                                <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${status.completionPercent}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.5s ease' }}></div>
                                </div>
                            </div>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
                                A complete profile increases your chances of getting noticed by recruiters.
                            </p>
                        </div>

                        {status.missingFields?.length > 0 ? (
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ef4444', marginBottom: '16px' }}>
                                    Missing Information
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {status.missingFields.map((field, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setActiveTab(field.tab || 'Personal');
                                                setShowStatusModal(false);
                                                // If it's the summary, we can even trigger the edit mode
                                                if (field.label === 'Summary') {
                                                    setEditingSection('summary');
                                                }
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                color: 'var(--text)',
                                                fontSize: '15px',
                                                cursor: 'pointer',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                transition: 'background 0.2s'
                                            }}
                                            className="dropdown-item"
                                        >
                                            <Circle size={14} color="#ef4444" /> {field.label}
                                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: 'auto' }}>Go to {field.tab} →</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '32px', textAlign: 'center', padding: '24px', background: '#F0FDF4', borderRadius: '16px', color: 'var(--accent)' }}>
                                <CheckCircle2 size={32} style={{ marginBottom: '12px' }} />
                                <div style={{ fontWeight: '700' }}>Your profile is 100% complete!</div>
                            </div>
                        )}

                        <button
                            className="btn-next"
                            style={{ width: '100%' }}
                            onClick={() => setShowStatusModal(false)}
                        >
                            Continue Editing
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileBuilder;
