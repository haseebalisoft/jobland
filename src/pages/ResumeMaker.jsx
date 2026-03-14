import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Download, Layout, User, Briefcase, GraduationCap,
    BrainCircuit, ChevronDown, ChevronRight, Loader2, Check,
    Mail, Phone, MapPin, Camera, Pencil, MoreVertical,
    RotateCcw, RotateCw, Type, Palette, MoveVertical,
    Grid, Sparkles, Trash2, Globe, Github, Linkedin,
    Award, Settings, Share2, Layers, Zap, Eye, Sliders, ExternalLink,
    RefreshCw, FileText, Minus, Plus, LayoutDashboard, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import debounce from 'lodash.debounce';

const emptyProfile = () => ({
    personal: { fullName: '', email: '', phone: '', location: '' },
    professional: { currentTitle: '', summary: '', skills: [], workExperience: [] },
    education: [],
    links: { linkedin: '', github: '', portfolio: '' }
});

function normalizeProfile(data) {
    if (!data) return emptyProfile();
    return {
        personal: { ...emptyProfile().personal, ...(data.personal || {}) },
        professional: {
            ...emptyProfile().professional,
            ...(data.professional || {}),
            skills: Array.isArray(data.professional?.skills) ? data.professional.skills : [],
            workExperience: Array.isArray(data.professional?.workExperience) ? data.professional.workExperience : []
        },
        education: Array.isArray(data.education) ? data.education : [],
        links: { ...emptyProfile().links, ...(data.links || {}) }
    };
}

import './ResumeMaker.css';
import UserSidebar from '../components/UserSidebar.jsx';

const theme = {
    primary: '#0d9488',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    slate: '#0f172a',
    slateLight: '#1e293b',
    bg: '#f0fdfa',
    cardBg: '#ffffff',
    border: '#ccfbf1',
    text: '#0f172a',
    textMuted: '#64748b',
};

