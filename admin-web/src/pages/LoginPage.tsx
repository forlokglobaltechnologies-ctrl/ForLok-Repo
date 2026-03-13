import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState('forlok');
  const [password, setPassword] = useState('forlok123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      const next = (location.state as any)?.from || '/dashboard';
      navigate(next, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container-fluid p-0"
      style={{
        minHeight: '100vh',
        backgroundColor: '#191919',
        backgroundImage:
          'radial-gradient(circle at top right, rgba(254, 136, 0, 0.16), transparent 26%), radial-gradient(circle at bottom left, rgba(254, 136, 0, 0.12), transparent 24%)',
      }}
    >
      <div className="row g-0 align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="col-12 col-lg-6 d-none d-lg-flex justify-content-center">
          <div style={{ maxWidth: 420, padding: '48px 32px', color: '#FFFFFF' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                borderRadius: 999,
                backgroundColor: 'rgba(254, 136, 0, 0.1)',
                border: '1px solid rgba(254, 136, 0, 0.18)',
                color: '#FE8800',
                fontWeight: 700,
                marginBottom: 24,
              }}
            >
              Admin Console
            </div>
            <h1 style={{ fontSize: '3rem', lineHeight: 1.1, fontWeight: 800, marginBottom: 16 }}>
              Control ForLok operations in real time.
            </h1>
            <p style={{ color: '#B8B8B8', fontSize: '1.05rem', marginBottom: 0 }}>
              Secure admin access for users, bookings, analytics, and moderation workflows from one dashboard.
            </p>
          </div>
        </div>

        <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
          <div className="px-3 px-md-4 py-4 py-md-5">
            <div
              className="rounded-4 shadow-lg"
              style={{
                backgroundColor: '#232323',
                border: '1px solid #343434',
                padding: '32px 28px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div className="text-center mb-4">
                <img
                  src="/forlok_admin_login_logo.png"
                  alt="ForLok"
                  style={{
                    width: 116,
                    height: 116,
                    borderRadius: 28,
                    objectFit: 'cover',
                    marginBottom: 18,
                  }}
                />
                <h2 className="mb-2" style={{ color: '#FFFFFF', fontWeight: 800 }}>
                  ForLok Admin
                </h2>
                <p className="mb-0" style={{ color: '#B8B8B8' }}>
                  Sign in to continue
                </p>
              </div>

              <form onSubmit={onSubmit}>
                <div className="form-floating mb-3">
                  <input
                    className="form-control"
                    id="username"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    style={{
                      backgroundColor: '#191919',
                      borderColor: '#343434',
                      color: '#FFFFFF',
                    }}
                  />
                  <label htmlFor="username" style={{ color: '#8C8C8C' }}>
                    Username
                  </label>
                </div>
                <div className="form-floating mb-4">
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{
                      backgroundColor: '#191919',
                      borderColor: '#343434',
                      color: '#FFFFFF',
                    }}
                  />
                  <label htmlFor="password" style={{ color: '#8C8C8C' }}>
                    Password
                  </label>
                </div>
                {error ? (
                  <div
                    className="py-2 px-3 mb-3 rounded-3"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.14)',
                      border: '1px solid rgba(239, 68, 68, 0.28)',
                      color: '#FCA5A5',
                    }}
                  >
                    {error}
                  </div>
                ) : null}
                <button
                  className="btn w-100 py-3 mb-2"
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(180deg, #232323 0%, #191919 100%)',
                    border: '1px solid #343434',
                    color: '#FFFFFF',
                    fontWeight: 700,
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
