import { useState, useRef } from 'react'
import {
    User, Mail, Phone, MapPin, Linkedin,
    Briefcase, Clock, Building2, Zap, Target, DollarSign,
    Upload, Settings, Globe, FileText, StickyNote,
    CheckCircle, ArrowRight, ArrowLeft
} from 'lucide-react'
import './IntakeForm.css'

const steps = [
    { label: 'Basic Info', icon: User },
    { label: 'Experience', icon: Briefcase },
    { label: 'Preferences', icon: Settings },
]

function InputField({ icon: Icon, label, type = 'text', placeholder, required, value, onChange, hint }) {
    return (
        <div className="form-field">
            <label className="form-label">
                {label} {required && <span className="form-required">*</span>}
            </label>
            <div className="form-input-wrap">
                {Icon && <Icon size={16} className="form-input-icon" />}
                <input
                    type={type}
                    className="form-input"
                    placeholder={placeholder}
                    style={Icon ? { paddingLeft: '40px' } : {}}
                    required={required}
                    value={value}
                    onChange={onChange}
                />
            </div>
            {hint && <p className="form-hint">{hint}</p>}
        </div>
    )
}

function SelectField({ icon: Icon, label, options, required, value, onChange }) {
    return (
        <div className="form-field">
            <label className="form-label">
                {label} {required && <span className="form-required">*</span>}
            </label>
            <div className="form-input-wrap">
                {Icon && <Icon size={16} className="form-input-icon" />}
                <select
                    className="form-input form-select"
                    style={Icon ? { paddingLeft: '40px' } : {}}
                    required={required}
                    value={value}
                    onChange={onChange}
                >
                    <option value="">Select...</option>
                    {options.map(o => (
                        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}

export default function IntakeForm() {
    const [step, setStep] = useState(0)
    const [submitted, setSubmitted] = useState(false)
    const [fileName, setFileName] = useState('')
    const fileRef = useRef()

    const [form, setForm] = useState({
        name: '', email: '', phone: '', location: '', linkedin: '',
        jobTitle: '', yearsExp: '', industry: '', skills: '', targetRole: '', salary: '',
        jobsPerDay: '', jobLocation: '', jobType: '', notes: '',
    })

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

    const handleFile = (e) => {
        if (e.target.files[0]) setFileName(e.target.files[0].name)
    }

    const handleNext = (e) => {
        e.preventDefault()
        if (step < 2) setStep(s => s + 1)
        else setSubmitted(true)
    }

    const renderStep = () => {
        if (step === 0) return (
            <div className="form-step form-step--active">
                <div className="form-grid-2">
                    <InputField icon={User} label="Full Name" placeholder="John Doe" required value={form.name} onChange={set('name')} />
                    <InputField icon={Mail} label="Email" type="email" placeholder="john@email.com" required value={form.email} onChange={set('email')} />
                    <InputField icon={Phone} label="Phone / WhatsApp" type="tel" placeholder="+1 234 567 890" required value={form.phone} onChange={set('phone')} />
                    <InputField icon={MapPin} label="Location" placeholder="New York, USA" required value={form.location} onChange={set('location')} />
                </div>
                <InputField icon={Linkedin} label="LinkedIn Profile" placeholder="linkedin.com/in/johndoe" value={form.linkedin} onChange={set('linkedin')} hint="Optional — helps us optimize your profile" />
            </div>
        )

        if (step === 1) return (
            <div className="form-step form-step--active">
                <div className="form-grid-2">
                    <InputField icon={Briefcase} label="Current Job Title" placeholder="e.g. Software Engineer" required value={form.jobTitle} onChange={set('jobTitle')} />
                    <SelectField icon={Clock} label="Years of Experience" required value={form.yearsExp} onChange={set('yearsExp')} options={['0–1 years', '1–3 years', '3–5 years', '5–10 years', '10+ years']} />
                    <SelectField icon={Building2} label="Industry" required value={form.industry} onChange={set('industry')} options={['Technology', 'Finance', 'Healthcare', 'Marketing', 'Design', 'Education', 'Engineering', 'Other']} />
                    <InputField icon={Target} label="Target Role" placeholder="e.g. Product Manager" required value={form.targetRole} onChange={set('targetRole')} />
                </div>
                <div className="form-field">
                    <label className="form-label">Skills <span className="form-required">*</span></label>
                    <div className="form-input-wrap">
                        <Zap size={16} className="form-input-icon" />
                        <input
                            className="form-input"
                            style={{ paddingLeft: '40px' }}
                            placeholder="React, Node.js, Python, AWS (comma separated)"
                            value={form.skills}
                            onChange={set('skills')}
                        />
                    </div>
                </div>
                <SelectField icon={DollarSign} label="Expected Salary" required value={form.salary} onChange={set('salary')} options={['<$30k', '$30k–$60k', '$60k–$100k', '$100k–$150k', '$150k+']} />
            </div>
        )

        return (
            <div className="form-step form-step--active">
                {/* File upload */}
                <div className="form-field">
                    <label className="form-label">Upload Your CV</label>
                    <div className="form-upload" onClick={() => fileRef.current.click()}>
                        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFile} style={{ display: 'none' }} />
                        <Upload size={28} color="var(--primary)" />
                        <div>
                            {fileName
                                ? <><strong style={{ color: 'var(--dark)' }}>{fileName}</strong><p className="form-hint">File selected ✓</p></>
                                : <><strong>Click to upload</strong> or drag & drop<p className="form-hint">PDF, DOC, DOCX up to 10MB</p></>
                            }
                        </div>
                    </div>
                </div>

                <div className="form-grid-2">
                    <SelectField icon={FileText} label="Jobs Per Day" required value={form.jobsPerDay} onChange={set('jobsPerDay')} options={['5–10', '10–20', '20–30', '30+']} />
                    <SelectField icon={Globe} label="Job Location" required value={form.jobLocation} onChange={set('jobLocation')} options={['Remote', 'Onsite', 'Hybrid', 'Any']} />
                    <SelectField icon={Briefcase} label="Job Type" required value={form.jobType} onChange={set('jobType')} options={['Full-time', 'Part-time', 'Contract', 'Internship']} />
                </div>

                <div className="form-field">
                    <label className="form-label">Additional Notes</label>
                    <div className="form-input-wrap">
                        <StickyNote size={16} className="form-input-icon" style={{ top: '14px' }} />
                        <textarea
                            className="form-input form-textarea"
                            style={{ paddingLeft: '40px' }}
                            placeholder="Anything else we should know (visa status, preferred companies, etc.)"
                            rows={3}
                            value={form.notes}
                            onChange={set('notes')}
                        />
                    </div>
                </div>
            </div>
        )
    }

    if (submitted) return (
        <section id="intake-form" className="intake-section">
            <div className="container">
                <div className="intake-card">
                    <div className="intake-success">
                        <div className="intake-success-icon">
                            <CheckCircle size={40} color="white" />
                        </div>
                        <h2>You're All Set! 🎉</h2>
                        <p>We've received your application. Our team will review your profile and start building your ATS CV within 24 hours.</p>
                        <p style={{ marginTop: '8px' }}>Check your email at <strong>{form.email || 'your inbox'}</strong> for confirmation.</p>
                        <button className="btn btn-primary btn-lg" style={{ marginTop: '24px' }} onClick={() => { setSubmitted(false); setStep(0) }}>
                            Submit Another Application
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )

    return (
        <section id="intake-form" className="intake-section">
            <div className="container">
                <div className="intake-header text-center">
                    <div className="section-label">🚀 Get Started</div>
                    <h2 className="section-title">Start Your Job Search Today</h2>
                    <p className="section-subtitle">Fill in your details and we'll take care of the rest — CV, applications, and interviews.</p>
                </div>

                <div className="intake-card">
                    {/* Progress Bar */}
                    <div className="intake-progress">
                        {steps.map((s, i) => {
                            const Icon = s.icon
                            return (
                                <div key={i} className={`progress-step ${i <= step ? 'progress-step--active' : ''} ${i < step ? 'progress-step--done' : ''}`}>
                                    <div className="progress-step-icon">
                                        {i < step ? <CheckCircle size={16} color="white" /> : <Icon size={16} />}
                                    </div>
                                    <span className="progress-step-label">{s.label}</span>
                                    {i < steps.length - 1 && <div className="progress-line" data-done={i < step} />}
                                </div>
                            )
                        })}
                    </div>

                    {/* Progress bar fill */}
                    <div className="intake-progress-bar">
                        <div className="intake-progress-fill" style={{ width: `${((step) / (steps.length - 1)) * 100}%` }}></div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleNext} className="intake-form">
                        <div className="form-step-title">
                            Step {step + 1} of {steps.length} — {steps[step].label}
                        </div>

                        {renderStep()}

                        <div className="form-actions">
                            {step > 0 && (
                                <button type="button" className="btn btn-outline" onClick={() => setStep(s => s - 1)}>
                                    <ArrowLeft size={16} /> Back
                                </button>
                            )}
                            <button type="submit" className="btn btn-primary btn-lg" style={{ marginLeft: 'auto' }}>
                                {step < 2 ? <>Next Step <ArrowRight size={16} /></> : <>Submit &amp; Start My Job Search <Zap size={16} /></>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    )
}
