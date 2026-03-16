import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { Upload } from 'lucide-react';
import UserSidebar from '../components/UserSidebar.jsx';

const UploadCv = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const navigate = useNavigate();

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setUploadStatus('Processing...');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      await api.post('/cv/parse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      navigate('/dashboard');
    } catch (err) {
      setUploadStatus('Failed to process. Please try again.');
      console.error(err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <UserSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <main className="orion-onboarding-container" style={{ flex: 1, padding: '32px 24px' }}>
        <div className="orion-card">
          <h1>Upload your resume</h1>
          <p className="subheading">This helps HiredLogics understand your background.</p>

          <div
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '60px',
              textAlign: 'center',
              margin: '40px 0',
              background: '#F8FAFC',
            }}
          >
            <div
              style={{
                width: '120px',
                height: '120px',
                background: 'white',
                borderRadius: '50%',
                margin: '0 auto 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
            >
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
            <p
              style={{
                color: uploadStatus.includes('Failed') ? 'red' : 'var(--accent)',
                textAlign: 'center',
                marginBottom: '16px',
              }}
            >
              {uploadStatus}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
              onClick={() => navigate('/resume-maker')}
            >
              I don't have a CV / Create Manually
            </button>
            <button
              className="btn-next"
              onClick={handleUpload}
              disabled={!file || loading}
            >
              {loading ? 'Processing...' : 'Dashboard'}
            </button>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
};

export default UploadCv;

