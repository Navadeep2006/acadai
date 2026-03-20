import { useState, useEffect, useCallback } from 'react';
import { fetchStudents, fetchAnalytics, fetchModelInfo, addStudent, removeStudent, retrainModel, logout, runPredict } from '../api';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981'];
const RISK_BADGE = { low:'badge-green', medium:'badge-yellow', high:'badge-red' };

export default function TeacherDashboard({ user, onLogout }) {
  const [page, setPage]           = useState('dashboard');
  const [students, setStudents]   = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [model, setModel]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [addForm, setAddForm]     = useState({});
  const [prediction, setPrediction] = useState(null);
  const [predSid, setPredSid]     = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ss, an, mi] = await Promise.all([fetchStudents(), fetchAnalytics(), fetchModelInfo()]);
      setStudents(ss); setAnalytics(an); setModel(mi);
    } catch(e) { showToast('⚠ ' + e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleLogout() { await logout(); onLogout(); }

  async function handleDelete(sid, name) {
    if (!confirm(`Delete ${name}?`)) return;
    await removeStudent(sid);
    showToast('✅ Student removed');
    load();
  }

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await addStudent({
        name: addForm.name,
        rollNumber: addForm.rollNumber,
        password: addForm.password,
        grade: addForm.grade || '10th',
        data: {
          attendance: Number(addForm.attendance || 80),
          studyHours: Number(addForm.studyHours || 3),
          assignmentScore: Number(addForm.assignmentScore || 70),
          participation: Number(addForm.participation || 70),
          prevMarks: [Number(addForm.prevMark || 70)],
          quizScores: [Number(addForm.quiz || 70)],
          subjects: { Math:70, Science:70, English:70, History:70, CS:70 },
        }
      });
      showToast('✅ Student added');
      setShowAdd(false); setAddForm({});
      load();
    } catch(e) { showToast('⚠ ' + e.message); }
  }

  async function handlePredict(sid) {
    setPredSid(sid); setPrediction(null);
    try {
      const res = await runPredict(sid, {});
      setPrediction(res);
    } catch(e) { showToast('⚠ Prediction failed: ' + e.message); }
  }

  async function handleRetrain() {
    showToast('⏳ Retraining model…');
    try {
      const res = await retrainModel();
      showToast('✅ ' + res.message);
      load();
    } catch(e) { showToast('⚠ ' + e.message); }
  }

  const navItems = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'students',  icon:'🎓', label:'Students' },
    { id:'model',     icon:'🤖', label:'ML Model' },
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
          <div className="avatar" style={{ width:34, height:34, fontSize:13 }}>
            {(user.avatar || user.name?.slice(0,2) || 'T').toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{user.name}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{user.subject}</div>
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
            Welcome back, <b style={{ color:'var(--text-primary)' }}>{user.name}</b>
          </div>
        </div>

        <div className="page fade-in">
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}>
              <div className="spinner" style={{ width:40, height:40 }} />
            </div>
          ) : (
            <>
              {/* ── DASHBOARD ── */}
              {page === 'dashboard' && analytics && (
                <>
                  <div className="grid-4" style={{ marginBottom:24 }}>
                    {[
                      { label:'Total Students', value: analytics.totalStudents, sub:'Enrolled', icon:'🎓' },
                      { label:'At Risk',         value: analytics.atRisk,        sub:'Need attention', icon:'⚠️' },
                      { label:'Avg Attendance',  value: analytics.avgAttendance+'%', sub:'Class average', icon:'📅' },
                      { label:'Avg Mark',        value: analytics.avgMark,       sub:'Out of 100', icon:'📈' },
                    ].map(s => (
                      <div key={s.label} className="stat-card">
                        <div style={{ fontSize:28, marginBottom:4 }}>{s.icon}</div>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-sub">{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Chart: marks distribution */}
                  <div className="grid-2">
                    <div className="card">
                      <div className="section-title">📊 Marks Distribution</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={students.map(s => ({
                          name: s.name.split(' ')[0],
                          mark: s.data?.prevMarks?.slice(-1)[0] || 0
                        }))}>
                          <XAxis dataKey="name" tick={{ fill:'#94a3b8', fontSize:12 }} />
                          <YAxis domain={[0,100]} tick={{ fill:'#94a3b8', fontSize:12 }} />
                          <Tooltip contentStyle={{ background:'#1e1e35', border:'1px solid rgba(99,102,241,0.3)', borderRadius:8 }} />
                          <Bar dataKey="mark" radius={[4,4,0,0]}>
                            {students.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Attendance radar */}
                    <div className="card">
                      <div className="section-title">📡 Attendance Overview</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={students.map(s => ({
                          subject: s.name.split(' ')[0],
                          attendance: s.data?.attendance || 0,
                        }))}>
                          <PolarGrid stroke="rgba(255,255,255,0.08)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill:'#94a3b8', fontSize:11 }} />
                          <Radar dataKey="attendance" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                          <Tooltip contentStyle={{ background:'#1e1e35', border:'1px solid rgba(99,102,241,0.3)', borderRadius:8 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {/* ── STUDENTS ── */}
              {page === 'students' && (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                    <div style={{ fontSize:16, fontWeight:700 }}>All Students ({students.length})</div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Student</button>
                  </div>

                  {/* Add modal */}
                  {showAdd && (
                    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowAdd(false)}>
                      <div className="modal">
                        <div className="modal-title">➕ Add New Student</div>
                        <div className="modal-sub">Fill in the student details below</div>
                        <form onSubmit={handleAdd}>
                          <div style={{ display:'grid', gap:14 }}>
                            {[
                              ['name','Full Name','text','John Doe',true],
                              ['rollNumber','Roll Number','text','1005',true],
                              ['password','Password','password','Min 4 chars',true],
                              ['grade','Grade','text','10th',false],
                              ['attendance','Attendance %','number','80',false],
                              ['studyHours','Study Hrs/day','number','3',false],
                            ].map(([k,l,t,p,req]) => (
                              <div key={k} className="input-group">
                                <label className="input-label">{l}</label>
                                <input className="input" type={t} placeholder={p} required={req}
                                  value={addForm[k]||''} onChange={e=>setAddForm(f=>({...f,[k]:e.target.value}))} />
                              </div>
                            ))}
                          </div>
                          <div style={{ display:'flex', gap:12, marginTop:20 }}>
                            <button type="button" className="btn btn-ghost" style={{ flex:1 }}
                              onClick={() => setShowAdd(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" style={{ flex:1 }}>✅ Add</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Prediction modal */}
                  {prediction && (
                    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setPrediction(null)}>
                      <div className="modal">
                        <div className="modal-title">🤖 Prediction Result</div>
                        <div className="modal-sub">{students.find(s=>s.id===predSid)?.name}</div>
                        <div className="grid-2" style={{ marginBottom:16 }}>
                          <div className="stat-card">
                            <div className="stat-label">Predicted Mark</div>
                            <div className="stat-value" style={{ color:'var(--accent-1)' }}>{prediction.predictedMark}/100</div>
                          </div>
                          <div className="stat-card">
                            <div className="stat-label">Grade</div>
                            <div className="stat-value">{prediction.grade}</div>
                          </div>
                          <div className="stat-card">
                            <div className="stat-label">Pass Probability</div>
                            <div className="stat-value" style={{ color:'var(--green)' }}>{prediction.passProbability}%</div>
                          </div>
                          <div className="stat-card">
                            <div className="stat-label">Risk Level</div>
                            <div className={`badge ${RISK_BADGE[prediction.riskLevel?.toLowerCase()]}`} style={{ fontSize:16 }}>
                              {prediction.riskLevel}
                            </div>
                          </div>
                        </div>
                        {prediction.narrative && (
                          <div className="card" style={{ background:'rgba(99,102,241,0.08)', fontSize:13, lineHeight:1.6, color:'var(--text-secondary)', marginBottom:16 }}>
                            💬 {prediction.narrative}
                          </div>
                        )}
                        <button className="btn btn-ghost w-full" onClick={() => setPrediction(null)}>Close</button>
                      </div>
                    </div>
                  )}

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Roll No.</th>
                          <th>Grade</th>
                          <th>Attendance</th>
                          <th>Last Mark</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(s => (
                          <tr key={s.id}>
                            <td>
                              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <div className="avatar" style={{ width:32, height:32, fontSize:11 }}>{s.avatar || s.name.slice(0,2)}</div>
                                <div>
                                  <div style={{ fontWeight:600 }}>{s.name}</div>
                                </div>
                              </div>
                            </td>
                            <td><span className="badge badge-blue">{s.rollNumber || s.id}</span></td>
                            <td>{s.grade}</td>
                            <td>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div className="progress-bar" style={{ width:80 }}>
                                  <div className="progress-fill" style={{ width:`${s.data?.attendance||0}%`,
                                    background: s.data?.attendance < 75 ? 'var(--red)' : 'var(--accent-grad)' }} />
                                </div>
                                <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{s.data?.attendance}%</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight:700, color: (s.data?.prevMarks?.slice(-1)[0]||0) < 60 ? 'var(--red)' : 'var(--green)' }}>
                                {s.data?.prevMarks?.slice(-1)[0] ?? '—'}/100
                              </span>
                            </td>
                            <td>
                              <div style={{ display:'flex', gap:6 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => handlePredict(s.id)}>🤖 Predict</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id, s.name)}>🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── MODEL ── */}
              {page === 'model' && model && (
                <>
                  <div className="grid-3" style={{ marginBottom:24 }}>
                    <div className="stat-card">
                      <div className="stat-label">Best Model</div>
                      <div className="stat-value" style={{ fontSize:18 }}>{model.bestModel?.replace(/_/g,' ')}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Training Samples</div>
                      <div className="stat-value">{model.trainingSamples}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Firebase</div>
                      <div className={`badge ${model.firebaseConnected ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize:14, marginTop:4 }}>
                        {model.firebaseConnected ? '✅ Connected' : '⚡ In-Memory'}
                      </div>
                    </div>
                  </div>

                  {model.metrics && (
                    <div className="card" style={{ marginBottom:16 }}>
                      <div className="section-title">📊 Model Metrics</div>
                      <div className="grid-3">
                        {Object.entries(model.metrics).map(([k,v]) => (
                          <div key={k} className="stat-card">
                            <div className="stat-label">{k.replace(/_/g,' ')}</div>
                            <div className="stat-value" style={{ fontSize:20 }}>
                              {typeof v === 'number' ? v.toFixed(3) : v}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button className="btn btn-primary" onClick={handleRetrain}>
                    🔄 Retrain Model
                  </button>
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
