import { useState, useEffect } from 'react';
import { fetchStudent, runPredict, logout } from '../api';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

const RISK_BADGE = { low:'badge-green', medium:'badge-yellow', high:'badge-red' };

export default function StudentDashboard({ user, onLogout }) {
  const [student, setStudent]     = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [toast, setToast]         = useState('');
  const [page, setPage]           = useState('overview');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    fetchStudent(user.id).then(s => { setStudent(s); setLoading(false); })
      .catch(e => { showToast('⚠ ' + e.message); setLoading(false); });
  }, [user.id]);

  async function handlePredict() {
    setPredicting(true);
    try {
      const res = await runPredict(user.id, student?.data || {});
      setPrediction(res);
    } catch(e) { showToast('⚠ Prediction failed: ' + e.message); }
    setPredicting(false);
  }

  async function handleLogout() { await logout(); onLogout(); }

  const d = student?.data || {};
  const subjects = Object.entries(d.subjects || {});
  const prevMarks = (d.prevMarks || []).map((m, i) => ({ term: `T${i+1}`, mark: m }));
  const radarData = [
    { subject: 'Attend.',   value: d.attendance || 0 },
    { subject: 'Study',     value: Math.min((d.studyHours || 0) * 20, 100) },
    { subject: 'Assign.',   value: d.assignmentScore || 0 },
    { subject: 'Particip.', value: d.participation || 0 },
    { subject: 'Quizzes',   value: (d.quizScores?.reduce((a,b)=>a+b,0)/Math.max(d.quizScores?.length||1,1)) || 0 },
  ];

  const navItems = [
    { id:'overview',    icon:'🏠', label:'Overview' },
    { id:'performance', icon:'📊', label:'Performance' },
    { id:'prediction',  icon:'🤖', label:'AI Prediction' },
  ];

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">A</div>
          <span className="brand-name">AcadAI</span>
        </div>
        <div className="sidebar-section">Navigation</div>
        {navItems.map(n => (
          <button key={n.id} className={`nav-item ${page===n.id?'active':''}`}
            onClick={() => setPage(n.id)}>
            <span>{n.icon}</span>{n.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="divider" />
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', marginBottom:8 }}>
          <div className="avatar avatar-lg">
            {(user.avatar || user.name?.slice(0,2) || 'S').toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600 }}>{user.name}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>Roll: {student?.rollNumber || user.id}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{student?.grade || ''}</div>
          </div>
        </div>
        <button className="btn btn-danger btn-sm w-full" onClick={handleLogout}>🚪 Log Out</button>
      </aside>

      {/* Main */}
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-title">
            {navItems.find(n=>n.id===page)?.icon} {navItems.find(n=>n.id===page)?.label}
          </div>
          <div style={{ fontSize:13, color:'var(--text-muted)' }}>
            Hey <b style={{ color:'var(--text-primary)' }}>{user.name?.split(' ')[0]}</b> 👋
          </div>
        </div>

        <div className="page fade-in">
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}>
              <div className="spinner" style={{ width:40, height:40 }} />
            </div>
          ) : (
            <>
              {/* ── OVERVIEW ── */}
              {page === 'overview' && (
                <>
                  <div className="grid-4" style={{ marginBottom:24 }}>
                    {[
                      { label:'Attendance',     value:`${d.attendance||0}%`,     icon:'📅', color: d.attendance<75?'var(--red)':'var(--green)' },
                      { label:'Study Hours',    value:`${d.studyHours||0}h/day`, icon:'📚', color:'var(--accent-1)' },
                      { label:'Assign. Score',  value:`${d.assignmentScore||0}`, icon:'✍️', color:'var(--cyan)' },
                      { label:'Participation',  value:`${d.participation||0}%`,  icon:'🙋', color:'var(--pink)' },
                    ].map(s => (
                      <div key={s.label} className="stat-card">
                        <div style={{ fontSize:26, marginBottom:4 }}>{s.icon}</div>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Subject marks */}
                  <div className="grid-2">
                    <div className="card">
                      <div className="section-title">📘 Subject Scores</div>
                      {subjects.map(([name, score]) => (
                        <div key={name} className="subject-row">
                          <span className="subject-name">{name}</span>
                          <div className="progress-bar" style={{ flex:1 }}>
                            <div className="progress-fill" style={{
                              width:`${score}%`,
                              background: score<60?'var(--red)':score<75?'rgba(245,158,11,0.9)':'var(--accent-grad)'
                            }} />
                          </div>
                          <span className="subject-score"
                            style={{ color: score<60?'var(--red)':score<75?'var(--yellow)':'var(--green)' }}>
                            {score}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Radar */}
                    <div className="card">
                      <div className="section-title">📡 Performance Radar</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="rgba(255,255,255,0.07)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill:'#94a3b8', fontSize:11 }} />
                          <Radar dataKey="value" stroke="var(--accent-1)" fill="var(--accent-1)" fillOpacity={0.2} />
                          <Tooltip contentStyle={{ background:'#1e1e35', border:'1px solid rgba(99,102,241,0.3)', borderRadius:8 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {/* ── PERFORMANCE ── */}
              {page === 'performance' && (
                <>
                  <div className="card" style={{ marginBottom:20 }}>
                    <div className="section-title">📈 Mark Progression</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={prevMarks}>
                        <XAxis dataKey="term" tick={{ fill:'#94a3b8', fontSize:12 }} />
                        <YAxis domain={[0,100]} tick={{ fill:'#94a3b8', fontSize:12 }} />
                        <Tooltip contentStyle={{ background:'#1e1e35', border:'1px solid rgba(99,102,241,0.3)', borderRadius:8 }} />
                        <Line type="monotone" dataKey="mark" stroke="var(--accent-1)" strokeWidth={3}
                          dot={{ fill:'var(--accent-1)', r:5 }} activeDot={{ r:7 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card">
                    <div className="section-title">🧪 Quiz Scores</div>
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                      {(d.quizScores||[]).map((q,i) => (
                        <div key={i} style={{
                          width:60, height:60, borderRadius:12,
                          background: q>=75?'rgba(16,185,129,0.15)':q>=55?'rgba(245,158,11,0.15)':'rgba(239,68,68,0.15)',
                          border: `1px solid ${q>=75?'rgba(16,185,129,0.3)':q>=55?'rgba(245,158,11,0.3)':'rgba(239,68,68,0.3)'}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          flexDirection:'column', gap:0,
                        }}>
                          <div style={{ fontSize:18, fontWeight:800, color: q>=75?'var(--green)':q>=55?'var(--yellow)':'var(--red)' }}>{q}</div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>Q{i+1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── AI PREDICTION ── */}
              {page === 'prediction' && (
                <>
                  {!prediction ? (
                    <div className="card text-center" style={{ padding:48 }}>
                      <div style={{ fontSize:64, marginBottom:16 }}>🤖</div>
                      <div style={{ fontSize:22, fontWeight:800, marginBottom:8 }}>AI Performance Prediction</div>
                      <div style={{ color:'var(--text-secondary)', marginBottom:32, maxWidth:400, margin:'0 auto 32px' }}>
                        Our machine learning model will analyze your academic data and predict your performance,
                        pass probability, and personalized coaching advice.
                      </div>
                      <button className="btn btn-primary btn-lg" onClick={handlePredict} disabled={predicting}>
                        {predicting ? <><span className="spinner" /> Analyzing…</> : '🚀 Run AI Prediction'}
                      </button>
                    </div>
                  ) : (
                    <div className="fade-in">
                      <div className="grid-2" style={{ marginBottom:20 }}>
                        <div className="card text-center">
                          <div className="score-ring-wrap">
                            <div className="score-ring" style={{ '--pct': `${prediction.predictedMark}%` }}>
                              <div className="score-ring-inner">
                                <div className="score-ring-val" style={{ color:'var(--accent-1)' }}>{prediction.predictedMark}</div>
                                <div className="score-ring-lbl">out of 100</div>
                              </div>
                            </div>
                            <div style={{ fontWeight:700, fontSize:18 }}>Predicted Mark</div>
                          </div>
                        </div>

                        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                          <div className="stat-card">
                            <div className="stat-label">Grade</div>
                            <div className="stat-value" style={{ fontSize:36 }}>{prediction.grade}</div>
                          </div>
                          <div className="stat-card">
                            <div className="stat-label">Pass Probability</div>
                            <div className="stat-value" style={{ color:'var(--green)' }}>
                              {prediction.passProbability}%
                            </div>
                          </div>
                          <div className="stat-card">
                            <div className="stat-label">Risk Level</div>
                            <div className={`badge ${RISK_BADGE[prediction.riskLevel?.toLowerCase()]||'badge-blue'}`}
                              style={{ fontSize:14, marginTop:4 }}>
                              {prediction.riskLevel}
                            </div>
                          </div>
                        </div>
                      </div>

                      {prediction.narrative && (
                        <div className="card" style={{ background:'rgba(99,102,241,0.07)', marginBottom:16 }}>
                          <div className="section-title">💬 AI Coaching Message</div>
                          <div style={{ fontSize:15, lineHeight:1.7, color:'var(--text-primary)' }}>
                            {prediction.narrative}
                          </div>
                        </div>
                      )}

                      <button className="btn btn-ghost" onClick={() => setPrediction(null)}>🔄 Run Again</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
