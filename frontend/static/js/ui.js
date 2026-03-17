/* AcadAI — UI Helpers */
var UI = (function () {
  'use strict';

  // ── role / auth toggles ──────────────────────────────────
  function switchRole(r) {
    window._currentRole = r;
    document.getElementById('rtab-student').classList.toggle('active', r==='student');
    document.getElementById('rtab-teacher').classList.toggle('active', r==='teacher');
    document.getElementById('f-student').classList.toggle('hidden', r!=='student');
    document.getElementById('f-teacher').classList.toggle('hidden', r!=='teacher');
    document.getElementById('login-err').classList.add('hidden');
    document.getElementById('login-ok').classList.add('hidden');
    var btn = document.getElementById('login-btn');
    if (r === 'teacher') {
      document.getElementById('login-hint').classList.add('hidden');
      btn.textContent = window._currentAuth === 'signup' ? 'Create Account' : 'Sign In →';
    } else {
      document.getElementById('login-hint').classList.remove('hidden');
      btn.innerHTML = 'Sign In &#8594;';
    }
  }

  function switchAuth(mode) {
    window._currentAuth = mode;
    document.getElementById('atab-login').classList.toggle('active', mode==='login');
    document.getElementById('atab-signup').classList.toggle('active', mode==='signup');
    document.getElementById('tf-login').classList.toggle('hidden', mode!=='login');
    document.getElementById('tf-signup').classList.toggle('hidden', mode!=='signup');
    document.getElementById('login-err').classList.add('hidden');
    document.getElementById('login-ok').classList.add('hidden');
    document.getElementById('login-btn').textContent = mode==='signup' ? 'Create Account' : 'Sign In →';
  }

  // ── toast ────────────────────────────────────────────────
  var _tTimer;
  function toast(msg, type) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'show' + (type ? ' toast-'+type : '');
    clearTimeout(_tTimer);
    _tTimer = setTimeout(function(){ t.classList.remove('show'); }, 3000);
  }

  // ── modal ────────────────────────────────────────────────
  function openModal(html) {
    document.getElementById('modal-box').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }
  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-box').innerHTML = '';
  }

  // ── icons ────────────────────────────────────────────────
  function icon(n) {
    var m = {
      grid:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
      users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
      brain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
      model: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'
    };
    return m[n] || '';
  }

  // ── score color ──────────────────────────────────────────
  function sc(v) { return v>=75?'var(--green)':v>=55?'var(--accent)':'var(--red)'; }
  function ac(v) { return v>=80?'var(--green)':'var(--gold)'; }

  // ── stat card ────────────────────────────────────────────
  function statCard(ico, label, val, sub, cls) {
    return '<div class="sc"><div class="si">'+ico+'</div><div class="sl">'+label+'</div><div class="sv">'+val+'</div><div class="ss '+(cls||'')+'">'+sub+'</div></div>';
  }

  // ── chart bars (vertical) ────────────────────────────────
  function chartBars(marks) {
    var html = marks.map(function(v,i){
      var c = sc(v);
      return '<div class="bcol"><div class="bval" style="color:'+c+'">'+v+'</div><div class="bar" style="height:'+v+'%;background:'+c+'"></div><div class="blbl">E'+(i+1)+'</div></div>';
    }).join('');
    return '<div class="cbars">'+html+'</div>';
  }

  // ── subject progress bars ────────────────────────────────
  function subjectBars(subjects) {
    return Object.keys(subjects).map(function(s){
      var v=subjects[s], c=sc(v);
      return '<div class="srow"><div class="sname">'+s+'</div><div class="swrap"><div class="pbar"><div class="pfill" style="width:'+v+'%;background:'+c+'"></div></div></div><div class="sscore" style="color:'+c+'">'+v+'</div></div>';
    }).join('');
  }

  // ── sparkline SVG ────────────────────────────────────────
  function sparkline(data, color) {
    var max=Math.max.apply(null,data), min=Math.min.apply(null,data)-5, h=44, w=200;
    var pts=data.map(function(v,i){ return ((i/(data.length-1))*w)+','+(h-((v-min)/(max-min))*h); }).join(' ');
    var dots=data.map(function(v,i){ return '<circle cx="'+((i/(data.length-1))*w)+'" cy="'+(h-((v-min)/(max-min))*h)+'" r="3" fill="'+color+'"/>'; }).join('');
    return '<svg width="100%" height="'+h+'" viewBox="0 0 '+w+' '+h+'" style="overflow:visible"><polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>';
  }

  // ── ring chart ───────────────────────────────────────────
  function ringChart(val, color, size) {
    size=size||80;
    var r=(size/2)-8, circ=2*Math.PI*r, fill=(val/100)*circ;
    return '<div style="position:relative;flex-shrink:0;width:'+size+'px;height:'+size+'px">'
      +'<svg width="'+size+'" height="'+size+'" style="transform:rotate(-90deg)">'
      +'<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="7"/>'
      +'<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="7" stroke-dasharray="'+fill+' '+circ+'" stroke-linecap="round"/>'
      +'</svg>'
      +'<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-size:'+Math.round(size/5)+'px;font-weight:800;font-family:\'JetBrains Mono\',monospace;color:'+color+'">'+val+'</div>'
      +'</div>';
  }

  // ── feature importance bars ──────────────────────────────
  function featureImportance(obj) {
    if (!obj || !Object.keys(obj).length) return '<div style="color:var(--muted);font-size:12px">Not available</div>';
    var sorted = Object.entries(obj).sort(function(a,b){return b[1]-a[1];}).slice(0,8);
    var maxVal  = sorted[0][1];
    var labels  = { attendance:'Attendance', study_hours:'Study Hours', assignment_score:'Assignments',
                    participation:'Participation', prev_avg:'Prev Avg', quiz_avg:'Quiz Avg',
                    subject_avg:'Subject Avg', study_x_attend:'Study×Attend',
                    assign_x_quiz:'Assign×Quiz', consistency_score:'Consistency', study_hours_sq:'Study²' };
    return sorted.map(function(kv){
      var pct = Math.round((kv[1]/maxVal)*100);
      return '<div class="fi-row"><div class="fi-name">'+(labels[kv[0]]||kv[0])+'</div>'
        +'<div class="fi-bar"><div class="fi-fill" style="width:'+pct+'%"></div></div>'
        +'<div class="fi-val">'+(kv[1]*100).toFixed(1)+'%</div></div>';
    }).join('');
  }

  // ── model breakdown table ────────────────────────────────
  function modelBreakdown(bd, best) {
    if (!bd) return '';
    return Object.keys(bd).map(function(k){
      var isBest = k===best;
      return '<div class="model-row"><span style="color:'+(isBest?'var(--accent)':'var(--muted)')+';font-weight:'+(isBest?700:400)+'">'+k.replace('_',' ')+(isBest?' ★':'')+'</span>'
        +'<span class="mono" style="color:var(--text)">'+bd[k].toFixed(1)+'/100</span></div>';
    }).join('');
  }

  // ── SSE real-time ─────────────────────────────────────────
  var _sse = null;
  function startSSE(token) {
    if (_sse) _sse.close();
    try {
      _sse = new EventSource('/api/realtime/stream?token='+token);
      _sse.onopen = function() {
        document.getElementById('rt-indicator').className = 'rt-dot connected';
      };
      _sse.onmessage = function(e) {
        try {
          var data = JSON.parse(e.data);
          if (data.type === 'students_updated') {
            toast('📡 Student data updated in real-time', 'blue');
            if (window.App && window.App.currentPage === 'students') {
              window.App.go('students');
            }
          }
        } catch(err){}
      };
      _sse.onerror = function() {
        document.getElementById('rt-indicator').className = 'rt-dot disconnected';
      };
    } catch(e) {
      console.warn('SSE not supported or backend not running.');
    }
  }
  function stopSSE() {
    if (_sse) { _sse.close(); _sse = null; }
    var dot = document.getElementById('rt-indicator');
    if (dot) dot.className = 'rt-dot disconnected';
  }

  return {
    switchRole, switchAuth, toast, openModal, closeModal,
    icon, sc, ac, statCard, chartBars, subjectBars,
    sparkline, ringChart, featureImportance, modelBreakdown,
    startSSE, stopSSE
  };
})();

var Modal = {
  open: UI.openModal,
  close: UI.closeModal,
  closeOutside: function(e){ if(e.target===document.getElementById('modal-overlay')) UI.closeModal(); }
};
