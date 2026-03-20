import { useState } from 'react';
import { login, signup } from '../api';

const DEMO_USERS = [
  { label: 'Teacher', role: 'teacher', sub: 'teacher@school.edu', icon: '👩‍🏫',
    payload: { email: 'teacher@school.edu', password: 'teach123' } },
  { label: 'Alex Johnson', role: 'student', sub: 'Roll: 1001', icon: '👦',
    payload: { rollNumber: '1001', password: 'alex123' } },
  { label: 'Priya Sharma', role: 'student', sub: 'Roll: 1002', icon: '👧',
    payload: { rollNumber: '1002', password: 'priya123' } },
  { label: 'Marcus Williams', role: 'student', sub: 'Roll: 1003', icon: '🧑',
    payload: { rollNumber: '1003', password: 'marcus123' } },
  { label: 'Yuki Tanaka', role: 'student', sub: 'Roll: 1004', icon: '👩',
    payload: { rollNumber: '1004', password: 'yuki123' } },
];

export default function DemoMenu({ onLogin }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null);

  async function quickLogin(demo) {
    setLoading(demo.label);
    try {
      const user = await login(demo.role, demo.payload);
      onLogin(user);
    } catch (e) {
      alert('Demo login failed: ' + e.message);
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  return (
    <div className="demo-fab">
      {open && (
        <div className="demo-panel">
          <div className="demo-panel-title">⚡ Quick Demo Login</div>
          {DEMO_USERS.map((d) => (
            <button
              key={d.label}
              className="demo-user-btn"
              onClick={() => quickLogin(d)}
              disabled={!!loading}
            >
              <span style={{ fontSize: 24 }}>{d.icon}</span>
              <div>
                <div className="demo-user-name">
                  {loading === d.label ? '⏳ Logging in…' : d.label}
                </div>
                <div className="demo-user-sub">{d.sub}</div>
              </div>
              <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-muted)' }}>
                {d.role === 'teacher' ? '🏫' : '🎓'}
              </span>
            </button>
          ))}
          <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', marginTop:8 }}>
            Click any account above to log in instantly
          </div>
        </div>
      )}
      <button className="demo-fab-btn" onClick={() => setOpen(o => !o)} title="Demo logins">
        {open ? '✕' : '🚀'}
      </button>
    </div>
  );
}
