import React from 'react'
import { useNavigate } from 'react-router-dom'

const Auth = () => {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: 'white',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#020617',
          borderRadius: '1.25rem',
          padding: '2rem',
          boxShadow: '0 24px 60px rgba(15,23,42,0.9)',
          border: '1px solid rgba(148,163,184,0.25)',
        }}
      >
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Welcome to Hiredlogic
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#9ca3af', marginBottom: '1.75rem' }}>
          Choose how you want to continue.
        </p>

        <button
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            border: 'none',
            marginBottom: '0.75rem',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            background:
              'linear-gradient(135deg, rgba(59,130,246,1), rgba(14,165,233,1))',
            color: 'white',
          }}
          onClick={() => navigate('/login')}
        >
          Login
        </button>

        <button
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            border: '1px solid rgba(148,163,184,0.5)',
            background: 'transparent',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            color: '#e5e7eb',
          }}
          onClick={() => navigate('/signup')}
        >
          Create an account
        </button>
      </div>
    </div>
  )
}

export default Auth

