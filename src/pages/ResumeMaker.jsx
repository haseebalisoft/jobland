import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation, useSearchParams, useParams } from 'react-router-dom';
import {
    Download, Layout, User, Briefcase, GraduationCap,
    BrainCircuit, ChevronDown, ChevronRight, ChevronLeft, Loader2, Check,
    Mail, Phone, Camera, Pencil, MoreVertical,
    RotateCcw, RotateCw, Type, Palette, MoveVertical,
    Grid, Sparkles, Trash2, Globe, Github, Linkedin,
    Award, Settings, Share2, Layers, Zap, Eye, Sliders, ExternalLink,
    RefreshCw, FileText, Minus, Plus, LayoutDashboard, LogOut, Upload, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import debounce from 'lodash.debounce';
import { emptyProfile, normalizeProfile } from '../utils/cvProfile.js';
import { InlineDiffText } from '../components/resume-editor/inlineDiff.jsx';
import ResumeEditorShell from '../components/resume-editor/ResumeEditorShell.jsx';
import ResumeAiDiffPanel from '../components/resume-editor/ResumeAiDiffPanel.jsx';

import './ResumeMaker.css';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import ResumeAllResumesHub from '../components/resume/ResumeAllResumesHub.jsx';
import CreateResumeModal from '../components/resume/CreateResumeModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { isPaywallBlocking } from '../utils/subscription.js';

const DEFAULT_SECTION_DRAG_ORDER = ['work', 'skills', 'projects', 'awards', 'education', 'certifications'];

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
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { resumeId: routeResumeId } = useParams();
    const prevPathnameRef = useRef(null);
    const linkedInOAuthHandledRef = useRef(false);
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('classic');
    const [activeTab, setActiveTab] = useState('Content');
    const [contentSection, setContentSection] = useState('Basic Info');
    const [workExpIndex, setWorkExpIndex] = useState(0);
    const [educationIndex, setEducationIndex] = useState(0);
    const [expandedSection, setExpandedSection] = useState('Profile');
    const [activeView, setActiveView] = useState('PDF');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('Saved ✓');
    const [savingFinalized, setSavingFinalized] = useState(false);
    const [savedResumes, setSavedResumes] = useState([]);
    const [savedResumesLoading, setSavedResumesLoading] = useState(false);
    const [uploadingSavedCv, setUploadingSavedCv] = useState(false);
    const [deletingSavedId, setDeletingSavedId] = useState(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [hubToast, setHubToast] = useState(null);

    const [resumeDisplayName, setResumeDisplayName] = useState('Resume');
    const [editorMainTab, setEditorMainTab] = useState('content');
    const [expandedSectionId, setExpandedSectionId] = useState('personal');
    const [dragOrder, setDragOrder] = useState(() => [...DEFAULT_SECTION_DRAG_ORDER]);
    const [tailorModalOpen, setTailorModalOpen] = useState(false);
    const [tailorJobTitle, setTailorJobTitle] = useState('');
    const [tailorCompany, setTailorCompany] = useState('');
    const [scorePanelOpen, setScorePanelOpen] = useState(false);
    const [breadcrumbMenuOpen, setBreadcrumbMenuOpen] = useState(false);
    const [styleSettingsOpen, setStyleSettingsOpen] = useState(true);

    // AI Tools State
    const [jd, setJd] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedData, setAnalyzedData] = useState(null);
    const [interviewQuestions, setInterviewQuestions] = useState([]);

    // Customization Settings
    const [customization, setCustomization] = useState({
        fontFamily: "'Times New Roman', Times, serif",
        headingFont: "'Outfit', sans-serif",
        primaryColor: "#111827",
        accentColor: "#111827",
        paperSize: "a4",
        fontSizePt: 11,
        marginLR: 0.39,
        marginTB: 0.39,
        lineHeight: 1.4,
        sectionGap: 24,
        showIcons: true,
        showProfilePic: false,
        compactMode: false,
        fontWeight: 400,
        pageMargin: 20,
        sideMargin: 25,
        borderRadius: 4
    });

    const customizationForApi = React.useMemo(
        () => ({
            ...customization,
            primaryColor: customization.accentColor || customization.primaryColor,
            pageMargin:
                customization.marginTB != null
                    ? Math.round(Number(customization.marginTB) * 72)
                    : customization.pageMargin,
            sideMargin:
                customization.marginLR != null
                    ? Math.round(Number(customization.marginLR) * 72)
                    : customization.sideMargin,
        }),
        [customization],
    );

    // AI diff highlights (before/after); status 'pending' until Keep / Discard
    const [aiChanges, setAiChanges] = useState([]);
    /** Full optimized profile from JD analysis — used for "Apply all" after review */
    const [pendingOptimizedProfile, setPendingOptimizedProfile] = useState(null);
    const [previewMode, setPreviewMode] = useState('pdf'); // 'pdf' | 'diff'

    const isPendingChange = (c) => (c.status || 'pending') === 'pending';

    const handleUpgradeRequired = (err) => {
        if (err?.response?.status === 403 && err?.response?.data?.code === 'UPGRADE_REQUIRED') {
            navigate('/dashboard/score-resume?upgrade=1');
            return true;
        }
        return false;
    };

    const paywallBlocks = isPaywallBlocking(user);

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
            const response = await api.post(
                '/cv/preview',
                { profile: currentProfile, customization: customizationForApi },
                { responseType: 'blob' }
            );
            if (previewUrl) window.URL.revokeObjectURL(previewUrl);
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            setPreviewUrl(url);
        } catch (err) {
            if (handleUpgradeRequired(err)) return;
            console.error('Preview sync failed:', err);
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [routeResumeId]);

    useEffect(() => {
        if (!profile) return;
        const timer = setTimeout(refreshPreview, 1000);
        return () => clearTimeout(timer);
    }, [profile, selectedTemplate, customization]);

    useEffect(() => {
        if (searchParams.get('linkedinOAuth') !== 'success' || searchParams.get('edit') !== '1') return;
        if (linkedInOAuthHandledRef.current) return;
        linkedInOAuthHandledRef.current = true;
        (async () => {
            try {
                const { data } = await api.post('/resumes/from-linkedin');
                if (data?.resumeId) {
                    navigate(`/dashboard/resume-builder/${data.resumeId}/edit`, { replace: true });
                }
            } catch (err) {
                console.error(err);
                const authUrl = err.response?.data?.authorizationUrl;
                if (authUrl) {
                    window.location.href = authUrl;
                    return;
                }
                navigate('/resume-maker', { replace: true });
            }
        })();
    }, [searchParams, navigate]);

    const fetchData = async () => {
        try {
            const [profileRes, templatesRes] = await Promise.all([
                api.get('/cv/profile'),
                api.get('/cv/templates')
            ]);
            let nextProfile = normalizeProfile(profileRes.data);
            let displayTitle = `New Resume ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;
            if (routeResumeId) {
                try {
                    const r = await api.get(`/resumes/${routeResumeId}`);
                    if (r.data?.name) displayTitle = r.data.name;
                    const snap = r.data?.extractedData;
                    if (snap && typeof snap === 'object' && snap.kind !== 'uploaded_pdf') {
                        nextProfile = normalizeProfile(snap);
                    }
                } catch (e) {
                    console.warn('Could not load saved resume for editor:', e);
                }
            }
            setResumeDisplayName(displayTitle);
            setProfile(nextProfile);
            setTemplates(templatesRes.data || []);
            setLoading(false);
        } catch (err) {
            console.error('Fetch error:', err);
            setProfile(emptyProfile());
            setTemplates([{ id: 'classic', name: 'Classic' }, { id: 'modern', name: 'Modern' }]);
            setLoading(false);
        }
    };

    const acceptAiChange = (changeId) => {
        const change = (aiChanges || []).find((c) => c.id === changeId && c.status === 'pending');
        if (!change) return;
        if (change.section === 'Summary' || change.key === 'summary') {
            updateProfile('professional', 'summary', change.after);
        } else if (change.section === 'Experience' && change.expIndex != null) {
            updateProfile('experience', 'description', change.after, change.expIndex);
        }
        setAiChanges((prev) => {
            const next = prev.filter((c) => c.id !== changeId);
            if (!next.some((c) => c.source === 'full-jd' && c.status === 'pending')) {
                setPendingOptimizedProfile(null);
                setAnalyzedData(null);
            }
            return next;
        });
    };

    const rejectAiChange = (changeId) => {
        setAiChanges((prev) => {
            const next = prev.filter((c) => c.id !== changeId);
            if (!next.some((c) => c.source === 'full-jd' && c.status === 'pending')) {
                setPendingOptimizedProfile(null);
                setAnalyzedData(null);
            }
            return next;
        });
    };

    const acceptAllPendingAiChanges = () => {
        if (!pendingOptimizedProfile) return;
        setProfile(pendingOptimizedProfile);
        saveProfile(pendingOptimizedProfile);
        refreshPreview(pendingOptimizedProfile);
        setAiChanges((prev) => prev.filter((c) => !(c.source === 'full-jd' && c.status === 'pending')));
        setPendingOptimizedProfile(null);
        setAnalyzedData(null);
        setSaveStatus('Saved ✓');
    };

    const discardAllPendingAiChanges = () => {
        setAiChanges((prev) => prev.filter((c) => !(c.status === 'pending' && c.source === 'full-jd')));
        setPendingOptimizedProfile(null);
        setAnalyzedData(null);
    };

    const handleAIImproveSummary = async () => {
        setSaveStatus('AI Enhancing...');
        try {
            const res = await api.post('/cv/improve-summary', {
                summary: profile.professional.summary,
                role: profile.professional.currentTitle
            });
            if (res.data.improved) {
                const incoming = {
                    id: `summary-${Date.now()}`,
                    section: 'Summary',
                    key: 'summary',
                    label: 'Professional summary',
                    before: profile.professional.summary || '',
                    after: res.data.improved || '',
                    status: 'pending',
                    source: 'inline',
                };
                setAiChanges((prev) => [
                    incoming,
                    ...prev.filter(
                        (c) =>
                            !(
                                c.status === 'pending' &&
                                c.source === 'inline' &&
                                (c.section === 'Summary' || c.key === 'summary')
                            ),
                    ),
                ]);
                setPreviewMode('diff');
                setActiveView('PDF');
                setSaveStatus('Review: Keep or Discard in AI diff');
            }
        } catch (err) {
            console.error('AI Summary Error:', err);
            setSaveStatus('Saved ✓');
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
                const current = profile.professional.workExperience[index];
                const incoming = {
                    id: `exp-${index}-${Date.now()}`,
                    section: 'Experience',
                    expIndex: index,
                    label: current.role || `Experience ${index + 1}`,
                    before: current.description || '',
                    after: res.data.optimized || '',
                    status: 'pending',
                    source: 'inline',
                };
                setAiChanges((prev) => [
                    incoming,
                    ...prev.filter(
                        (c) =>
                            !(
                                c.status === 'pending' &&
                                c.source === 'inline' &&
                                c.section === 'Experience' &&
                                c.expIndex === index
                            ),
                    ),
                ]);
                setPreviewMode('diff');
                setActiveView('PDF');
                setSaveStatus('Review: Keep or Discard in AI diff');
            }
        } catch (err) {
            console.error('AI Experience Error:', err);
            setSaveStatus('Saved ✓');
        }
    };

    const buildJdForOptimizeApi = () => {
        const body = (jd || '').trim();
        const title = (tailorJobTitle || '').trim();
        const company = (tailorCompany || '').trim();
        if (!title && !company) return body;
        return [title && `Job title: ${title}`, company && `Company: ${company}`, body].filter(Boolean).join('\n\n');
    };

    const handleAnalyzeJD = async () => {
        const jdPayload = buildJdForOptimizeApi();
        if (!jdPayload.trim()) return alert("Please paste a Job Description first.");
        setIsAnalyzing(true);
        setSaveStatus('Optimizing Full Resume...');
        try {
            const res = await api.post('/cv/optimize-full-resume', { profile, jd: jdPayload });
            setAnalyzedData(res.data);
            setSaveStatus('Optimization Ready ✓');
            if (res.data?.optimizedProfile) {
                handlePrepareFullOptimizationReview(res.data);
            }
            if (/^\/(dashboard\/)?resume-builder\/[^/]+\/edit$/.test(location.pathname)) {
                setEditorMainTab('ai');
            }
        } catch (err) {
            console.error('Full Optimization Error:', err);
            alert(err.response?.data?.error || "Analysis failed. Check GROQ_API_KEY in backend.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handlePrepareFullOptimizationReview = (dataOverride) => {
        const source = dataOverride ?? analyzedData;
        if (!source || !source.optimizedProfile) return;

        const newProfile = source.optimizedProfile;
        const batchId = Date.now();

        try {
            const changes = [];
            if ((profile.professional?.summary || '') !== (newProfile.professional?.summary || '')) {
                changes.push({
                    id: `full-summary-${batchId}`,
                    section: 'Summary',
                    key: 'summary',
                    label: 'Professional summary',
                    before: profile.professional?.summary || '',
                    after: newProfile.professional?.summary || '',
                    status: 'pending',
                    source: 'full-jd',
                });
            }
            const oldExp = profile.professional?.workExperience || [];
            const newExp = newProfile.professional?.workExperience || [];
            const maxLen = Math.max(oldExp.length, newExp.length);
            for (let i = 0; i < maxLen; i += 1) {
                const before = oldExp[i]?.description || '';
                const after = newExp[i]?.description || '';
                if (before !== after && (before || after)) {
                    changes.push({
                        id: `full-exp-${i}-${batchId}`,
                        section: 'Experience',
                        expIndex: i,
                        label: newExp[i]?.role || oldExp[i]?.role || `Experience ${i + 1}`,
                        before,
                        after,
                        status: 'pending',
                        source: 'full-jd',
                    });
                }
            }
            if (changes.length) {
                setPendingOptimizedProfile(newProfile);
                setAiChanges((prev) => {
                    const withoutOverlap = prev.filter((c) => {
                        if (c.status !== 'pending' || c.source !== 'inline') return true;
                        if (c.section === 'Summary' && changes.some((ch) => ch.section === 'Summary')) return false;
                        if (c.section === 'Experience') {
                            return !changes.some((ch) => ch.section === 'Experience' && ch.expIndex === c.expIndex);
                        }
                        return true;
                    });
                    const withoutOldFullJd = withoutOverlap.filter((c) => !(c.source === 'full-jd' && c.status === 'pending'));
                    return [...changes, ...withoutOldFullJd];
                });
            } else {
                setSaveStatus('No text changes to review — profile already matches.');
                return;
            }
        } catch (e) {
            console.error('Failed to compute AI diff highlights', e);
            return;
        }
        setPreviewMode('diff');
        setActiveView('PDF');
        setSaveStatus('Review changes (AI diff) — Keep or Discard each section');
    };

    const handleDownload = async () => {
        if (paywallBlocks) {
            navigate('/dashboard/score-resume?upgrade=1');
            return;
        }
        setDownloading(true);
        try {
            const response = await api.post(
                '/cv/download',
                { profile, customization: customizationForApi },
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Resume_${(profile.personal?.fullName || 'Resume').replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            if (handleUpgradeRequired(err)) return;
            console.error('Download error:', err);
            alert('Failed to generate PDF.');
        } finally {
            setDownloading(false);
        }
    };

    const fetchSavedResumes = async () => {
        setSavedResumesLoading(true);
        try {
            let res;
            try {
                res = await api.get('/cv/saved');
            } catch (err) {
                if (err?.response?.status === 404) {
                    res = await api.get('/cv/saved-resumes');
                } else {
                    throw err;
                }
            }
            setSavedResumes(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setSavedResumes([]);
        } finally {
            setSavedResumesLoading(false);
        }
    };

    useEffect(() => {
        if (location.pathname === '/resumes') {
            setActiveTab('Resumes');
            setActiveView('Editor');
        } else if (location.pathname === '/resume-maker' && prevPathnameRef.current === '/resumes') {
            setActiveTab('Content');
        }
        prevPathnameRef.current = location.pathname;
    }, [location.pathname]);

    const isResumeBuilderEditPath = /^\/(dashboard\/)?resume-builder\/[^/]+\/edit$/.test(location.pathname);
    const showResumeHub =
        !isResumeBuilderEditPath &&
        ((location.pathname === '/resume-maker' && searchParams.get('edit') !== '1') ||
            location.pathname === '/resumes');

    useEffect(() => {
        if (((activeTab === 'Saved resumes' || activeTab === 'Resumes') || location.pathname === '/resumes') && profile) {
            fetchSavedResumes();
        }
    }, [activeTab, profile, location.pathname]);

    useEffect(() => {
        if (showResumeHub) {
            fetchSavedResumes();
        }
    }, [showResumeHub]);

    const handleSaveFinalizedResume = async () => {
        if (!profile) return;
        const defaultTitle = `${profile.personal?.fullName || 'Resume'} ${new Date().toLocaleDateString()}`;
        const title = window.prompt('Name this saved resume version:', defaultTitle);
        if (!title) return;
        setSavingFinalized(true);
        try {
            await api.post('/cv/saved', { title, profile });
            window.alert('Resume version saved. Your BD can now use it.');
            await fetchSavedResumes();
        } catch (err) {
            console.error(err);
            window.alert(err.response?.data?.message || 'Failed to save resume version');
        } finally {
            setSavingFinalized(false);
        }
    };

    const handleUploadSavedCv = () => {
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        picker.onchange = async () => {
            const file = picker.files?.[0];
            if (!file) return;
            setUploadingSavedCv(true);
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('name', (file.name || 'resume').replace(/\.(pdf|docx|doc)$/i, '') || 'Resume');
                const res = await api.post('/resumes/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                await fetchSavedResumes();
                if (res.data?.resumeId) {
                    navigate(`/dashboard/resume-builder/${res.data.resumeId}/edit`);
                }
            } catch (err) {
                console.error(err);
                const msg = err.response?.data?.message || err.response?.data?.error || err.message || '';
                window.alert(msg || 'Failed to upload resume');
            } finally {
                setUploadingSavedCv(false);
            }
        };
        picker.click();
    };

    const handleOpenSavedResume = async (savedResumeId) => {
        if (!savedResumeId) return;
        try {
            let res;
            try {
                res = await api.get(`/cv/saved/${savedResumeId}/file`, { responseType: 'blob' });
            } catch (err) {
                if (err?.response?.status === 404) {
                    res = await api.get(`/cv/saved-resumes/${savedResumeId}/file`, { responseType: 'blob' });
                } else {
                    throw err;
                }
            }
            const url = window.URL.createObjectURL(res.data);
            window.open(url, '_blank', 'noopener,noreferrer');
            window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || 'Unable to open saved resume';
            window.alert(msg);
        }
    };

    const handleDeleteSavedResume = async (savedResumeId) => {
        if (!savedResumeId) return;
        if (!window.confirm('Remove this saved resume? It will no longer be available for job applications.')) return;
        setDeletingSavedId(savedResumeId);
        try {
            try {
                await api.delete(`/cv/saved/${savedResumeId}`);
            } catch (err) {
                if (err?.response?.status === 404) {
                    await api.delete(`/cv/saved-resumes/${savedResumeId}`);
                } else {
                    throw err;
                }
            }
            await fetchSavedResumes();
        } catch (err) {
            console.error(err);
            window.alert(err.response?.data?.message || 'Failed to remove resume');
        } finally {
            setDeletingSavedId(null);
        }
    };

    const handleOpenEditorView = () => {
        setIsSidebarCollapsed(false);
        setActiveView('Editor');
    };

    const handleCloseEditorPanel = () => {
        if (window.innerWidth <= 1200) {
            setActiveView('PDF');
            return;
        }
        setIsSidebarCollapsed(true);
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

    const patchProfessional = (key, val) => {
        const newProfile = { ...profile, professional: { ...profile.professional, [key]: val } };
        setProfile(newProfile);
        debouncedSave(newProfile);
    };

    const patchEducation = (education) => {
        const newProfile = { ...profile, education };
        setProfile(newProfile);
        debouncedSave(newProfile);
    };

    useEffect(() => {
        if (!routeResumeId) return;
        try {
            const raw = sessionStorage.getItem(`resume-section-order-${routeResumeId}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length) setDragOrder(parsed);
            }
        } catch {
            /* ignore */
        }
    }, [routeResumeId]);

    useEffect(() => {
        if (!routeResumeId) return;
        try {
            sessionStorage.setItem(`resume-section-order-${routeResumeId}`, JSON.stringify(dragOrder));
        } catch {
            /* ignore */
        }
    }, [dragOrder, routeResumeId]);

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

    const hubDisplayName = user?.name || '';
    const hubInitials = hubDisplayName
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U';

    if (showResumeHub) {
        return (
            <DashboardLayout userName={hubDisplayName} userInitials={hubInitials}>
                <ResumeAllResumesHub
                    savedResumes={savedResumes}
                    loading={savedResumesLoading}
                    uploading={uploadingSavedCv}
                    deletingId={deletingSavedId}
                    onCreateNew={() => setCreateModalOpen(true)}
                    onUpload={handleUploadSavedCv}
                    onOpenPdf={handleOpenSavedResume}
                    onDelete={handleDeleteSavedResume}
                    editHref={(id) => `/dashboard/resume-builder/${id}/edit`}
                />
                <CreateResumeModal
                    isOpen={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onSuccess={async (data) => {
                        if (data?.resumeId) {
                            await fetchSavedResumes();
                            navigate(`/dashboard/resume-builder/${data.resumeId}/edit`);
                        }
                    }}
                    onToast={(msg, type) => {
                        setHubToast({ msg, type });
                        window.setTimeout(() => setHubToast(null), 4000);
                    }}
                />
                {hubToast ? (
                    <div
                        role="status"
                        style={{
                            position: 'fixed',
                            bottom: 28,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 100,
                            padding: '12px 20px',
                            borderRadius: 10,
                            background: hubToast.type === 'error' ? '#fef2f2' : '#ecfdf5',
                            color: hubToast.type === 'error' ? '#991b1b' : '#065f46',
                            border: hubToast.type === 'error' ? '1px solid #fecaca' : '1px solid #a7f3d0',
                            fontWeight: 600,
                            fontSize: 14,
                            boxShadow: '0 10px 25px rgba(15,23,42,0.12)',
                        }}
                    >
                        {hubToast.msg}
                    </div>
                ) : null}
            </DashboardLayout>
        );
    }

    if (isResumeBuilderEditPath && profile) {
        const handleTailorModalSubmit = () => {
            setTailorModalOpen(false);
            handleAnalyzeJD();
        };
        return (
            <DashboardLayout
                userName={hubDisplayName}
                userInitials={hubInitials}
                hideSidebar
                mainClassName="dl-main--editor-fill"
            >
                <div className="dl-editor-page-host-outer">
                {paywallBlocks && (
                    <div
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(90deg, rgba(245,158,11,0.18) 0%, rgba(249,115,22,0.16) 100%)',
                            borderBottom: '1px solid rgba(245,158,11,0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 12,
                        }}
                    >
                        <span style={{ fontSize: 14, color: '#7c2d12', fontWeight: 600 }}>
                            Free plan: ATS tools and live preview are available. PDF download requires a paid plan.
                        </span>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/score-resume?upgrade=1')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                background: '#ea580c',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: 13,
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            Upgrade to download
                        </button>
                    </div>
                )}
                <div className="dl-editor-page-host">
                <ResumeEditorShell
                    resumeId={routeResumeId}
                    resumeTitle={resumeDisplayName}
                    setResumeTitle={setResumeDisplayName}
                    editorTab={editorMainTab}
                    setEditorTab={setEditorMainTab}
                    profile={profile}
                    previewMode={previewMode}
                    setPreviewMode={setPreviewMode}
                    previewLoading={previewLoading}
                    previewUrl={previewUrl}
                    customization={customization}
                    setCustomization={setCustomization}
                    templates={templates}
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                    updateProfile={updateProfile}
                    patchProfessional={patchProfessional}
                    patchEducation={patchEducation}
                    expandedSectionId={expandedSectionId}
                    setExpandedSectionId={setExpandedSectionId}
                    dragOrder={dragOrder}
                    onDragOrderChange={setDragOrder}
                    workExpIndex={workExpIndex}
                    setWorkExpIndex={setWorkExpIndex}
                    educationIndex={educationIndex}
                    setEducationIndex={setEducationIndex}
                    handleDownload={handleDownload}
                    downloading={downloading}
                    isFreePlanUser={paywallBlocks}
                    tailorOpen={tailorModalOpen}
                    setTailorOpen={setTailorModalOpen}
                    tailorJobTitle={tailorJobTitle}
                    setTailorJobTitle={setTailorJobTitle}
                    tailorCompany={tailorCompany}
                    setTailorCompany={setTailorCompany}
                    jd={jd}
                    setJd={setJd}
                    onTailorSubmit={handleTailorModalSubmit}
                    tailorLoading={isAnalyzing}
                    scorePanelOpen={scorePanelOpen}
                    setScorePanelOpen={setScorePanelOpen}
                    menuOpen={breadcrumbMenuOpen}
                    setMenuOpen={setBreadcrumbMenuOpen}
                    onBreadcrumbDuplicate={() => window.alert('Save a copy from All Resumes after editing.')}
                    onBreadcrumbDelete={() => navigate('/resumes')}
                    onBreadcrumbShare={() => navigator.clipboard?.writeText(window.location.href)}
                    onBreadcrumbExport={handleDownload}
                    centerDiffContent={
                        <ResumeAiDiffPanel
                            profile={profile}
                            aiChanges={aiChanges}
                            isPendingChange={isPendingChange}
                            pendingOptimizedProfile={pendingOptimizedProfile}
                            acceptAiChange={acceptAiChange}
                            rejectAiChange={rejectAiChange}
                            acceptAllPendingAiChanges={acceptAllPendingAiChanges}
                            discardAllPendingAiChanges={discardAllPendingAiChanges}
                        />
                    }
                    styleSettingsOpen={styleSettingsOpen}
                    setStyleSettingsOpen={setStyleSettingsOpen}
                />
                </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout userName={hubDisplayName} userInitials={hubInitials}>
            <div className="rb-scope" style={{ background: theme.bg }}>
            <div className="rb-main-content">
                    {paywallBlocks && (
                        <div
                            style={{
                                padding: '12px 24px',
                                background: 'linear-gradient(90deg, rgba(245,158,11,0.18) 0%, rgba(249,115,22,0.16) 100%)',
                                borderBottom: '1px solid rgba(245,158,11,0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 12,
                            }}
                        >
                            <span style={{ fontSize: 14, color: '#7c2d12', fontWeight: 600 }}>
                                Free plan: ATS tools and live preview are available. PDF download requires a paid plan.
                            </span>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/score-resume?upgrade=1')}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    background: '#ea580c',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                Upgrade to download
                            </button>
                        </div>
                    )}
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
                <aside className={`rb-sidebar ${isSidebarCollapsed ? 'rb-sidebar-collapsed' : ''} ${activeView === 'Editor' ? 'active' : 'mobile-hide'}`}>
                    <div className="rb-sidebar-header">
                        <span style={{ fontWeight: 800, fontSize: '14px', color: theme.slate }}>{activeTab}</span>
                        <button type="button" onClick={handleCloseEditorPanel} className="rb-sidebar-close" aria-label="Close panel">
                            <ChevronLeft size={20} />
                        </button>
                    </div>
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
                                    {(() => {
                                        const work = profile.professional.workExperience || [];
                                        const i = Math.min(workExpIndex, Math.max(0, work.length - 1));
                                        if (work.length === 0) {
                                            return (
                                                <button onClick={() => { const newWork = [{ company: '', role: '', period: '', description: '' }]; updateProfile('professional', 'workExperience', newWork); setWorkExpIndex(0); }} className="rb-btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'white', color: '#64748b', border: '1px dashed #cbd5e1', boxShadow: 'none' }}>
                                                    <Plus size={16} /> Add Experience
                                                </button>
                                            );
                                        }
                                        const exp = work[i];
                                        return (
                                            <>
                                                <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48' }}>POSITION {i + 1} OF {work.length}</span>
                                                        <Trash2 size={14} onClick={() => { const newWork = work.filter((_, idx) => idx !== i); updateProfile('professional', 'workExperience', newWork); setWorkExpIndex(Math.max(0, Math.min(workExpIndex, newWork.length - 1))); }} style={{ color: '#94a3b8', cursor: 'pointer' }} />
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
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, gap: 12 }}>
                                                    <button type="button" onClick={() => setWorkExpIndex(Math.max(0, i - 1))} disabled={i === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.5 : 1 }}>
                                                        <ChevronLeft size={18} /> Previous
                                                    </button>
                                                    <span style={{ fontSize: 13, color: theme.textMuted, fontWeight: 600 }}>{i + 1} / {work.length}</span>
                                                    <button type="button" onClick={() => setWorkExpIndex(Math.min(work.length - 1, i + 1))} disabled={i === work.length - 1} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', cursor: i === work.length - 1 ? 'not-allowed' : 'pointer', opacity: i === work.length - 1 ? 0.5 : 1 }}>
                                                        Next <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                                <button onClick={() => { const newWork = [...work, { company: '', role: '', period: '', description: '' }]; updateProfile('professional', 'workExperience', newWork); setWorkExpIndex(newWork.length - 1); }} className="rb-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12, background: 'white', color: '#64748b', border: '1px dashed #cbd5e1', boxShadow: 'none' }}>
                                                    <Plus size={16} /> Add Another
                                                </button>
                                            </>
                                        );
                                    })()}
                                </div>
                                )}

                                {contentSection === 'Education' && (
                                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', margin: '0 0 16px 0' }}>Education</h3>
                                    <div style={{ marginBottom: 16, padding: 12, background: 'rgba(13,148,136,0.08)', borderRadius: 10, border: '1px solid rgba(13,148,136,0.2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <span style={{ fontSize: 13, color: theme.text }}>Keep education in sync with your Profile.</span>
                                        <Link to="/profile" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.primary }}>Manage in Profile →</Link>
                                    </div>
                                    {(() => {
                                        const eduList = profile.education || [];
                                        const j = Math.min(educationIndex, Math.max(0, eduList.length - 1));
                                        if (eduList.length === 0) {
                                            return (
                                                <button onClick={() => { const newEdu = [{ degree: '', institution: '', year: '', period: '' }]; setProfile({ ...profile, education: newEdu }); saveProfile({ ...profile, education: newEdu }); setEducationIndex(0); }} className="rb-btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'white', color: '#64748b', border: '1px dashed #cbd5e1', boxShadow: 'none' }}>
                                                    <Plus size={16} /> Add Education
                                                </button>
                                            );
                                        }
                                        const edu = eduList[j];
                                        return (
                                            <>
                                                <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#0d9488' }}>ENTRY {j + 1} OF {eduList.length}</span>
                                                        <Trash2 size={14} onClick={() => { const newEdu = eduList.filter((_, idx) => idx !== j); setProfile({ ...profile, education: newEdu }); saveProfile({ ...profile, education: newEdu }); setEducationIndex(Math.max(0, Math.min(educationIndex, newEdu.length - 1))); }} style={{ color: '#94a3b8', cursor: 'pointer' }} />
                                                    </div>
                                                    <EditorField label="Degree" value={edu.degree} onChange={v => updateProfile('education', 'degree', v, j)} />
                                                    <EditorField label="Institution" value={edu.institution} onChange={v => updateProfile('education', 'institution', v, j)} />
                                                    <EditorField label="Period / Year" value={edu.period || edu.year || ''} onChange={v => updateProfile('education', 'period', v, j)} />
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, gap: 12 }}>
                                                    <button type="button" onClick={() => setEducationIndex(Math.max(0, j - 1))} disabled={j === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', cursor: j === 0 ? 'not-allowed' : 'pointer', opacity: j === 0 ? 0.5 : 1 }}>
                                                        <ChevronLeft size={18} /> Previous
                                                    </button>
                                                    <span style={{ fontSize: 13, color: theme.textMuted, fontWeight: 600 }}>{j + 1} / {eduList.length}</span>
                                                    <button type="button" onClick={() => setEducationIndex(Math.min(eduList.length - 1, j + 1))} disabled={j === eduList.length - 1} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', cursor: j === eduList.length - 1 ? 'not-allowed' : 'pointer', opacity: j === eduList.length - 1 ? 0.5 : 1 }}>
                                                        Next <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                                <button onClick={() => { const newEdu = [...eduList, { degree: '', institution: '', year: '', period: '' }]; setProfile({ ...profile, education: newEdu }); saveProfile({ ...profile, education: newEdu }); setEducationIndex(newEdu.length - 1); }} className="rb-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12, background: 'white', color: '#64748b', border: '1px dashed #cbd5e1', boxShadow: 'none' }}>
                                                    <Plus size={16} /> Add Another
                                                </button>
                                            </>
                                        );
                                    })()}
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

                        {(activeTab === 'Saved resumes' || activeTab === 'Resumes') && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ padding: '1.25rem', background: 'white', borderRadius: '16px', border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.slate }}>Saved resumes</h3>
                                    <p style={{ margin: '0 0 14px 0', fontSize: 13, color: theme.textMuted, lineHeight: 1.5 }}>
                                        Versions you save from the builder, or PDFs you upload here, are available to your BD for job applications.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleUploadSavedCv}
                                        disabled={uploadingSavedCv}
                                        className="rb-btn-primary"
                                        style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
                                    >
                                        {uploadingSavedCv ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                        {uploadingSavedCv ? 'Uploading...' : 'Upload Resume'}
                                    </button>
                                    {savedResumesLoading ? (
                                        <div style={{ padding: 16, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>Loading saved resumes…</div>
                                    ) : savedResumes.length === 0 ? (
                                        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 12, fontSize: 13, color: theme.textMuted }}>
                                            No saved versions yet. Use <strong>Save</strong> above after editing, or upload a PDF.
                                        </div>
                                    ) : (
                                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {savedResumes.map((row) => (
                                                <li
                                                    key={row.id}
                                                    style={{
                                                        padding: '10px 12px',
                                                        borderRadius: 12,
                                                        border: `1px solid ${theme.border}`,
                                                        background: '#f8fafc',
                                                        fontSize: 13,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    <div style={{ minWidth: 0, flex: '1 1 140px' }}>
                                                        <div style={{ fontWeight: 700, color: theme.text }}>{row.title || 'Untitled'}</div>
                                                        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                                                            {row.created_at ? new Date(row.created_at).toLocaleString() : ''}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenSavedResume(row.id)}
                                                            style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: '#fff', color: theme.slate, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                                        >
                                                            Open
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteSavedResume(row.id)}
                                                            disabled={deletingSavedId === row.id}
                                                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff1f2', color: '#be123c', fontSize: 12, fontWeight: 700, cursor: deletingSavedId === row.id ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                        >
                                                            {deletingSavedId === row.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                                            Remove
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'AI Tools' && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #dffaf5 0%, #ccfbf1 48%, #e2e8f0 100%)', borderRadius: '20px', color: theme.text, border: '1px solid #99f6e4' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={20} style={{ color: theme.primary }} /> AI Job Analyzer
                                    </h4>
                                    <p style={{ fontSize: '0.8rem', color: theme.textMuted, lineHeight: '1.6', marginBottom: '1rem' }}>Paste the Job Description below to identify skill gaps and generate interview questions.</p>
                                    <textarea
                                        className="rb-textarea"
                                        style={{ background: 'white', border: `1px solid ${theme.border}`, color: theme.text }}
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

                                {(aiChanges || []).filter(isPendingChange).length > 0 && (
                                    <div className="orion-card" style={{ padding: '1rem 1.25rem', border: '1px solid var(--rb-indigo-light)', background: 'white' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 900, color: '#4b5563', textTransform: 'uppercase', marginBottom: '10px' }}>
                                            Pending AI edits — use Resume / AI diff preview
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 240, overflowY: 'auto' }}>
                                            {(aiChanges || []).filter(isPendingChange).slice(0, 8).map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="rb-ai-hunk"
                                                    style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '8px 10px', fontSize: '12px' }}
                                                >
                                                    <div style={{ fontWeight: 700, fontSize: '11px', marginBottom: 6, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                        {c.section}: {c.label}
                                                    </div>
                                                    <div className="rb-ai-hunk-actions" style={{ marginBottom: 0, borderBottom: 'none', padding: 0, background: 'transparent' }}>
                                                        <button
                                                            type="button"
                                                            className="rb-ai-btn rb-ai-btn--keep"
                                                            style={{ padding: '4px 8px', fontSize: 11 }}
                                                            onClick={() => acceptAiChange(c.id)}
                                                        >
                                                            <Check size={12} /> Keep
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="rb-ai-btn rb-ai-btn--discard"
                                                            style={{ padding: '4px 8px', fontSize: 11 }}
                                                            onClick={() => rejectAiChange(c.id)}
                                                        >
                                                            <X size={12} /> Discard
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {analyzedData && analyzedData.gapAnalysis && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="orion-card" style={{ padding: '1.5rem', border: '1px solid var(--rb-indigo-light)', background: 'white' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <h5 style={{ fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', margin: 0 }}>Optimization Review</h5>
                                            <div style={{ padding: '4px 12px', background: '#ecfeff', color: '#0f766e', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: '1px solid #99f6e4' }}>
                                                {analyzedData.gapAnalysis.alignmentScore}% Match
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--rb-primary)' }}>{analyzedData.gapAnalysis.matchedKeywords?.length || 0}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--rb-slate-500)', fontWeight: 700, textTransform: 'uppercase' }}>Matched Keywords</div>
                                            </div>
                                            <div style={{ padding: '16px', background: '#fffbeb', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309' }}>{analyzedData.gapAnalysis.missingKeywords?.length || 0}</div>
                                                <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>Missing Skills</div>
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
                                                <div style={{ fontSize: '10px', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', marginBottom: '8px' }}>Keywords to Integrate</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                    {analyzedData.gapAnalysis.missingKeywords.map((s, i) => (
                                                        <span key={i} style={{ padding: '4px 8px', background: '#fffbeb', color: '#92400e', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>+ {s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {analyzedData.gapAnalysis.analysis && (
                                            <div style={{ marginBottom: '20px', padding: '12px', background: '#f0fdfa', borderLeft: '3px solid #0d9488', borderRadius: '0 8px 8px 0' }}>
                                                <div style={{ fontSize: '10px', fontWeight: 900, color: '#0f766e', textTransform: 'uppercase', marginBottom: '4px' }}>Expert Analysis</div>
                                                <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: '1.5' }}>{analyzedData.gapAnalysis.analysis}</div>
                                            </div>
                                        )}

                                        <p style={{ fontSize: '0.75rem', color: 'var(--rb-slate-600)', marginBottom: '1.5rem', fontWeight: 500, lineHeight: '1.4' }}>
                                            The AI has prepared an optimized version of your CV with these keywords naturally integrated into your summary and experience.
                                        </p>

                                        <button
                                            onClick={handlePrepareFullOptimizationReview}
                                            disabled={!!pendingOptimizedProfile}
                                            className="rb-btn-primary"
                                            style={{ width: '100%', padding: '0.75rem', fontSize: '0.8rem', justifyContent: 'center', opacity: pendingOptimizedProfile ? 0.55 : 1 }}
                                        >
                                            {pendingOptimizedProfile ? 'Review already queued — AI diff tab' : 'Review full optimization'}
                                        </button>
                                        <p style={{ fontSize: 11, color: theme.textMuted, marginTop: 8, lineHeight: 1.45 }}>
                                            Opens the AI diff view. Keep or Discard each change, or use Apply all in the preview.
                                        </p>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    </div>
                </aside>

                {/* --- RESUME VIEWPORT: full height + floating controls --- */}
                <section className={`rb-preview-section ${activeView === 'PDF' ? 'active' : 'mobile-hide'}`}>
                    <div className="rb-preview-workspace">
                        {isSidebarCollapsed && (
                            <button
                                type="button"
                                onClick={handleOpenEditorView}
                                className="rb-reopen-editor"
                                aria-label="Open editor panel"
                            >
                                <ChevronRight size={16} />
                                Edit
                            </button>
                        )}
                        <div className="rb-pdf-document">
                            {/* Preview mode toggle */}
                            <div style={{ position: 'absolute', top: '18px', left: '24px', zIndex: 6, display: 'inline-flex', padding: 2, borderRadius: 999, background: 'rgba(15,23,42,0.04)', border: '1px solid #e5e7eb' }}>
                                <button
                                    type="button"
                                    onClick={() => setPreviewMode('pdf')}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 999,
                                        border: 'none',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        background: previewMode === 'pdf' ? '#0f172a' : 'transparent',
                                        color: previewMode === 'pdf' ? '#ffffff' : '#4b5563',
                                    }}
                                >
                                    Resume
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewMode('diff')}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 999,
                                        border: 'none',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        background: previewMode === 'diff' ? '#0f172a' : 'transparent',
                                        color: previewMode === 'diff' ? '#ffffff' : '#4b5563',
                                    }}
                                >
                                    AI diff
                                </button>
                            </div>

                            {previewMode === 'pdf' ? (
                                <>
                                    {previewLoading && (
                                        <div style={{ position: 'absolute', top: '24px', right: '80px', background: 'white', padding: '10px 20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 5, border: '1px solid #eef2ff' }}>
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
                                </>
                            ) : (
                                <div style={{ height: '100%', padding: '32px 36px', overflowY: 'auto', background: 'white' }}>
                                    {pendingOptimizedProfile &&
                                        (aiChanges || []).filter((c) => isPendingChange(c) && c.source === 'full-jd').length > 0 && (
                                        <div className="rb-ai-hunk rb-ai-hunk--batch">
                                            <div className="rb-ai-hunk-actions rb-ai-hunk-actions--batch">
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Job description optimization</span>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    <button
                                                        type="button"
                                                        className="rb-ai-btn rb-ai-btn--keep"
                                                        onClick={acceptAllPendingAiChanges}
                                                    >
                                                        <Check size={14} /> Apply all changes
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="rb-ai-btn rb-ai-btn--discard"
                                                        onClick={discardAllPendingAiChanges}
                                                    >
                                                        <X size={14} /> Discard all
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Simple HTML resume header */}
                                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' }}>{profile.personal?.fullName || 'Your Name'}</h2>
                                        <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>
                                            {profile.professional?.currentTitle || ''}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                                            {[profile.personal?.email, profile.personal?.phone].filter(Boolean).join(' · ')}
                                        </div>
                                    </div>

                                    {(() => {
                                        const summaryChange = aiChanges.find(
                                            (c) => isPendingChange(c) && (c.section === 'Summary' || c.key === 'summary'),
                                        );
                                        const expPending = aiChanges.filter(
                                            (c) => isPendingChange(c) && c.section === 'Experience' && c.expIndex != null,
                                        );
                                        const expDiffByIndex = new Map();
                                        [...expPending].reverse().forEach((c) => {
                                            expDiffByIndex.set(c.expIndex, c);
                                        });

                                        const work = profile.professional?.workExperience || [];
                                        const education = profile.education || [];
                                        const skills = profile.professional?.skills || [];

                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                                {/* Professional Summary */}
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: 8 }}>
                                                        Professional Summary
                                                    </div>
                                                    {summaryChange ? (
                                                        <div className="rb-ai-hunk">
                                                            <div className="rb-ai-hunk-actions">
                                                                <button
                                                                    type="button"
                                                                    className="rb-ai-btn rb-ai-btn--keep"
                                                                    onClick={() => acceptAiChange(summaryChange.id)}
                                                                >
                                                                    <Check size={14} /> Keep
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="rb-ai-btn rb-ai-btn--discard"
                                                                    onClick={() => rejectAiChange(summaryChange.id)}
                                                                >
                                                                    <X size={14} /> Discard
                                                                </button>
                                                            </div>
                                                            <div className="rb-ai-hunk-body">
                                                                <InlineDiffText before={summaryChange.before} after={summaryChange.after} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: 12, color: '#0f172a', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                            {profile.professional?.summary || '—'}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Experience */}
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: 8 }}>
                                                        Experience
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                        {work.length === 0 ? (
                                                            <div style={{ fontSize: 12, color: '#6b7280' }}>Add work experience to view AI highlights.</div>
                                                        ) : (
                                                            work.map((w, idx) => {
                                                                const diff = expDiffByIndex.get(idx);
                                                                return (
                                                                    <div key={idx}>
                                                                        <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>
                                                                            {w.role || w.company || `Experience ${idx + 1}`}
                                                                        </div>
                                                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                                                            {[w.company, w.period].filter(Boolean).join(' • ')}
                                                                        </div>
                                                                        <div style={{ marginTop: 6, fontSize: 12, color: '#0f172a', lineHeight: 1.6 }}>
                                                                            {diff ? (
                                                                                <div className="rb-ai-hunk">
                                                                                    <div className="rb-ai-hunk-actions">
                                                                                        <button
                                                                                            type="button"
                                                                                            className="rb-ai-btn rb-ai-btn--keep"
                                                                                            onClick={() => acceptAiChange(diff.id)}
                                                                                        >
                                                                                            <Check size={14} /> Keep
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            className="rb-ai-btn rb-ai-btn--discard"
                                                                                            onClick={() => rejectAiChange(diff.id)}
                                                                                        >
                                                                                            <X size={14} /> Discard
                                                                                        </button>
                                                                                    </div>
                                                                                    <div className="rb-ai-hunk-body">
                                                                                        <InlineDiffText before={diff.before} after={diff.after} />
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <span>{w.description || ''}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Education */}
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: 8 }}>
                                                        Education
                                                    </div>
                                                    {education.length === 0 ? (
                                                        <div style={{ fontSize: 12, color: '#6b7280' }}>—</div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                            {education.map((e, i) => (
                                                                <div key={i}>
                                                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
                                                                        {e.degree || e.institution || `Education ${i + 1}`}
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                                                        {[e.institution, e.period || e.year].filter(Boolean).join(' • ')}
                                                                    </div>
                                                                    {e.description ? (
                                                                        <div style={{ fontSize: 12, color: '#0f172a', marginTop: 6, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                                            {e.description}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Skills */}
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: 8 }}>
                                                        Skills
                                                    </div>
                                                    {skills.length === 0 ? (
                                                        <div style={{ fontSize: 12, color: '#6b7280' }}>—</div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                            {skills.map((s, i) => (
                                                                <span key={i} style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: 999 }}>
                                                                    {s}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rb-floating-top-bar">
                        {/* Floating tab buttons on the left */}
                        <div className="rb-floating-tabs-left">
                            {[
                                { id: 'Content', icon: <FileText size={18} />, label: 'Content' },
                                { id: 'Templates', icon: <Grid size={18} />, label: 'Templates' },
                                { id: 'Customize', icon: <Sliders size={18} />, label: 'Customize' },
                                { id: 'Resumes', icon: <Layers size={18} />, label: 'Resumes' },
                                { id: 'AI Tools', icon: <Sparkles size={18} />, label: 'AI Sync' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); handleOpenEditorView(); }}
                                    className={`rb-floating-tab ${activeTab === tab.id ? 'active' : ''}`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Floating actions on the top right */}
                        <div className="rb-floating-actions-right">
                            <button
                                onClick={handleSaveFinalizedResume}
                                disabled={savingFinalized}
                                className="rb-floating-download"
                                style={{ background: '#0f766e' }}
                                title="Save finalized resume version"
                            >
                                {savingFinalized ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                {savingFinalized ? 'Saving...' : 'Save'}
                            </button>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                className="rb-floating-select"
                            >
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <button onClick={handleDownload} disabled={downloading || paywallBlocks} className="rb-floating-download">
                                {downloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                                {paywallBlocks ? 'Upgrade to Download' : 'Download'}
                            </button>
                        </div>
                    </div>

                    {/* Zoom control: center bottom of resume */}
                    <div className="rb-floating-zoom">
                        <button type="button" aria-label="Zoom out" disabled><Minus size={14} /></button>
                        <span>100%</span>
                        <button type="button" aria-label="Zoom in" disabled><Plus size={14} /></button>
                    </div>
                </section>
            </main>

            {/* Mobile Navigation Bar */}
            <div className="mobile-only-dock">
                <button
                    onClick={handleOpenEditorView}
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
                <button onClick={handleDownload} disabled={downloading || paywallBlocks}>
                    {downloading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                    <span>{paywallBlocks ? 'Upgrade' : 'Download'}</span>
                </button>
                <button onClick={handleSaveFinalizedResume} disabled={savingFinalized}>
                    {savingFinalized ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                    <span>{savingFinalized ? 'Saving' : 'Save'}</span>
                </button>
            </div>
            </div>
        </div>
        </DashboardLayout>
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
