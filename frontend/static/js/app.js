/* AcadAI — App Bootstrap */
var App = (function () {
  'use strict';

  var _user = null;
  var currentPage = 'dashboard';

  window._currentRole = 'student';
  window._currentAuth = 'login';

  document.addEventListener('keydown', function(e){ if(e.key==='Enter') API.doLogin(); });

  function showLogin() {
    UI.stopSSE();
    document.getElementById('appLayout').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
  }

  function startApp(user) {
    _user = user;
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('appLayout').classList.remove('hidden');

    document.getElementById('s-sub').textContent  = user.role==='teacher' ? (user.subject||'') : (user.grade||'')+' Grade';
    document.getElementById('s-av').textContent   = user.avatar || (user.name||'?')[0].toUpperCase();
    document.getElementById('s-name').textContent = user.name;
    document.getElementById('s-role').textContent = user.role;

    buildNav(user.role);

    // Start SSE real-time stream
    var token = localStorage.getItem('acadai_token') || '';
    UI.startSSE(token);

    go('dashboard');
  }

  var NAV_T = [
    {id:'dashboard', icon:'grid',  lbl:'Dashboard'},
    {id:'students',  icon:'users', lbl:'Students'},
    {id:'predict',   icon:'brain', lbl:'AI Predictions'},
    {id:'model',     icon:'model', lbl:'ML Analytics'}
  ];
  var NAV_S = [
    {id:'dashboard', icon:'grid',  lbl:'My Dashboard'},
    {id:'predict',   icon:'brain', lbl:'ML Prediction'}
  ];

  function buildNav(role) {
    var items = role==='teacher' ? NAV_T : NAV_S;
    document.getElementById('nav-items').innerHTML = items.map(function(n){
      return '<button class="nav-btn" id="nb-'+n.id+'" onclick="App.go(\''+n.id+'\')">'+UI.icon(n.icon)+' '+n.lbl+'</button>';
    }).join('');
  }

  function setNav(id) {
    document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
    var el = document.getElementById('nb-'+id);
    if (el) el.classList.add('active');
  }

  function go(id) {
    currentPage = id;
    setNav(id);
    Modal.close();
    if (!_user) return;

    if (_user.role === 'teacher') {
      if      (id==='dashboard') Pages.renderTDash();
      else if (id==='students')  Pages.renderStudentsPage();
      else if (id==='predict')   Pages.renderPredictListPage();
      else if (id==='model')     Pages.renderModelPage();
    } else {
      if      (id==='dashboard') Pages.renderSDash(_user);
      else if (id==='predict')   Pages.renderPredictPanel(_user, null);
    }
  }

  // Try auto-login from saved token
  (function autoLogin() {
    var savedUser = null;
    try { savedUser = JSON.parse(localStorage.getItem('acadai_user') || 'null'); } catch(e){}
    var token = localStorage.getItem('acadai_token');
    if (savedUser && token) {
      // Verify token is still valid by hitting the API
      fetch('/api/students', { headers: { 'Authorization': 'Bearer '+token } })
        .then(function(r){ if(r.ok) return r.json(); throw new Error('expired'); })
        .then(function(){ startApp(savedUser); })
        .catch(function(){
          localStorage.removeItem('acadai_token');
          localStorage.removeItem('acadai_user');
        });
    }
  })();

  return { startApp, showLogin, go, getUser: function(){ return _user; }, currentPage };
})();
