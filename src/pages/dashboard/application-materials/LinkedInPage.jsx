import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link2, RefreshCw, Unplug } from 'lucide-react';
import api from '../../../services/api.js';

export default function LinkedInPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [banner, setBanner] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/linkedin/status');
      setStatus(data);
    } catch {
      setStatus({ connected: false, configured: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('linkedinOAuth') === 'success') {
      setBanner('LinkedIn connected successfully.');
      const next = new URLSearchParams(searchParams);
      next.delete('linkedinOAuth');
      setSearchParams(next, { replace: true });
      load();
    }
  }, [searchParams, setSearchParams, load]);

  const connect = async () => {
    try {
      const returnTo = '/dashboard/application-materials/linkedin';
      const { data } = await api.get('/auth/linkedin/oauth-url', {
        params: { returnTo },
      });
      const url = data.url || data.authorizationUrl;
      if (url) window.location.href = url;
    } catch (e) {
      window.alert(e?.response?.data?.message || e.message);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect LinkedIn from your account?')) return;
    try {
      await api.delete('/auth/linkedin');
      setBanner('LinkedIn disconnected.');
      load();
    } catch (e) {
      window.alert(e?.response?.data?.message || e.message);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await api.post('/auth/linkedin/sync');
      setBanner('Profile synced from LinkedIn.');
      load();
    } catch (e) {
      window.alert(e?.response?.data?.message || e.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <p className="am-muted">Loading LinkedIn status…</p>;
  }

  const configured = status?.configured !== false;
  const connected = !!status?.connected;

  return (
    <div className="am-card">
      {banner && (
        <div className="am-banner" role="status">
          {banner}
        </div>
      )}

      {!configured && (
        <p className="am-muted">
          LinkedIn OAuth is not configured on this server. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to enable
          connection.
        </p>
      )}

      {configured && (
        <>
          <p style={{ marginTop: 0 }}>
            <strong>Status:</strong>{' '}
            {connected ? (
              <span style={{ color: '#047857' }}>Connected</span>
            ) : (
              <span style={{ color: '#b45309' }}>Not connected</span>
            )}
            {status?.profileName && ` — ${status.profileName}`}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {!connected ? (
              <button type="button" className="am-btn am-btn--primary" onClick={connect}>
                <Link2 size={18} />
                Connect LinkedIn
              </button>
            ) : (
              <>
                <button type="button" className="am-btn am-btn--ghost" onClick={sync} disabled={syncing}>
                  <RefreshCw size={18} />
                  {syncing ? 'Syncing…' : 'Sync profile'}
                </button>
                <button type="button" className="am-btn am-btn--danger" onClick={disconnect}>
                  <Unplug size={18} />
                  Disconnect
                </button>
              </>
            )}
          </div>

          {connected && status?.profile && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: '15px', margin: '0 0 8px' }}>Cached profile</h3>
              <pre className="am-profile-pre">{JSON.stringify(status.profile, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
