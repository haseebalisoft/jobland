import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, Link2, FileText, ArrowLeft } from 'lucide-react';
import api from '../../services/api.js';
import '../BdDashboard.css';

const theme = { primary: '#10B981', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', cardBg: '#ffffff' };

export default function BdInterviewDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const applicationId = searchParams.get('applicationId');

  const [form, setForm] = useState({
    mode: '',
    interview_date: '',
    interview_time: '',
    duration_minutes: '',
    timezone: 'CST',
    link: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!applicationId) {
      setError('Missing applicationId');
      setLoading(false);
      return;
    }
    api
      .get(`/applications/${applicationId}/interview`)
      .then((res) => {
        const data = res.data || {};
        setForm({
          mode: data.mode || '',
          interview_date: data.interview_date || '',
          interview_time: data.interview_time || '',
          duration_minutes: data.duration_minutes != null ? String(data.duration_minutes) : '',
          timezone: data.timezone || 'CST',
          link: data.link || '',
          notes: data.notes || '',
        });
      })
      .catch(() => {
        // no existing interview is fine
      })
      .finally(() => setLoading(false));
  }, [applicationId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!applicationId) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/applications/${applicationId}/interview`, {
        mode: form.mode || null,
        interview_date: form.interview_date || null,
        interview_time: form.interview_time || null,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        timezone: form.timezone || null,
        link: form.link || null,
        notes: form.notes || null,
      });
      navigate('/bd/leads');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save interview details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bd-content">
        <p style={{ color: theme.textMuted }}>Loading interview details…</p>
      </div>
    );
  }

  return (
    <div className="bd-content">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="bd-primary-btn"
        style={{ marginBottom: 16, padding: '6px 12px', borderRadius: 999, background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
      >
        <ArrowLeft size={16} /> Back
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: theme.text, marginBottom: 8 }}>Interview details</h1>
      <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 20 }}>
        Fill in the interview information. This will appear on the candidate&apos;s dashboard.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bd-interview-form"
        style={{
          background: theme.cardBg,
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          padding: 24,
          maxWidth: 640,
          boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
        }}
      >
        {error && (
          <p style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>
          Interview mode
        </label>
        <select
          name="mode"
          value={form.mode}
          onChange={handleChange}
          className="bd-input"
          style={{ width: '100%', marginBottom: 14, borderRadius: 10, border: `1px solid ${theme.border}`, padding: '10px 12px', fontSize: 14 }}
        >
          <option value="">Select mode…</option>
          <option value="zoom">Zoom</option>
          <option value="google_meet">Google Meet</option>
          <option value="teams">Microsoft Teams</option>
          <option value="phone">Phone call</option>
          <option value="onsite">Onsite</option>
          <option value="other">Other</option>
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>
              <Calendar size={14} /> Date
            </label>
            <input
              type="date"
              name="interview_date"
              value={form.interview_date}
              onChange={handleChange}
              className="bd-input"
              style={{ width: '100%', borderRadius: 10, border: `1px solid ${theme.border}`, padding: '8px 10px', fontSize: 14 }}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>
              <Clock size={14} /> Time
            </label>
            <input
              type="time"
              name="interview_time"
              value={form.interview_time}
              onChange={handleChange}
              className="bd-input"
              style={{ width: '100%', borderRadius: 10, border: `1px solid ${theme.border}`, padding: '8px 10px', fontSize: 14 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6, display: 'block' }}>
              Duration (minutes)
            </label>
            <input
              type="number"
              name="duration_minutes"
              min="0"
              value={form.duration_minutes}
              onChange={handleChange}
              className="bd-input"
              style={{ width: '100%', borderRadius: 10, border: `1px solid ${theme.border}`, padding: '8px 10px', fontSize: 14 }}
            />
          </div>
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>
          Timezone
        </label>
        <select
          name="timezone"
          value={form.timezone}
          onChange={handleChange}
          className="bd-input"
          style={{ width: '100%', marginBottom: 14, borderRadius: 10, border: `1px solid ${theme.border}`, padding: '10px 12px', fontSize: 14 }}
        >
          <option value="EST">EST</option>
          <option value="CST">CST</option>
          <option value="MST">Mountain (MST)</option>
          <option value="PST">Pacific (PST)</option>
          <option value="GMT">GMT</option>
          <option value="UTC">UTC</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>
          <Link2 size={14} /> Meeting link
        </label>
        <input
          type="url"
          name="link"
          placeholder="https://…"
          value={form.link}
          onChange={handleChange}
          className="bd-input"
          style={{ width: '100%', borderRadius: 10, border: `1px solid ${theme.border}`, padding: '8px 10px', fontSize: 14, marginBottom: 14 }}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>
          <FileText size={14} /> Notes for candidate
        </label>
        <textarea
          name="notes"
          rows={4}
          value={form.notes}
          onChange={handleChange}
          className="bd-input"
          style={{ width: '100%', borderRadius: 10, border: `1px solid ${theme.border}`, padding: '10px 12px', fontSize: 14, resize: 'vertical', marginBottom: 18 }}
          placeholder="Anything the candidate should know before joining the interview."
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save interview'}
          </button>
        </div>
      </form>
    </div>
  );
}

