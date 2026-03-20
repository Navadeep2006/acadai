/* Thin API client for React frontend
   Proxied via Vite → Flask :5000
*/

const BASE = '';   // same-origin in production (Flask serves both frontend + API)

let _token = localStorage.getItem('acadai_token') || '';
let _user  = null;
try { _user = JSON.parse(localStorage.getItem('acadai_user') || 'null'); } catch (_) {}

function setAuth(token, user) {
  _token = token;
  _user  = user;
  localStorage.setItem('acadai_token', token);
  localStorage.setItem('acadai_user',  JSON.stringify(user));
}

function clearAuth() {
  _token = ''; _user = null;
  localStorage.removeItem('acadai_token');
  localStorage.removeItem('acadai_user');
}

function getUser() { return _user; }
function getToken() { return _token; }

async function _req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = 'Bearer ' + _token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(BASE + path, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

const get  = (p)    => _req('GET',    p);
const post = (p, b) => _req('POST',   p, b);
const put  = (p, b) => _req('PUT',    p, b);
const del  = (p)    => _req('DELETE', p);

// ── Auth ─────────────────────────────────────────────
export async function login(role, payload) {
  const d = await post('/api/auth/login', { role, ...payload });
  setAuth(d.token, d.user);
  return d.user;
}

export async function signup(payload) {
  const d = await post('/api/auth/signup', payload);
  setAuth(d.token, d.user);
  return d.user;
}

export async function logout() {
  try { await post('/api/auth/logout'); } catch (_) {}
  clearAuth();
}

// ── Students ──────────────────────────────────────────
export const fetchStudents       = ()         => get('/api/students');
export const fetchStudent        = (sid)      => get('/api/students/' + sid);
export const addStudent          = (data)     => post('/api/students', data);
export const editStudent         = (sid, d)   => put('/api/students/' + sid, d);
export const removeStudent       = (sid)      => del('/api/students/' + sid);

// ── Predictions ───────────────────────────────────────
export const runPredict          = (sid, f)   => post('/api/predict/' + sid, { features: f });

// ── Analytics / Model ─────────────────────────────────
export const fetchAnalytics      = ()         => get('/api/analytics');
export const fetchModelInfo      = ()         => get('/api/model/info');
export const retrainModel        = ()         => post('/api/model/retrain');

export { getUser, getToken, clearAuth };