const ResumeMaker = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('classic');
    const [activeTab, setActiveTab] = useState('Content');
    const [contentSection, setContentSection] = useState('Basic Info');
    const [expandedSection, setExpandedSection] = useState('Profile');
    const [activeView, setActiveView] = useState('PDF');
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('Saved ✓');
    const [zoom, setZoom] = useState(0.8);

    // AI Tools State
    const [jd, setJd] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedData, setAnalyzedData] = useState(null);
    const [interviewQuestions, setInterviewQuestions] = useState([]);

    // Customization Settings
    const [customization, setCustomization] = useState({
        fontFamily: "'Inter', sans-serif",
        headingFont: "'Outfit', sans-serif",
        primaryColor: "#4F46E5",
        lineHeight: 1.5,
        sectionGap: 24,
        showIcons: true,
        showProfilePic: false,
        compactMode: false,
        fontWeight: 400,
        pageMargin: 20,
        sideMargin: 25,
        borderRadius: 4
    });

    const saveProfile = async (updatedProfile) => {
        setSaveStatus('Saving...');
        try {
            await api.post('/cv/profile', updatedProfile);
            setSaveStatus('Saved ✓');
        } catch (err) {
            console.error('Save failed:', err);
            setSaveStatus('Error saving');
        }
    };

    const debouncedSave = React.useMemo(
        () => debounce((data) => saveProfile(data), 2000),
        []
    );

    const refreshPreview = async (currentProfile = profile) => {
        if (!currentProfile) return;
        setPreviewLoading(true);
        try {
            const response = await api.post('/cv/download', { profile: currentProfile }, { responseType: 'blob' });
            if (previewUrl) window.URL.revokeObjectURL(previewUrl);
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            setPreviewUrl(url);
        } catch (err) {
            console.error('Preview sync failed:', err);
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!profile) return;
        const timer = setTimeout(refreshPreview, 1000);
        return () => clearTimeout(timer);
    }, [profile, selectedTemplate, customization]);

    const fetchData = async () => {
        try {
            const [profileRes, templatesRes] = await Promise.all([
                api.get('/cv/profile'),
                api.get('/cv/templates')
            ]);
            setProfile(normalizeProfile(profileRes.data));
            setTemplates(templatesRes.data || []);
            setLoading(false);
        } catch (err) {
            console.error('Fetch error:', err);
            setProfile(emptyProfile());
            setTemplates([{ id: 'classic', name: 'Classic' }, { id: 'modern', name: 'Modern' }]);
            setLoading(false);
        }
    };

    const handleAIImproveSummary = async () => {
        setSaveStatus('AI Enhancing...');
        try {
            const res = await api.post('/cv/improve-summary', {
                summary: profile.professional.summary,
                role: profile.professional.currentTitle
            });
            if (res.data.improved) {
                updateProfile('professional', 'summary', res.data.improved);
            }
        } catch (err) {
            console.error('AI Summary Error:', err);
        }
    };

    const handleAIImproveExperience = async (index) => {
        setSaveStatus('AI Enhancing...');
        try {
            const res = await api.post('/cv/optimize-experience', {
                description: profile.professional.workExperience[index].description,
                role: profile.professional.workExperience[index].role
            });
            if (res.data.optimized) {
                updateProfile('experience', 'description', res.data.optimized, index);
            }
        } catch (err) {
            console.error('AI Experience Error:', err);
        }
    };

    const handleAnalyzeJD = async () => {
        if (!jd) return alert("Please paste a Job Description first.");
        setIsAnalyzing(true);
        setSaveStatus('Optimizing Full Resume...');
        try {
            const res = await api.post('/cv/optimize-full-resume', { profile, jd });
            setAnalyzedData(res.data);
            setSaveStatus('Optimization Ready ✓');
        } catch (err) {
            console.error('Full Optimization Error:', err);
            alert(err.response?.data?.error || "Analysis failed. Check GROQ_API_KEY in backend.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApplyAnalysis = () => {
        if (!analyzedData || !analyzedData.optimizedProfile) return;

        const newProfile = analyzedData.optimizedProfile;
        setProfile(newProfile);
        setAnalyzedData(null);
        refreshPreview(newProfile);
        saveProfile(newProfile);
        alert("Success! Your resume has been completely transformed and optimized.");
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const response = await api.post('/cv/download', { profile }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Resume_${(profile.personal?.fullName || 'Resume').replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Download error:', err);
            alert('Failed to generate PDF.');
        } finally {
            setDownloading(false);
        }
    };

    const updateProfile = (section, field, value, index = null) => {
        const newProfile = { ...profile };
        if (index !== null) {
            if (section === 'experience') newProfile.professional.workExperience[index][field] = value;
            else if (section === 'education') newProfile.education[index][field] = value;
            else if (section === 'professional') {
                if (Array.isArray(newProfile.professional[field])) {
                    newProfile.professional[field][index] = value;
                }
            }
        } else {
            if (section === 'personal') newProfile.personal = { ...newProfile.personal, [field]: value };
            else if (section === 'professional') newProfile.professional = { ...newProfile.professional, [field]: value };
            else if (section === 'links') newProfile.links = { ...newProfile.links, [field]: value };
        }
        setProfile(newProfile);
        debouncedSave(newProfile);
    };

    if (loading) {
        return (
            <div className="rb-scope" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <Loader2 className="animate-spin" style={{ color: '#4f46e5' }} size={48} />
            </div>
        );
    }

    // If profile failed to load (e.g. 401), avoid crashing and show a friendly message
    if (!profile) {
        return (
            <div className="rb-scope" style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '1rem', color: '#475569' }}>
                    We couldn&apos;t load your profile for the Resume Maker.
                </p>
                <button
                    onClick={() => navigate('/login')}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '999px',
                        border: 'none',
                        background: '#4f46e5',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Go to login
                </button>
            </div>
        );
    }

    const needsProfile = profile && (
        (profile.education?.length === 0 && (profile.professional?.workExperience?.length ?? 0) === 0)
    );

    return (
        <div className="rb-scope" style={{ background: theme.bg }}>
            <UserSidebar />
            <div className="rb-main-content">
                    {/* Top bar: tabs + template + download */}
                    <header className="rb-header" style={{ padding: '0.8rem 1.5rem', background: theme.cardBg, borderBottom: `1px solid ${theme.border}` }}>
                        <nav className="rb-nav-tabs mobile-scroll-x" style={{ gap: '0.25rem', background: theme.bg, padding: '4px', borderRadius: '12px', display: 'flex' }}>
                            {[
                                { id: 'Content', icon: <FileText size={14} />, label: 'Content' },
                                { id: 'Templates', icon: <Grid size={14} />, label: 'Templates' },
                                { id: 'Customize', icon: <Sliders size={14} />, label: 'Customize' },
                                { id: 'AI Tools', icon: <Sparkles size={14} />, label: 'AI Sync' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`rb-nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px',
                                        background: activeTab === tab.id ? 'white' : 'transparent',
                                        color: activeTab === tab.id ? theme.primary : theme.textMuted,
                                        border: 'none', fontWeight: 700, fontSize: '13px',
                                        boxShadow: activeTab === tab.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', flexShrink: 0
                                    }}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'white', fontWeight: 600, fontSize: '13px' }}
                            >
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <button onClick={handleDownload} disabled={downloading} className="rb-btn-primary" style={{ padding: '8px 20px', borderRadius: '8px', background: theme.slate, display: 'flex', alignItems: 'center', gap: '8px', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                                {downloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                                Download
                            </button>
                        </div>
                    </header>

                    {(profile?.education?.length === 0 || (profile?.professional?.workExperience?.length ?? 0) === 0) && (
                        <div style={{ padding: '12px 24px', background: 'linear-gradient(90deg, rgba(13,148,136,0.12) 0%, rgba(6,182,212,0.08) 100%)', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                            <span style={{ fontSize: 14, color: theme.text, fontWeight: 500 }}>
                                Add education and work experience in Profile so your resume stays in sync.
                            </span>
                            <a href="/profile" style={{ padding: '8px 16px', borderRadius: 8, background: theme.primary, color: 'white', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                                Go to Profile
                            </a>
                        </div>
                    )}

            <main className="rb-main mobile-main-fix" style={{ flex: 1 }}>
                {/* --- LEFT PANEL: EDITOR SIDEBAR --- */}
                <aside className={`rb-sidebar ${activeView === 'Editor' ? 'active' : 'mobile-hide'}`}>
                    <div className="rb-sidebar-scroll">
                    <AnimatePresence mode="wait">
                        {activeTab === 'Content' && (
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Section tabs: Basic Info, Summary, Work Exp, Education, Skills */}
                                <div className="rb-content-section-tabs">
                                    {['Basic Info', 'Summary', 'Work Experience', 'Education', 'Skills'].map((section) => (
                                        <button
                                            key={section}
                                            type="button"
                                            onClick={() => setContentSection(section)}
                                            className={contentSection === section ? 'active' : ''}
                                        >
                                            {section}
                                        </button>
                                    ))}
                                </div>

                                {contentSection === 'Basic Info' && (
                                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', margin: 0 }}>Basic Info</h3>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                            <User size={16} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <EditorField label="Full Name" value={profile.personal.fullName} onChange={v => updateProfile('personal', 'fullName', v)} />
                                        <EditorField label="Professional Title" value={profile.professional.currentTitle} onChange={v => updateProfile('professional', 'currentTitle', v)} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <EditorField label="Email" value={profile.personal.email} onChange={v => updateProfile('personal', 'email', v)} />
                                            <EditorField label="Phone" value={profile.personal.phone} onChange={v => updateProfile('personal', 'phone', v)} />
                                        </div>
                                        <EditorField label="Location" value={profile.personal.location} onChange={v => updateProfile('personal', 'location', v)} />
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginTop: '8px', marginBottom: '4px' }}>Links</div>
                                        <EditorField label="LinkedIn" value={profile.links?.linkedin || ''} onChange={v => updateProfile('links', 'linkedin', v)} />
                                        <EditorField label="GitHub" value={profile.links?.github || ''} onChange={v => updateProfile('links', 'github', v)} />
                                        <EditorField label="Portfolio" value={profile.links?.portfolio || ''} onChange={v => updateProfile('links', 'portfolio', v)} />
                                    </div>
                                </div>
                                )}

                                {contentSection === 'Summary' && (
                                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', margin: '0 0 16px 0' }}>Professional Summary</h3>
                                    <div className="rb-summary-field" style={{ position: 'relative' }}>
                                        <EditorField label="Summary" value={profile.professional.summary} type="textarea" onChange={v => updateProfile('professional', 'summary', v)} />
                                        <button
                                            onClick={handleAIImproveSummary}
                                            style={{ position: 'absolute', top: '-30px', right: 0, background: '#fef2f2', color: '#e11d48', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                        >
                                            <Sparkles size={10} /> AI Improve
                                        </button>
                                    </div>
                                </div>
                                )}

                                {contentSection === 'Work Experience' && (
                                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', margin: '0 0 16px 0' }}>Work Experience</h3>
                                    <div style={{ marginBottom: 16, padding: 12, background: 'rgba(13,148,136,0.08)', borderRadius: 10, border: '1px solid rgba(13,148,136,0.2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <span style={{ fontSize: 13, color: theme.text }}>Keep work experience in sync with your Profile.</span>
                                        <Link to="/profile" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.primary }}>Manage in Profile →</Link>
                                    </div>
                                    {profile.professional.workExperience.map((exp, i) => (
                                        <div key={i} style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48' }}>POSITION #{i + 1}</span>
                                                <Trash2 size={14} onClick={() => { const newWork = profile.professional.workExperience.filter((_, idx) => idx !== i); updateProfile('professional', 'workExperience', newWork); }} style={{ color: '#94a3b8', cursor: 'pointer' }} />
                                            </div>
                                            <EditorField label="Company" value={exp.company} onChange={v => updateProfile('experience', 'company', v, i)} />
                                            <EditorField label="Role" value={exp.role} onChange={v => updateProfile('experience', 'role', v, i)} />
                                            <div style={{ position: 'relative' }}>
                                                <EditorField label="Description" value={exp.description} type="textarea" onChange={v => updateProfile('experience', 'description', v, i)} />
                                                <button onClick={() => handleAIImproveExperience(i)} style={{ position: 'absolute', top: '-30px', right: 0, background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                                    <Sparkles size={10} /> AI Optimize
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => { const newWork = [...profile.professional.workExperience, { company: '', role: '', period: '', description: '' }]; updateProfile('professional', 'workExperience', newWork); }} className="rb-btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'white', color: '#64748b', border: '1px dashed #cbd5e1', boxShadow: 'none' }}>
                                        <Plus size={16} /> Add Experience
                                    </button>
                                </div>
                                )}

                                {contentSection === 'Education' && (
                                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', margin: '0 0 16px 0' }}>Education</h3>
                                    <div style={{ marginBottom: 16, padding: 12, background: 'rgba(13,148,136,0.08)', borderRadius: 10, border: '1px solid rgba(13,148,136,0.2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <span style={{ fontSize: 13, color: theme.text }}>Keep education in sync with your Profile.</span>
                                        <Link to="/profile" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.primary }}>Manage in Profile →</Link>
                                    </div>
                                    {(profile.education || []).map((edu, i) => (
                                        <div key={i} style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0d9488' }}>ENTRY #{i + 1}</span>
                                                <Trash2 size={14} onClick={() => { const newEdu = (profile.education || []).filter((_, idx) => idx !== i); setProfile({ ...profile, education: newEdu }); saveProfile({ ...profile, education: newEdu }); }} style={{ color: '#94a3b8', cursor: 'pointer' }} />
                                            </div>
                                            <EditorField label="Degree" value={edu.degree} onChange={v => updateProfile('education', 'degree', v, i)} />
                                            <EditorField label="Institution" value={edu.institution} onChange={v => updateProfile('education', 'institution', v, i)} />
                                            <EditorField label="Period / Year" value={edu.period || edu.year || ''} onChange={v => updateProfile('education', 'period', v, i)} />
                                        </div>
                                    ))}
                                    <button onClick={() => { const newEdu = [...(profile.education || []), { degree: '', institution: '', year: '', period: '' }]; setProfile({ ...profile, education: newEdu }); saveProfile({ ...profile, education: newEdu }); }} className="rb-btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'white', color: '#64748b', border: '1px dashed #cbd5e1', boxShadow: 'none' }}>
                                        <Plus size={16} /> Add Education
                                    </button>
                                </div>
                                )}

                                {contentSection === 'Skills' && (
                                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', margin: '0 0 16px 0' }}>Skills & Expertise</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                        {profile.professional.skills.map((skill, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                                                {skill}
                                                <button onClick={() => { const newSkills = profile.professional.skills.filter((_, idx) => idx !== i); updateProfile('professional', 'skills', newSkills); }} style={{ border: 'none', background: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer' }}>×</button>
                                            </div>
                                        ))}
                                        <input
                                            className="rb-input"
                                            style={{ padding: '6px 12px', width: '120px', fontSize: '13px' }}
                                            placeholder="+ Add Skill"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                    const newSkills = [...profile.professional.skills, e.target.value.trim()];
                                                    updateProfile('professional', 'skills', newSkills);
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                )}

                            </motion.div>
                        )}

                        {activeTab === 'Templates' && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    {templates.map(tpl => (
                                        <div
                                            key={tpl.id}
                                            className={`rb-template-card ${selectedTemplate === tpl.id ? 'active' : ''}`}
                                            onClick={() => setSelectedTemplate(tpl.id)}
                                            style={{
                                                cursor: 'pointer',
                                                border: selectedTemplate === tpl.id ? '2px solid var(--rb-primary)' : '1px solid #e2e8f0',
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                                transition: '0.2s',
                                                background: selectedTemplate === tpl.id ? 'var(--rb-indigo-light)' : 'white'
                                            }}
                                        >
                                            <div style={{ aspectRatio: '3/4', background: '#f8fafc', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileText size={40} style={{ color: '#cbd5e1' }} />
                                                <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', right: '0.75rem', background: 'white', padding: '0.5rem', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center' }}>
                                                    {tpl.name}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'Customize' && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="rb-field">
                                    <label className="rb-label">Primary Color</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {['#0d9488', '#14b8a6', '#0F172A', '#E11D48', '#D97706'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setCustomization({ ...customization, primaryColor: c })}
                                                style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: customization.primaryColor === c ? '3px solid white' : 'none', boxShadow: '0 0 0 2px var(--rb-slate-200)', cursor: 'pointer' }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="rb-field">
                                    <label className="rb-label">Font Family</label>
                                    <select
                                        className="rb-input"
                                        value={customization.fontFamily}
                                        onChange={e => setCustomization({ ...customization, fontFamily: e.target.value })}
                                    >
                                        <option value="'Inter', sans-serif">Inter (Modern)</option>
                                        <option value="'Georgia', serif">Georgia (Classic)</option>
                                        <option value="'Roboto', sans-serif">Roboto (Clean)</option>
                                    </select>
                                </div>

                                <CustomSlider label="Font Weight" value={customization.fontWeight} min={300} max={900} step={100} onChange={v => setCustomization({ ...customization, fontWeight: v })} />
                                <CustomSlider label="Line Height" value={customization.lineHeight} min={1} max={2.5} step={0.1} onChange={v => setCustomization({ ...customization, lineHeight: v })} />
                                <CustomSlider label="Section Spacing" value={customization.sectionGap} min={10} max={60} step={2} onChange={v => setCustomization({ ...customization, sectionGap: v })} />
                                <CustomSlider label="Page Margins" value={customization.pageMargin} min={5} max={40} step={1} onChange={v => setCustomization({ ...customization, pageMargin: v })} />
                                <CustomSlider label="Side Margins" value={customization.sideMargin} min={10} max={50} step={1} onChange={v => setCustomization({ ...customization, sideMargin: v })} />

                                <ToggleSwitch label="Show Icons" active={customization.showIcons} onToggle={() => setCustomization({ ...customization, showIcons: !customization.showIcons })} />
                                <ToggleSwitch label="Compact Mode" active={customization.compactMode} onToggle={() => setCustomization({ ...customization, compactMode: !customization.compactMode })} />
                            </motion.div>
                        )}

                        {activeTab === 'AI Tools' && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0d9488 100%)', borderRadius: '20px', color: 'white', border: '1px solid rgba(13, 148, 136, 0.3)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={20} style={{ color: '#5eead4' }} /> AI Job Analyzer
                                    </h4>
                                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', marginBottom: '1rem' }}>Paste the Job Description below to identify skill gaps and generate interview questions.</p>
                                    <textarea
                                        className="rb-textarea"
                                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(13, 148, 136, 0.4)', color: 'white' }}
                                        placeholder="Paste JD here..."
                                        value={jd}
                                        onChange={e => setJd(e.target.value)}
                                    />
                                    <button
                                        onClick={handleAnalyzeJD}
                                        disabled={isAnalyzing}
                                        className="rb-btn-primary"
                                        style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
                                    >
                                        {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                                        {isAnalyzing ? 'Analyzing...' : 'Analyze for Job'}
                                    </button>
                                </div>

                                {analyzedData && analyzedData.gapAnalysis && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="orion-card" style={{ padding: '1.5rem', border: '1px solid var(--rb-indigo-light)', background: 'white' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <h5 style={{ fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', margin: 0 }}>Optimization Review</h5>
                                            <div style={{ padding: '4px 12px', background: '#F0FDF4', color: '#166534', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>
                                                {analyzedData.gapAnalysis.alignmentScore}% Match
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--rb-primary)' }}>{analyzedData.gapAnalysis.matchedKeywords?.length || 0}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--rb-slate-500)', fontWeight: 700, textTransform: 'uppercase' }}>Matched Keywords</div>
                                            </div>
                                            <div style={{ padding: '16px', background: '#fff1f2', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#e11d48' }}>{analyzedData.gapAnalysis.missingKeywords?.length || 0}</div>
                                                <div style={{ fontSize: '10px', color: '#e11d48', fontWeight: 700, textTransform: 'uppercase' }}>Missing Skills</div>
                                            </div>
                                        </div>

                                        {analyzedData.gapAnalysis.matchedKeywords?.length > 0 && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--rb-slate-400)', textTransform: 'uppercase', marginBottom: '8px' }}>Existing Strengths</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                    {analyzedData.gapAnalysis.matchedKeywords.map((s, i) => (
                                                        <span key={i} style={{ padding: '4px 8px', background: '#f1f5f9', color: '#475569', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {analyzedData.gapAnalysis.missingKeywords?.length > 0 && (
                                            <div style={{ marginBottom: '20px' }}>
                                                <div style={{ fontSize: '10px', fontWeight: 900, color: '#e11d48', textTransform: 'uppercase', marginBottom: '8px' }}>Keywords to Integrate</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                    {analyzedData.gapAnalysis.missingKeywords.map((s, i) => (
                                                        <span key={i} style={{ padding: '4px 8px', background: '#fff1f2', color: '#e11d48', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>+ {s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {analyzedData.gapAnalysis.analysis && (
                                            <div style={{ marginBottom: '20px', padding: '12px', background: '#6366f110', borderLeft: '3px solid #6366f1', borderRadius: '0 8px 8px 0' }}>
                                                <div style={{ fontSize: '10px', fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '4px' }}>Expert Analysis</div>
                                                <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: '1.5' }}>{analyzedData.gapAnalysis.analysis}</div>
                                            </div>
                                        )}

                                        <p style={{ fontSize: '0.75rem', color: 'var(--rb-slate-600)', marginBottom: '1.5rem', fontWeight: 500, lineHeight: '1.4' }}>
                                            The AI has prepared an optimized version of your CV with these keywords naturally integrated into your summary and experience.
                                        </p>

                                        <button onClick={handleApplyAnalysis} className="rb-btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.8rem', justifyContent: 'center' }}>
                                            Apply Full Optimization
                                        </button>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    </div>
                </aside>

                {/* --- RIGHT PANEL: LIVE RESUME PREVIEW --- */}
                <section className={`rb-preview-section ${activeView === 'PDF' ? 'active' : 'mobile-hide'}`}>
                    <div className="rb-preview-workspace">
                        <div className="rb-pdf-document">
                            {previewLoading && (
                                <div style={{ position: 'absolute', top: '24px', right: '24px', background: 'white', padding: '10px 20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10, border: '1px solid #eef2ff' }}>
                                    <Loader2 className="animate-spin text-accent" size={16} />
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--rb-primary)' }}>Live Sync Active</span>
                                </div>
                            )}

                            {previewUrl ? (
                                <iframe
                                    key={previewUrl}
                                    src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 'none' }}
                                    title="Resume Review"
                                />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'white' }}>
                                    <Loader2 className="animate-spin" size={40} style={{ color: '#4f46e5' }} />
                                    <p style={{ fontWeight: 800, color: '#1e293b' }}>Generating Real Template...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ height: '60px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f1f5f9', padding: '6px', borderRadius: '100px' }}>
                            <button onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}><Minus size={14} /></button>
                            <span style={{ fontSize: '12px', fontWeight: 800, minWidth: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(Math.min(1.2, zoom + 0.1))} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}><Plus size={14} /></button>
                        </div>
                    </div>
                </section>
            </main>

            {/* Mobile Navigation Bar */}
            <div className="mobile-only-dock">
                <button
                    onClick={() => setActiveView('Editor')}
                    className={activeView === 'Editor' ? 'active' : ''}
                >
                    <Sliders size={20} />
                    <span>Edit</span>
                </button>
                <button
                    onClick={() => setActiveView('PDF')}
                    className={activeView === 'PDF' ? 'active' : ''}
                >
                    <Eye size={20} />
                    <span>Preview</span>
                </button>
                <button onClick={handleDownload} disabled={downloading}>
                    {downloading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                    <span>Download</span>
                </button>
            </div>
            </div>
        </div>
    );
};

const AccordionItem = ({ title, icon, children, isOpen, onClick }) => (
    <div className={`rb-accordion-item ${isOpen ? 'active' : ''}`}>
        <button className="rb-accordion-header" onClick={onClick}>
            <div className="rb-accordion-title">
                <div className="rb-accordion-icon">{icon}</div>
                {title}
            </div>
            <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
        </button>
        {isOpen && <div className="rb-accordion-content animate-slide-down">{children}</div>}
    </div>
);

const EditorField = ({ label, value, onChange, type = "text" }) => (
    <div className="rb-field">
        <label className="rb-label">{label}</label>
        {type === "textarea" ? (
            <textarea className="rb-textarea" value={value} onChange={e => onChange(e.target.value)} />
        ) : (
            <input className="rb-input" type="text" value={value} onChange={e => onChange(e.target.value)} />
        )}
    </div>
);

const CustomSlider = ({ label, value, min, max, step, onChange }) => (
    <div className="rb-field">
        <label className="rb-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            {label} <span>{value}</span>
        </label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--rb-primary)' }}
        />
    </div>
);

const ToggleSwitch = ({ label, active, onToggle }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span className="rb-label" style={{ margin: 0 }}>{label}</span>
        <button
            onClick={onToggle}
            style={{
                width: '40px',
                height: '20px',
                borderRadius: '100px',
                background: active ? 'var(--rb-primary)' : 'var(--rb-slate-200)',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: '0.3s'
            }}
        >
            <div style={{
                width: '14px',
                height: '14px',
                background: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '3px',
                left: active ? '23px' : '3px',
                transition: '0.3s'
            }} />
        </button>
    </div>
);

export default ResumeMaker;
