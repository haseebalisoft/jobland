import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { Upload, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UserSidebar from '../components/UserSidebar.jsx';

const Onboarding = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const navigate = useNavigate();

    const [prefs, setPrefs] = useState({
        jobFunction: '',
        jobFunctions: [],
        jobTypes: [],
        preferredLocations: [],
        preferredCity: '',
        earliestStartDate: '',
        experienceLevel: '',
        openToRemote: false,
        workAuthorisation: ''
    });

    // Fetch profile from DB on load so /onboarding shows saved data when user reloads
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/profile');
                const profile = res.data?.profile ?? null;

                if (profile) {
                    const typeReverseMap = {
                        full_time: 'Full-time',
                        contract: 'Contract',
                        part_time: 'Part-time',
                        internship: 'Internship',
                    };

                    const jobFunctionsFromDb =
                        Array.isArray(profile.job_functions) && profile.job_functions.length > 0
                            ? profile.job_functions
                            : (profile.title ? [profile.title] : []);
                    const primaryJobFunction = jobFunctionsFromDb[0] || '';

                    const jobTypesFromDb =
                        Array.isArray(profile.job_types) && profile.job_types.length > 0
                            ? profile.job_types
                                  .map((t) => typeReverseMap[t])
                                  .filter(Boolean)
                            : (profile.employment_type
                                  ? [typeReverseMap[profile.employment_type] || '']
                                  : []);

                    setPrefs(prev => ({
                        ...prev,
                        jobFunction: primaryJobFunction,
                        jobFunctions: jobFunctionsFromDb,
                        jobTypes: jobTypesFromDb,
                        preferredLocations: profile.preferred_country ? [profile.preferred_country] : [],
                        preferredCity: profile.preferred_city || '',
                        earliestStartDate: profile.earliest_start_date != null ? String(profile.earliest_start_date).slice(0, 10) : '',
                        experienceLevel: profile.experience_level || '',
                        openToRemote: profile.remote_preference === 'remote_only',
                        workAuthorisation: profile.work_authorisation || '',
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch profile for onboarding prefill', err);
            } finally {
                setProfileLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const jobTypes = ['Full-time', 'Contract', 'Part-time', 'Internship'];

    const toggleJobType = (type) => {
        setPrefs(prev => ({
            ...prev,
            jobTypes: prev.jobTypes.includes(type)
                ? prev.jobTypes.filter(t => t !== type)
                : [...prev.jobTypes, type]
        }));
    };

    const toggleJobFunction = (func) => {
        setPrefs(prev => {
            const alreadySelected = prev.jobFunctions.includes(func);
            const updated = alreadySelected
                ? prev.jobFunctions.filter(f => f !== func)
                : [...prev.jobFunctions, func];

            return {
                ...prev,
                jobFunctions: updated,
                // Keep a primary jobFunction for backend/title
                jobFunction: updated[0] || ''
            };
        });
        setSearchQuery('');
    };

    const toggleLocation = (loc) => {
        setPrefs(prev => ({
            ...prev,
            preferredLocations: prev.preferredLocations.includes(loc)
                ? prev.preferredLocations.filter(l => l !== loc)
                : [...prev.preferredLocations, loc]
        }));
    };

    const [showFunctions, setShowFunctions] = useState(false);
    const [showLocations, setShowLocations] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [locationQuery, setLocationQuery] = useState('');

    const jobFunctions = [
        'Software Engineering',
        'Backend Engineering',
        'Frontend Engineering',
        'Full-Stack Engineering',
        'Data Science',
        'Machine Learning Engineering',
        'MLOps Engineering',
        'DevOps / SRE',
        'Cloud Engineering',
        'Mobile Engineering',
        'Product Management',
        'Design & UX',
        'Data Engineering',
        'Analytics / BI',
        'Marketing',
        'Growth Marketing',
        'Sales',
        'Customer Success',
        'Finance',
        'Human Resources',
        'Talent Acquisition / Recruiting',
        'Operations',
        'Legal',
        'Project Management',
        'Program Management',
        'Business Development',
        'Hardware Engineering',
        'Security Engineering',
        'QA / Test Engineering',
    ];

    const countries = [
        "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
        "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
        "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)",
        "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
        "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini (fmr. 'Swaziland')", "Ethiopia",
        "Fiji", "Finland", "France",
        "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
        "Haiti", "Holy See", "Honduras", "Hungary",
        "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
        "Jamaica", "Japan", "Jordan",
        "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
        "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
        "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "MT", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)",
        "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
        "Oman",
        "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
        "Qatar",
        "Romania", "Russia", "Rwanda",
        "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
        "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
        "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
        "Vanuatu", "Venezuela", "Vietnam",
        "Yemen",
        "Zambia", "Zimbabwe"
    ];

    const filteredFunctions = jobFunctions.filter(f =>
        f.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredCountries = countries.filter(c =>
        c.toLowerCase().includes(locationQuery.toLowerCase())
    );

    const handleNextStep1 = async () => {
        setLoading(true);
        try {
            await api.post('/user/onboarding', prefs);
            navigate('/upload_cv');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (profileLoading) {
        return (
            <div className="onboarding-page" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
                <UserSidebar />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#64748b', fontSize: '15px' }}>Loading your preferences...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="onboarding-page" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
            <UserSidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            <main className="orion-onboarding-container" style={{ flex: 1, padding: '32px 24px' }}>
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="orion-card"
                        >
                            <h1>Hi, I'm HiredLogics, your AI Copilot for job search.</h1>
                            <p className="subheading">To get started, what type of role are you looking for?</p>

                            <div style={{ marginBottom: '32px', position: 'relative' }}>
                                <label className="orion-label">Job Functions <span>*</span></label>
                                {/* Selected functions as chips */}
                                {prefs.jobFunctions.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                        {prefs.jobFunctions.map(func => (
                                            <span
                                                key={func}
                                                onClick={() => toggleJobFunction(func)}
                                                style={{
                                                    background: 'var(--accent)',
                                                    color: 'white',
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {func}
                                                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>×</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        className="orion-input"
                                        placeholder="Search and select job functions (e.g. Software Engineer)"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setShowFunctions(true);
                                        }}
                                        onFocus={() => setShowFunctions(true)}
                                        onBlur={() => setTimeout(() => setShowFunctions(false), 150)}
                                    />

                                    {showFunctions && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '110%',
                                            left: 0,
                                            right: 0,
                                            background: 'white',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                            zIndex: 10,
                                            maxHeight: '200px',
                                            overflowY: 'auto'
                                        }}>
                                            {filteredFunctions.map(func => (
                                                <div
                                                    key={func}
                                                    style={{
                                                        padding: '12px 20px',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        background: prefs.jobFunctions.includes(func) ? '#f0f9ff' : 'transparent'
                                                    }}
                                                    className="dropdown-item"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => toggleJobFunction(func)}
                                                >
                                                    {func}
                                                    {prefs.jobFunctions.includes(func) && <Check size={14} color="var(--accent)" />}
                                                </div>
                                            ))}
                                            {filteredFunctions.length === 0 && (
                                                <div style={{ padding: '12px 20px', color: 'var(--text-dim)' }}>
                                                    No results found.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginBottom: '32px' }}>
                                <label className="orion-label">Job Type <span>*</span></label>
                                <div className="selection-grid">
                                    {jobTypes.map(type => (
                                        <div
                                            key={type}
                                            className={`selection-card ${prefs.jobTypes.includes(type) ? 'active' : ''}`}
                                            onClick={() => toggleJobType(type)}
                                        >
                                            <div className="checkbox-icon">
                                                {prefs.jobTypes.includes(type) && <Check size={14} />}
                                            </div>
                                            {type}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                                <div>
                                    <label className="orion-label">Experience Level</label>
                                    <select
                                        className="orion-input"
                                        value={prefs.experienceLevel}
                                        onChange={(e) => setPrefs({ ...prefs, experienceLevel: e.target.value })}
                                    >
                                        <option value="">Select Level</option>
                                        <option value="Internship">Internship / Student</option>
                                        <option value="Entry">Entry Level</option>
                                        <option value="Mid">Mid Level</option>
                                        <option value="Senior">Senior Level</option>
                                        <option value="Lead">Lead / Staff</option>
                                        <option value="Executive">Executive</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="orion-label">Earliest Start Date</label>
                                    <input
                                        type="date"
                                        className="orion-input"
                                        value={prefs.earliestStartDate}
                                        onChange={(e) => setPrefs({ ...prefs, earliestStartDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                                <div style={{ position: 'relative' }}>
                                    <label className="orion-label">Preferred Country</label>
                                    <div style={{ position: 'relative' }}>
                                        {prefs.preferredLocations.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                                {prefs.preferredLocations.map(loc => (
                                                    <span
                                                        key={loc}
                                                        onClick={() => toggleLocation(loc)}
                                                        style={{
                                                            background: 'var(--accent)',
                                                            color: 'white',
                                                            padding: '4px 12px',
                                                            borderRadius: '20px',
                                                            fontSize: '12px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {loc}
                                                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>×</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            className="orion-input"
                                            placeholder="Search and select countries..."
                                            value={locationQuery}
                                            onChange={(e) => {
                                                setLocationQuery(e.target.value);
                                                setShowLocations(true);
                                            }}
                                            onFocus={() => setShowLocations(true)}
                                            onBlur={() => setTimeout(() => setShowLocations(false), 200)}
                                        />
                                        {showLocations && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                background: 'white',
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-md)',
                                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                                zIndex: 10,
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                marginTop: '4px'
                                            }}>
                                                {filteredCountries.map(country => (
                                                    <div
                                                        key={country}
                                                        style={{
                                                            padding: '12px 20px',
                                                            cursor: 'pointer',
                                                            transition: 'background 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            background: prefs.preferredLocations.includes(country) ? '#f0f9ff' : 'transparent'
                                                        }}
                                                        className="dropdown-item"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                            toggleLocation(country);
                                                            setLocationQuery('');
                                                        }}
                                                    >
                                                        {country}
                                                        {prefs.preferredLocations.includes(country) && <Check size={14} color="var(--accent)" />}
                                                    </div>
                                                ))}
                                                {filteredCountries.length === 0 && (
                                                    <div style={{ padding: '12px 20px', color: 'var(--text-dim)' }}>
                                                        Country not found.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="orion-label">Preferred City</label>
                                    <input
                                        type="text"
                                        className="orion-input"
                                        placeholder="e.g. New York, London"
                                        value={prefs.preferredCity}
                                        onChange={(e) => setPrefs({ ...prefs, preferredCity: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '16px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                                        <input
                                            type="checkbox"
                                            style={{ width: '20px', height: '20px', accentColor: 'var(--accent)' }}
                                            checked={prefs.openToRemote}
                                            onChange={(e) => setPrefs({ ...prefs, openToRemote: e.target.checked })}
                                        />
                                        Open to Remote
                                    </label>
                                </div>
                            </div>

                            <div style={{ marginBottom: '40px' }}>
                                <label className="orion-label">Work Authorization</label>
                                <select
                                    className="orion-input"
                                    value={prefs.workAuthorisation}
                                    onChange={(e) => setPrefs({ ...prefs, workAuthorisation: e.target.value })}
                                >
                                    <option value="">Select status</option>
                                    <option value="citizen">US Citizen</option>
                                    <option value="greencard">US Green Card / Permanent Resident</option>
                                    <option value="requires_sponsorship">Requires H1B sponsorship</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn-next"
                                    onClick={handleNextStep1}
                                    disabled={!prefs.jobFunction || prefs.jobTypes.length === 0 || loading}
                                >
                                    {loading ? 'Saving...' : 'Next'}
                                </button>
                            </div>

                            <div className="nav-dots">
                                <div className="dot active"></div>
                                <div className="dot"></div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="orion-card"
                        >
                            <h1>One last step, let's level up your search by uploading your resume.</h1>
                            <p className="subheading">Data privacy is the top priority at Jobright.</p>

                            <div style={{
                                border: '2px dashed var(--border)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '60px',
                                textAlign: 'center',
                                margin: '40px 0',
                                background: '#F8FAFC'
                            }}>
                                <div style={{
                                    width: '120px',
                                    height: '120px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    margin: '0 auto 24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                }}>
                                    <Upload size={40} color={file ? 'var(--accent)' : 'var(--text-dim)'} />
                                </div>

                                <input
                                    type="file"
                                    id="cv-upload"
                                    hidden
                                    accept=".pdf"
                                    onChange={handleFileUpload}
                                />
                                <button
                                    className="logout-btn"
                                    style={{ margin: '0 auto', display: 'block' }}
                                    onClick={() => document.getElementById('cv-upload').click()}
                                >
                                    {file ? file.name : 'Upload Your Resume'}
                                </button>
                                <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-dim)' }}>
                                    Files should be in PDF or Word format and must not exceed 10MB in size.
                                </p>
                            </div>

                            {uploadStatus && (
                                <p style={{ color: uploadStatus.includes('Failed') ? 'red' : 'var(--accent)', textAlign: 'center', marginBottom: '16px' }}>
                                    {uploadStatus}
                                </p>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-dim)',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                    onClick={() => navigate('/profile')}
                                >
                                    I don't have a CV / Create Manually
                                </button>
                                <button
                                    className="btn-next"
                                    onClick={startMatching}
                                    disabled={!file || loading}
                                >
                                    {loading ? 'Processing...' : 'Start Matching'}
                                </button>
                            </div>

                            <div className="nav-dots">
                                <div className="dot"></div>
                                <div className="dot active"></div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
            </div>
        </div>
    );
};

export default Onboarding;
