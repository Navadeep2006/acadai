import { useState } from 'react';
import { login, signup } from '../api';
import DemoMenu from '../components/DemoMenu';

const ICONS = { teacher: '👩‍🏫', student: '🎓' };

export default function LoginPage({ onLogin }) {
  const [role, setRole]       = useState('student');
  const [mode, setMode]       = useState('login');   // 'login' | 'signup'
  const [fields, setFields]   = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function set(k, v) { setFields(f => ({ ...f, [k]: v })); setError(''); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      let user;
      if (mode === 'signup') {
        user = await signup({
          name: fields.name, subject: fields.subject,
          email: fields.email, password: fields.password,
        });
      } else {
        const payload = role === 'teacher'
          ? { email: fields.email, password: fields.password }
          : { rollNumber: fields.rollNumber, password: fields.password };
        user = await login(role, payload);
      }
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* BG logo watermark */}
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 320, opacity: 0.015, pointerEvents: 'none', userSelect: 'none',
      }}>🎓</div>

      <div style={{ width: '100%', maxWidth: 440 }} className="fade-in">
        {/* Header */}
        <div className="text-center" style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>🎓</div>
          <div style={{
            fontSize: 36, fontWeight: 900,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginTop: 8, letterSpacing: '-1px',
          }}>AcadAI</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            AI-Powered Student Performance Analytics
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ borderRadius: 'var(--radius-lg)', padding: 32 }}>
          {/* Role tabs */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 28,
            background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: 4,
          }}>
            {['student', 'teacher'].map(r => (
              <button key={r}
                onClick={() => { setRole(r); setMode('login'); setError(''); setFields({}); }}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                  background: role === r ? 'var(--accent-grad)' : 'transparent',
                  color: role === r ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                  boxShadow: role === r ? 'var(--shadow-btn)' : 'none',
                }}
              >
                {ICONS[r]} {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          {/* Mode tabs (teacher only signup) */}
          {role === 'teacher' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['login', 'signup'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setFields({}); }}
                  className={`btn ${mode === m ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                  style={{ flex: 1 }}
                >
                  {m === 'login' ? '🔑 Sign In' : '✨ Sign Up'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Signup-only fields */}
              {mode === 'signup' && (
                <>
                  <div className="input-group">
                    <label className="input-label">Full Name</label>
                    <input className="input" placeholder="Dr. Jane Smith" value={fields.name || ''}
                      onChange={e => set('name', e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Subject</label>
                    <input className="input" placeholder="Mathematics" value={fields.subject || ''}
                      onChange={e => set('subject', e.target.value)} required />
                  </div>
                </>
              )}

              {/* Student: Roll Number */}
              {role === 'student' && mode === 'login' && (
                <div className="input-group">
                  <label className="input-label">Roll Number</label>
                  <input className="input" placeholder="e.g. 1001" value={fields.rollNumber || ''}
                    onChange={e => set('rollNumber', e.target.value)} required />
                </div>
              )}

              {/* Teacher: Email */}
              {(role === 'teacher') && (
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input className="input" type="email" placeholder="teacher@school.edu" value={fields.email || ''}
                    onChange={e => set('email', e.target.value)} required />
                </div>
              )}

              {/* Password */}
              <div className="input-group">
                <label className="input-label">Password</label>
                <input className="input" type="password" placeholder="••••••••" value={fields.password || ''}
                  onChange={e => set('password', e.target.value)} required />
              </div>

              {error && <div className="error-text">⚠ {error}</div>}

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}
                style={{ marginTop: 4 }}>
                {loading
                  ? <><span className="spinner" />Please wait…</>
                  : mode === 'signup' ? '✨ Create Account' : '🚀 Sign In'}
              </button>
            </div>
          </form>
        </div>

        {/* Hint */}
        <div className="text-center" style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          👇 Try the <b style={{ color: 'var(--accent-1)' }}>🚀 Demo</b> button below to log in instantly
        </div>
      </div>

      <DemoMenu onLogin={onLogin} />
    </div>
  );
}
