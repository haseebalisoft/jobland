import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Users, ExternalLink } from 'lucide-react';
import api from '../../services/api.js';
import '../BdDashboard.css';

const theme = { text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', cardBg: '#ffffff', primary: '#10B981' };

export default function BdResumes() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [resumes, setResumes] = useState([]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId],
  );

  useEffect(() => {
    let mounted = true;
    setLoadingUsers(true);
    api.get('/bd/my-users')
      .then((res) => {
        if (!mounted) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        setUsers(rows);
        if (rows.length > 0) setSelectedUserId(rows[0].id);
      })
      .catch(() => {
        if (!mounted) return;
        setUsers([]);
      })
      .finally(() => {
        if (mounted) setLoadingUsers(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setResumes([]);
      return;
    }
    let mounted = true;
    setLoadingResumes(true);
    const run = async () => {
      try {
        let res;
        try {
          res = await api.get(`/cv/saved/user/${selectedUserId}`);
        } catch (err) {
          if (err?.response?.status === 404) {
            res = await api.get(`/cv/saved-resumes/user/${selectedUserId}`);
          } else {
            throw err;
          }
        }
        if (!mounted) return;
        setResumes(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!mounted) return;
        setResumes([]);
      } finally {
        if (mounted) setLoadingResumes(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [selectedUserId]);

  const openSavedResume = async (resumeId) => {
    if (!resumeId) return;
    try {
      let res;
      try {
        res = await api.get(`/cv/saved/${resumeId}/file`, { responseType: 'blob' });
      } catch (err) {
        if (err?.response?.status === 404) {
          res = await api.get(`/cv/saved-resumes/${resumeId}/file`, { responseType: 'blob' });
        } else {
          throw err;
        }
      }
      const url = window.URL.createObjectURL(res.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to open resume');
    }
  };

  return (
    <div className="bd-content">
      <h1 style={{ fontSize: 26, fontWeight: 800, color: theme.text, marginBottom: 8 }}>User resumes</h1>
      <p style={{ color: theme.textMuted, fontSize: 15, marginBottom: 18 }}>
        Browse saved resumes for your assigned users and open any version directly.
      </p>

      <section style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Users size={18} color={theme.primary} />
          <strong style={{ color: theme.text }}>Select assigned user</strong>
        </div>
        {loadingUsers ? (
          <p style={{ margin: 0, color: theme.textMuted }}>Loading assigned users...</p>
        ) : users.length === 0 ? (
          <p style={{ margin: 0, color: theme.textMuted }}>No users assigned yet.</p>
        ) : (
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={{ minWidth: 280, padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.border}` }}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.full_name || u.name || u.email)} ({u.email})
              </option>
            ))}
          </select>
        )}
      </section>

      <section style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, fontSize: 13, color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Saved versions {selectedUser ? `for ${selectedUser.full_name || selectedUser.email}` : ''}
        </div>
        {loadingResumes ? (
          <div style={{ padding: 16, color: theme.textMuted }}>Loading resumes...</div>
        ) : resumes.length === 0 ? (
          <div style={{ padding: 16, color: theme.textMuted }}>No saved resumes found for this user.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {resumes.map((r) => (
              <div key={r.id} style={{ padding: '12px 16px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 800, color: theme.text }}>{r.title || 'Untitled resume'}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 3 }}>
                    {r.created_at ? new Date(r.created_at).toLocaleString() : 'Recently saved'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSavedResume(r.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: `1px solid ${theme.primary}`, background: 'rgba(16,185,129,0.08)', color: theme.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  <FileText size={14} />
                  Open
                  <ExternalLink size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
