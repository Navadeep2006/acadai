/* AcadAI — API Client (talks to Flask backend) */
var API = (function () {
  'use strict';

  var BASE = '';   // same-origin; set to 'http://localhost:5000' for dev
  var _token = localStorage.getItem('acadai_token') || '';
  var _user  = null;
  try { _user = JSON.parse(localStorage.getItem('acadai_user') || 'null'); } catch(e){}

  function _headers(extra) {
    var h = { 'Content-Type': 'application/json' };
    if (_token) h['Authorization'] = 'Bearer ' + _token;
    return Object.assign(h, extra || {});
  }

  function _req(method, path, body) {
    var opts = { method: method, headers: _headers() };
    if (body) opts.body = JSON.stringify(body);
    return fetch(BASE + path, opts).then(function(r) {
      return r.json().then(function(d) {
        if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  function get(path)         { return _req('GET',    path); }
  function post(path, body)  { return _req('POST',   path, body); }
  function put(path, body)   { return _req('PUT',    path, body); }
  function del(path)         { return _req('DELETE', path); }

  // ── AUTH ──────────────────────────────────────────────────
  function doLogin() {
    var errEl = document.getElementById('login-err');
    var okEl  = document.getElementById('login-ok');
    errEl.classList.add('hidden'); okEl.classList.add('hidden');

    var role = window._currentRole || 'student';
    var auth = window._currentAuth || 'login';

    if (role === 'teacher' && auth === 'signup') { doSignup(); return; }

    var body;
    if (role === 'teacher') {
      body = { role:'teacher', email: document.getElementById('inp-temail').value.trim(),
               password: document.getElementById('inp-tpass').value };
    } else {
      body = { role:'student', studentId: document.getElementById('sel-student').value,
               password: document.getElementById('inp-spass').value };
    }

    post('/api/auth/login', body).then(function(d) {
      _token = d.token; _user = d.user;
      localStorage.setItem('acadai_token', _token);
      localStorage.setItem('acadai_user',  JSON.stringify(_user));
      window.App.startApp(_user);
    }).catch(function(e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
    });
  }

  function doSignup() {
    var errEl = document.getElementById('login-err');
    var name    = document.getElementById('su-name').value.trim();
    var subject = document.getElementById('su-subject').value.trim();
    var email   = document.getElementById('su-email').value.trim();
    var pass    = document.getElementById('su-pass').value;
    var pass2   = document.getElementById('su-pass2').value;
    if (pass !== pass2) { errEl.textContent = 'Passwords do not match.'; errEl.classList.remove('hidden'); return; }

    post('/api/auth/signup', { name, subject, email, password: pass })
      .then(function(d) {
        _token = d.token; _user = d.user;
        localStorage.setItem('acadai_token', _token);
        localStorage.setItem('acadai_user',  JSON.stringify(_user));
        window.App.startApp(_user);
      }).catch(function(e) {
        errEl.textContent = e.message; errEl.classList.remove('hidden');
      });
  }

  function doLogout() {
    post('/api/auth/logout').catch(function(){});
    _token = ''; _user = null;
    localStorage.removeItem('acadai_token');
    localStorage.removeItem('acadai_user');
    window.App.showLogin();
  }

  function getUser() { return _user; }

  // ── STUDENTS ──────────────────────────────────────────────
  function fetchStudents()     { return get('/api/students'); }
  function fetchStudent(sid)   { return get('/api/students/' + sid); }
  function addStudent(data)    { return post('/api/students', data); }
  function editStudent(sid, d) { return put('/api/students/' + sid, d); }
  function removeStudent(sid)  { return del('/api/students/' + sid); }

  // ── PREDICTIONS ───────────────────────────────────────────
  function runPredict(sid, features) {
    return post('/api/predict/' + sid, { features: features });
  }

  // ── MODEL INFO ────────────────────────────────────────────
  function modelInfo()  { return get('/api/model/info'); }
  function retrainModel() { return post('/api/model/retrain'); }

  // ── ANALYTICS ─────────────────────────────────────────────
  function analytics() { return get('/api/analytics'); }

  // ── POPULATE STUDENT SELECT ON LOGIN PAGE ─────────────────
  function populateStudentSelect() {
    var sel = document.getElementById('sel-student');
    if (!sel) return;
    fetchStudents().then(function(students) {
      sel.innerHTML = '';
      students.forEach(function(s) {
        var o = document.createElement('option');
        o.value = s.id;
        o.textContent = s.name + ' (' + (s.grade || '') + ')';
        sel.appendChild(o);
      });
    }).catch(function() {
      // fallback — seed defaults visible even before login
      var defaults = ['s1:Alex Johnson (10th)','s2:Priya Sharma (10th)','s3:Marcus Williams (10th)','s4:Yuki Tanaka (10th)'];
      sel.innerHTML = defaults.map(function(d){ var p=d.split(':'); return '<option value="'+p[0]+'">'+p[1]+'</option>'; }).join('');
    });
  }

  // Auto-populate on load
  document.addEventListener('DOMContentLoaded', populateStudentSelect);

  return {
    doLogin, doLogout, doSignup, getUser,
    fetchStudents, fetchStudent, addStudent, editStudent, removeStudent,
    runPredict, modelInfo, retrainModel, analytics
  };
})();
