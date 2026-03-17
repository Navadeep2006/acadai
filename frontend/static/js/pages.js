/* AcadAI — Page Renderers */
var Pages = (function () {
  'use strict';

  function M() { return document.getElementById('main'); }

  // ══════════════════════════════════════════════════════════
  //  TEACHER DASHBOARD
  // ══════════════════════════════════════════════════════════
  function renderTDash() {
    M().innerHTML = '<div class="page"><div class="g4"><div class="sc skeleton" style="height:100px"></div><div class="sc skeleton" style="height:100px"></div><div class="sc skeleton" style="height:100px"></div><div class="sc skeleton" style="height:100px"></div></div></div>';

    Promise.all([API.fetchStudents(), API.analytics()]).then(function(res) {
      var students = res[0], stats = res[1];
      var date = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

      var studentRows = students.map(function(st) {
        var last = (st.data&&st.data.prevMarks) ? st.data.prevMarks[st.data.prevMarks.length-1] : 0;
        var risk = (st.data&&st.data.attendance<75) || last<60;
        return '<div onclick="Pages.viewStudent(\''+st.id+'\')" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid rgba(99,179,237,.07);cursor:pointer;border-radius:8px;transition:background .2s" onmouseover="this.style.background=\'rgba(59,130,246,.04)\'" onmouseout="this.style.background=\'transparent\'">'
          +'<div class="avatar">'+st.avatar+'</div>'
          +'<div style="flex:1"><div style="font-size:13px;font-weight:600">'+st.name+'</div>'
          +'<div style="font-size:11px;color:var(--muted)">'+(st.grade||'')+' &bull; Attend: '+(st.data&&st.data.attendance||0)+'% &bull; Exam: '+last+'/100</div></div>'
          +'<div class="badge '+(risk?'br':'bg')+'">'+(risk?'At Risk':'On Track')+'</div></div>';
      }).join('');

      var barCols = students.map(function(st){
        var v=(st.data&&st.data.prevMarks)?st.data.prevMarks[st.data.prevMarks.length-1]:0;
        var c=UI.sc(v);
        return '<div class="bcol"><div class="bval" style="color:'+c+'">'+v+'</div><div class="bar" style="height:'+v+'%;background:'+c+'"></div><div class="blbl">'+(st.name||'').split(' ')[0]+'</div></div>';
      }).join('');

      M().innerHTML = '<div class="page">'
        +'<div class="ph"><div><div class="pt">Dashboard &#128075;</div><div class="ps">'+date+'</div></div>'
        +'<button class="btn-ai" onclick="Pages.openAddStudent()">&#43; Add Student</button></div>'
        +'<div class="g4">'
        +UI.statCard('&#128101;','Total Students', stats.totalStudents||0, 'Enrolled', '')
        +UI.statCard('&#128203;','Avg Attendance', (stats.avgAttendance||0)+'%', stats.avgAttendance>=80?'&#8593; On track':'&#8595; Below target', stats.avgAttendance>=80?'up':'dn')
        +UI.statCard('&#128202;','Class Average', stats.avgMark||0, 'out of 100', '')
        +UI.statCard('&#9888;&#65039;','At-Risk', stats.atRisk||0, stats.atRisk>0?'Needs attention':'All good', stats.atRisk>0?'dn':'up')
        +'</div>'
        +'<div class="g2">'
        +'<div class="card"><div class="stitle" style="justify-content:space-between">&#128101; Students <button class="btn-ol" onclick="Pages.openAddStudent()">&#43; Add</button></div>'
        +(studentRows||'<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">No students yet</div>')+'</div>'
        +'<div><div class="card" style="margin-bottom:18px"><div class="stitle">&#128202; Performance Chart</div><div class="cbars">'+barCols+'</div></div>'
        +'<div class="card"><div class="stitle">&#129504; Model Status</div><div id="model-status-mini">Loading…</div></div></div>'
        +'</div></div>';

      // Load model info
      API.modelInfo().then(function(info) {
        var html = '<div class="model-info">'
          +'<div class="model-row"><span style="color:var(--muted)">Best Model</span><span class="badge bb">'+info.bestModel+'</span></div>'
          +'<div class="model-row"><span style="color:var(--muted)">Training Samples</span><span class="mono" style="color:var(--text)">'+info.trainingSamples+'</span></div>'
          +'<div class="model-row"><span style="color:var(--muted)">Firebase</span><span class="badge '+(info.firebaseConnected?'bg':'br')+'">'+(info.firebaseConnected?'Connected':'Local mode')+'</span></div>'
          +(info.metrics&&info.metrics.random_forest?'<div class="model-row"><span style="color:var(--muted)">RF MAE</span><span class="mono" style="color:var(--green)">'+info.metrics.random_forest.mae+'</span></div>':'')
          +'</div>'
          +'<button class="btn-ol" style="margin-top:12px;width:100%" onclick="Pages.doRetrain()">&#128260; Retrain Model</button>';
        var el = document.getElementById('model-status-mini');
        if (el) el.innerHTML = html;
      }).catch(function(){});
    }).catch(function(e) {
      M().innerHTML = '<div class="page"><div class="al al-r">Failed to load dashboard: '+e.message+'</div></div>';
    });
  }

  // ══════════════════════════════════════════════════════════
  //  STUDENTS PAGE
  // ══════════════════════════════════════════════════════════
  function renderStudentsPage() {
    M().innerHTML = '<div class="page"><div class="stitle skeleton" style="height:30px;width:200px;margin-bottom:20px"></div><div class="card skeleton" style="height:300px"></div></div>';

    API.fetchStudents().then(function(students) {
      if (!students.length) {
        M().innerHTML = '<div class="page"><div class="ph"><div><div class="pt">Students</div></div><button class="btn-ai" onclick="Pages.openAddStudent()">&#43; Add Student</button></div>'
          +'<div class="card" style="text-align:center;padding:60px"><div style="font-size:48px;margin-bottom:16px">&#128101;</div><div style="font-size:18px;font-weight:700;margin-bottom:8px">No students yet</div><button class="btn-ai" onclick="Pages.openAddStudent()">&#43; Add Student</button></div></div>';
        return;
      }

      var rows = students.map(function(st){
        var last=(st.data&&st.data.prevMarks)?st.data.prevMarks[st.data.prevMarks.length-1]:0;
        var risk=(st.data&&st.data.attendance<75)||last<60;
        return '<tr class="cr">'
          +'<td onclick="Pages.viewStudent(\''+st.id+'\')"><div style="display:flex;align-items:center;gap:10px"><div class="avatar">'+st.avatar+'</div><div style="font-weight:600">'+st.name+'</div></div></td>'
          +'<td onclick="Pages.viewStudent(\''+st.id+'\')">'+(st.grade||'')+'</td>'
          +'<td onclick="Pages.viewStudent(\''+st.id+'\')"><span class="mono" style="color:'+UI.ac(st.data&&st.data.attendance||0)+'">'+(st.data&&st.data.attendance||0)+'%</span></td>'
          +'<td onclick="Pages.viewStudent(\''+st.id+'\')"><span class="mono">'+(st.data&&st.data.studyHours||0)+'h</span></td>'
          +'<td onclick="Pages.viewStudent(\''+st.id+'\')"><span class="mono">'+(st.data&&st.data.assignmentScore||0)+'/100</span></td>'
          +'<td onclick="Pages.viewStudent(\''+st.id+'\')"><span class="mono" style="color:'+UI.sc(last)+'">'+last+'/100</span></td>'
          +'<td onclick="Pages.viewStudent(\''+st.id+'\')" ><div class="badge '+(risk?'br':'bg')+'">'+(risk?'At Risk':'On Track')+'</div></td>'
          +'<td style="white-space:nowrap">'
          +'<button class="btn-ai btn-sm" onclick="Pages.viewStudent(\''+st.id+'\')">&#129504;</button> '
          +'<button class="btn-ol"    style="padding:7px 10px" onclick="Pages.openEditStudent(\''+st.id+'\')">&#9998;</button> '
          +'<button class="btn-danger" style="padding:7px 10px" onclick="Pages.confirmDelete(\''+st.id+'\',\''+st.name+'\')">&#128465;</button>'
          +'</td></tr>';
      }).join('');

      M().innerHTML = '<div class="page"><div class="ph"><div><div class="pt">Students</div><div class="ps">'+students.length+' enrolled</div></div><button class="btn-ai" onclick="Pages.openAddStudent()">&#43; Add Student</button></div>'
        +'<div class="card"><div class="tw"><table><thead><tr><th>Student</th><th>Grade</th><th>Attend</th><th>Study</th><th>Assign</th><th>Last Exam</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
    });
  }

  function viewStudent(sid) {
    API.fetchStudent(sid).then(function(st) {
      renderPredictPanel(st, renderStudentsPage);
    });
  }

  // ══════════════════════════════════════════════════════════
  //  AI PREDICTIONS LIST PAGE
  // ══════════════════════════════════════════════════════════
  function renderPredictListPage() {
    API.fetchStudents().then(function(students) {
      if (!students.length) {
        M().innerHTML = '<div class="page"><div class="card" style="text-align:center;padding:60px"><div style="font-size:48px;margin-bottom:16px">&#129504;</div><div style="font-size:18px;font-weight:700;margin-bottom:8px">No students</div><button class="btn-ai" onclick="App.go(\'students\')">Go to Students</button></div></div>';
        return;
      }
      var cards = students.map(function(st){
        var marks=(st.data&&st.data.prevMarks)||[0];
        var last=marks[marks.length-1], c=UI.sc(last);
        return '<div class="card card-link" onclick="Pages.viewStudent(\''+st.id+'\')">'
          +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px"><div class="avatar lg">'+st.avatar+'</div><div><div style="font-weight:700;font-size:15px">'+st.name+'</div><div style="font-size:12px;color:var(--muted)">'+(st.grade||'')+' Grade</div></div></div>'
          +'<div style="display:flex;justify-content:space-between;margin-bottom:14px">'
          +'<div><div style="font-size:10px;color:var(--muted)">ATTEND</div><div style="font-weight:700;color:var(--accent);font-family:\'JetBrains Mono\',monospace">'+(st.data&&st.data.attendance||0)+'%</div></div>'
          +'<div><div style="font-size:10px;color:var(--muted)">LAST</div><div style="font-weight:700;font-family:\'JetBrains Mono\',monospace;color:'+c+'">'+last+'/100</div></div>'
          +'<div><div style="font-size:10px;color:var(--muted)">STUDY</div><div style="font-weight:700;font-family:\'JetBrains Mono\',monospace">'+(st.data&&st.data.studyHours||0)+'h</div></div>'
          +'</div>'+UI.sparkline(marks,c)
          +'<button class="btn-ai" style="width:100%;margin-top:14px;justify-content:center">&#129504; Run ML Prediction</button></div>';
      }).join('');
      M().innerHTML = '<div class="page"><div class="ph"><div><div class="pt">AI Predictions</div><div class="ps">Powered by Random Forest + Gradient Boost ensemble</div></div></div><div class="ga">'+cards+'</div></div>';
    });
  }

  // ══════════════════════════════════════════════════════════
  //  MODEL ANALYTICS PAGE (teacher only)
  // ══════════════════════════════════════════════════════════
  function renderModelPage() {
    M().innerHTML = '<div class="page"><div class="ph"><div><div class="pt">&#129504; ML Model Analytics</div><div class="ps">Real-time model performance &amp; feature analysis</div></div></div><div style="color:var(--muted)">Loading…</div></div>';

    API.modelInfo().then(function(info) {
      var metricsHtml = Object.keys(info.metrics||{}).map(function(m){
        var met = info.metrics[m];
        var isBest = m === info.bestModel;
        return '<div class="card '+(isBest?'':'')+'\" style="'+(isBest?'border-color:rgba(59,130,246,.4)':'')+'"><div class="stitle" style="justify-content:space-between">'
          +m.replace(/_/g,' ')
          +(isBest?'<div class="badge bb">&#9733; Best</div>':'')+'</div>'
          +'<div class="g2" style="margin-bottom:0">'
          +'<div><div class="sl">MAE (lower=better)</div><div class="sv" style="color:var(--green)">'+met.mae+'</div></div>'
          +'<div><div class="sl">R² Score</div><div class="sv" style="color:var(--accent)">'+met.r2+'</div></div>'
          +'</div></div>';
      }).join('');

      M().innerHTML = '<div class="page">'
        +'<div class="ph"><div><div class="pt">&#129504; ML Model Analytics</div><div class="ps">Ensemble: Random Forest (45%) + Gradient Boost (40%) + Ridge (15%)</div></div>'
        +'<button class="btn-ai" onclick="Pages.doRetrain()">&#128260; Retrain Model</button></div>'
        +'<div class="g4">'
        +UI.statCard('&#127744;','Training Samples', info.trainingSamples, 'records used', '')
        +UI.statCard('&#127942;','Best Model', (info.bestModel||'').replace(/_/g,' '), 'lowest MAE', 'bb')
        +UI.statCard('&#128225;','Firebase', info.firebaseConnected?'Connected':'Local', info.firebaseConnected?'Real-time sync':'In-memory mode', info.firebaseConnected?'up':'')
        +UI.statCard('&#8987;','Last Trained', info.lastTrained ? new Date(info.lastTrained*1000).toLocaleTimeString() : 'N/A', 'auto-retrains hourly', '')
        +'</div>'
        +'<div class="g2">'
        +'<div><div class="stitle">&#128202; Model Performance</div><div class="g3" style="margin-bottom:0">'+metricsHtml+'</div></div>'
        +'<div class="card"><div class="stitle">&#128269; Feature Importance (Random Forest)</div><div id="fi-container">Loading…</div></div>'
        +'</div></div>';

      // Get feature importance from a sample prediction
      var students;
      API.fetchStudents().then(function(ss){ students=ss; if(ss.length) return API.fetchStudent(ss[0].id); }).then(function(st){
        if(!st) return;
        return API.runPredict(st.id, st.data);
      }).then(function(pred){
        if(!pred) return;
        var el=document.getElementById('fi-container');
        if(el) el.innerHTML = UI.featureImportance(pred.featureImportance);
      }).catch(function(){});
    });
  }

  // ══════════════════════════════════════════════════════════
  //  PREDICT PANEL
  // ══════════════════════════════════════════════════════════
  var _simState = {};
  var _predSid  = null;
  var _predSt   = null;

  function renderPredictPanel(student, backFn) {
    _predSt  = student;
    _predSid = student.id;
    _simState = Object.assign({}, student.data||{});

    var d    = student.data||{};
    var last = (d.prevMarks&&d.prevMarks.length) ? d.prevMarks[d.prevMarks.length-1] : 0;
    var avg  = d.prevMarks&&d.prevMarks.length ? Math.round(d.prevMarks.reduce(function(a,b){return a+b;},0)/d.prevMarks.length) : 0;

    window._predBackFn = backFn || null;
    var backBtn = backFn ? '<button class="btn-back" onclick="window._predBackFn && window._predBackFn()">&#8592; Back</button>' : '';
    var isTeacher = API.getUser()&&API.getUser().role==='teacher';

    var sliders = [
      {key:'attendance',      lbl:'Attendance (%)',      min:0,max:100,step:1},
      {key:'studyHours',      lbl:'Study Hours / Day',   min:0,max:12, step:0.5},
      {key:'assignmentScore', lbl:'Assignment Score',    min:0,max:100,step:1},
      {key:'participation',   lbl:'Participation',       min:0,max:100,step:1}
    ];
    var simHtml = sliders.map(function(sl){
      var val = _simState[sl.key]||0;
      return '<div class="simblk"><div class="simrow"><div class="simlbl">'+sl.lbl+'</div><div class="simval" id="sv_'+sl.key+'">'+val+'</div></div>'
        +'<input type="range" min="'+sl.min+'" max="'+sl.max+'" step="'+sl.step+'" value="'+val+'" oninput="Pages.updateSim(\''+sl.key+'\',this.value)"/></div>';
    }).join('');

    M().innerHTML = '<div class="page">'+backBtn
      +'<div class="ph"><div style="display:flex;align-items:center;gap:14px"><div class="avatar lg">'+student.avatar+'</div>'
      +'<div><div class="pt">'+student.name+'</div><div class="ps">'+(student.grade||'')+' Grade &bull; ML Performance Predictor</div></div></div>'
      +(isTeacher?'<button class="btn-ol" onclick="Pages.openEditStudent(\''+student.id+'\')">&#9998; Edit</button>':'')+'</div>'
      +'<div class="g4" style="margin-bottom:22px">'
      +'<div class="sc"><div class="sl">Attendance</div><div class="sv" style="color:'+UI.ac(d.attendance||0)+'">'+(d.attendance||0)+'%</div></div>'
      +'<div class="sc"><div class="sl">Last Exam</div><div class="sv mono" style="color:'+UI.sc(last)+'">'+last+'</div></div>'
      +'<div class="sc"><div class="sl">Exam Avg</div><div class="sv mono">'+avg+'</div></div>'
      +'<div class="sc"><div class="sl">Study/Day</div><div class="sv mono">'+(d.studyHours||0)+'h</div></div>'
      +'</div>'
      +'<div class="tabs"><button class="tab active" id="tab-sim" onclick="Pages.showTab(\'sim\')">&#9881; Simulator</button>'
      +'<button class="tab" id="tab-result" onclick="Pages.showTab(\'result\')" disabled>&#129504; ML Result</button></div>'
      +'<div id="pane-sim"><div class="g2">'
      +'<div class="card"><div class="stitle">&#128221; Adjust Parameters</div>'+simHtml
      +'<div style="margin-top:16px"><button class="btn-ai" style="width:100%;justify-content:center" id="run-btn" onclick="Pages.runMLPredict()">&#129504; Run ML Prediction</button>'
      +'<div id="pred-err" class="error-box hidden" style="margin-top:10px"></div></div></div>'
      +'<div><div class="card" style="margin-bottom:18px"><div class="stitle">&#128200; Exam History</div>'+UI.chartBars(d.prevMarks||[0])+'</div>'
      +'<div class="card"><div class="stitle">&#128218; Subject Scores</div>'+UI.subjectBars(d.subjects||{})+'</div>'
      +'</div></div></div>'
      +'<div id="pane-result" class="hidden"></div></div>';
  }

  function updateSim(key, val) {
    _simState[key] = parseFloat(val);
    var el = document.getElementById('sv_'+key);
    if (el) el.textContent = val;
  }

  function showTab(t) {
    ['sim','result'].forEach(function(x){
      var tab=document.getElementById('tab-'+x), pane=document.getElementById('pane-'+x);
      if(tab)  tab.classList.toggle('active', x===t);
      if(pane) pane.classList.toggle('hidden', x!==t);
    });
  }

  function runMLPredict() {
    var btn   = document.getElementById('run-btn');
    var errEl = document.getElementById('pred-err');
    if (!btn) return;
    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>&nbsp;Running ML models…';

    API.runPredict(_predSid, _simState).then(function(result) {
      var tabR = document.getElementById('tab-result');
      if (tabR) tabR.disabled = false;
      renderMLResult(result);
      showTab('result');
      UI.toast('&#129504; ML prediction complete!', 'green');
    }).catch(function(e) {
      var e2 = document.getElementById('pred-err');
      if (e2) { e2.textContent = 'Error: '+(e.message||'Prediction failed'); e2.classList.remove('hidden'); }
    }).finally(function() {
      var b = document.getElementById('run-btn');
      if (b) { b.disabled = false; b.innerHTML = '&#129504; Run ML Prediction'; }
    });
  }

  function renderMLResult(r) {
    var riskColor = r.riskLevel==='low'?'var(--green)':r.riskLevel==='medium'?'var(--gold)':'var(--red)';
    var trendIcon = r.trend==='improving'?'&#128200;':r.trend==='stable'?'&#128202;':'&#128201;';
    var gradeBg   = r.predictedMark>=80?'linear-gradient(135deg,var(--green),#059669)':r.predictedMark>=60?'linear-gradient(135deg,var(--accent),var(--accent2))':'linear-gradient(135deg,var(--red),#dc2626)';

    var subPredHtml = r.subjectPredictions ? Object.keys(r.subjectPredictions).map(function(sub){
      var val=r.subjectPredictions[sub], c=UI.sc(val);
      return '<div class="srow"><div class="sname">'+sub+'</div><div class="swrap"><div class="pbar"><div class="pfill" style="width:'+val+'%;background:'+c+'"></div></div></div><div class="sscore" style="color:'+c+'">'+val+'</div></div>';
    }).join('') : '';

    var narrativeHtml = r.narrative
      ? '<div class="motiv" style="margin-bottom:16px"><div style="font-size:13px;font-weight:700;margin-bottom:10px">&#128172; AI Narrative (Claude)</div><div style="font-size:14px;line-height:1.7;color:#c7d2fe;font-style:italic">&ldquo;'+r.narrative+'&rdquo;</div></div>'
      : '';

    var html = '<div class="result-anim">'
      +'<div class="rhero"><div class="rgrade" style="background:'+gradeBg+'">'+r.grade+'</div>'
      +'<div class="rstats">'
      +'<div class="rsi"><div class="rsv" style="color:var(--accent)">'+r.predictedMark+'</div><div class="rsl">ML Predicted</div></div>'
      +'<div class="rsi"><div class="rsv" style="color:var(--green)">'+r.passProbability+'%</div><div class="rsl">Pass Prob.</div></div>'
      +'<div class="rsi"><div class="rsv" style="color:'+riskColor+';text-transform:capitalize">'+r.riskLevel+'</div><div class="rsl">Risk</div></div>'
      +'<div class="rsi"><div class="rsv">'+trendIcon+'</div><div class="rsl" style="text-transform:capitalize">'+r.trend+'</div></div>'
      +'</div></div>'
      +'<div class="g2">'
      +'<div class="card"><div class="stitle">&#128218; Subject Predictions</div>'+(subPredHtml||'<div style="color:var(--muted);font-size:13px">N/A</div>')+'</div>'
      +'<div class="card"><div class="stitle">&#129504; Model Breakdown</div>'
      +'<div class="model-info">'+UI.modelBreakdown(r.modelBreakdown, r.bestModel)+'</div>'
      +'<div style="font-size:11px;color:var(--muted);margin-top:10px">Ensemble weights: RF 45% + GB 40% + Ridge 15%</div>'
      +'</div></div>'
      +'<div class="g2">'
      +'<div class="card"><div class="stitle">&#128269; Feature Importance</div>'+UI.featureImportance(r.featureImportance)+'</div>'
      +'<div>'
      +narrativeHtml
      +'<div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(16,185,129,.04));border-color:rgba(16,185,129,.2)">'
      +'<div style="display:flex;align-items:center;gap:14px">'+UI.ringChart(r.passProbability, r.passProbability>=70?'var(--green)':r.passProbability>=50?'var(--gold)':'var(--red)', 80)
      +'<div><div style="font-size:14px;font-weight:700">Pass Probability</div><div style="font-size:12px;color:var(--muted);margin-top:4px">'+(r.passProbability>=80?'Excellent':r.passProbability>=60?'Good':'Needs work')+'</div>'
      +'<div style="font-size:11px;color:var(--muted);margin-top:6px">Trained on '+r.trainedOn+' samples</div></div></div></div>'
      +'<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:10px">&#128296; Model Used</div>'
      +'<div style="font-size:13px;color:var(--muted)">Weighted ensemble of <b style="color:var(--text)">Random Forest</b>, <b style="color:var(--text)">Gradient Boosting</b> and <b style="color:var(--text)">Ridge Regression</b>. Auto-retrains with new Firebase data.</div></div>'
      +'</div></div></div>';

    var pane = document.getElementById('pane-result');
    if (pane) pane.innerHTML = html;
  }

  // ══════════════════════════════════════════════════════════
  //  STUDENT DASHBOARD
  // ══════════════════════════════════════════════════════════
  function renderSDash(user) {
    var d = user.data||{};
    var last = (d.prevMarks&&d.prevMarks.length) ? d.prevMarks[d.prevMarks.length-1] : 0;
    var avg  = d.prevMarks&&d.prevMarks.length ? Math.round(d.prevMarks.reduce(function(a,b){return a+b;},0)/d.prevMarks.length) : 0;
    var subs = Object.keys(d.subjects||{}).map(function(k){return [k,d.subjects[k]];});
    var best  = subs.slice().sort(function(a,b){return b[1]-a[1];})[0] || ['N/A',0];
    var worst = subs.slice().sort(function(a,b){return a[1]-b[1];})[0] || ['N/A',0];
    var qavg  = d.quizScores&&d.quizScores.length ? Math.round(d.quizScores.reduce(function(a,b){return a+b;},0)/d.quizScores.length) : 0;

    M().innerHTML = '<div class="page">'
      +'<div class="ph"><div><div class="pt">Hello, '+user.name.split(' ')[0]+' &#128075;</div><div class="ps">'+(user.grade||'')+' Grade &bull; Performance Overview</div></div>'
      +'<button class="btn-ai" onclick="App.go(\'predict\')">&#129504; Get ML Prediction</button></div>'
      +'<div class="g4">'
      +UI.statCard('&#128203;','Attendance',(d.attendance||0)+'%',d.attendance>=80?'&#8593; Good':'&#8595; Improve',d.attendance>=80?'up':'dn')
      +UI.statCard('&#128221;','Last Exam',last,'out of 100','')
      +UI.statCard('&#128202;','Exam Avg',avg,'over '+(d.prevMarks&&d.prevMarks.length||0)+' exams','')
      +UI.statCard('&#11088;','Best Subject',best[0],best[1]+'/100','up')
      +'</div>'
      +'<div class="g2">'
      +'<div><div class="card" style="margin-bottom:18px"><div class="stitle">&#128200; Exam History</div>'+UI.chartBars(d.prevMarks||[0])+'</div>'
      +'<div class="card"><div class="stitle">&#128218; Subject Scores</div>'+UI.subjectBars(d.subjects||{})+'</div></div>'
      +'<div>'
      +'<div class="card" style="margin-bottom:18px"><div class="stitle">&#9889; Stats</div>'
      +'<div class="qsi"><div class="qsl">Study Hrs/Day</div><div class="qsv" style="color:var(--accent)">'+(d.studyHours||0)+'h</div></div>'
      +'<div class="qsi"><div class="qsl">Assignments</div><div class="qsv" style="color:var(--green)">'+(d.assignmentScore||0)+'/100</div></div>'
      +'<div class="qsi"><div class="qsl">Participation</div><div class="qsv" style="color:var(--purple)">'+(d.participation||0)+'/100</div></div>'
      +'<div class="qsi"><div class="qsl">Quiz Avg</div><div class="qsv" style="color:var(--gold)">'+qavg+'/100</div></div>'
      +'<div class="qsi"><div class="qsl">Focus Needed</div><div class="qsv" style="color:var(--red)">'+worst[0]+'</div></div>'
      +'</div>'
      +'<div class="motiv"><div style="font-size:13px;font-weight:700;margin-bottom:8px">&#128161; Tip</div>'
      +'<div style="font-size:13px;color:#c7d2fe;line-height:1.7">Your weakest subject is <b>'+worst[0]+'</b> ('+worst[1]+'/100). Spend 30 extra mins daily on it!</div></div>'
      +'<div style="margin-top:16px"><button class="btn-ai" style="width:100%;justify-content:center" onclick="App.go(\'predict\')">&#129504; Run ML Prediction &#8594;</button></div>'
      +'</div></div></div>';
  }

  // ══════════════════════════════════════════════════════════
  //  ADD / EDIT STUDENT MODAL
  // ══════════════════════════════════════════════════════════
  function openAddStudent() { openStudentModal(null); }
  function openEditStudent(sid) {
    API.fetchStudent(sid).then(function(st){ openStudentModal(st); });
  }

  function openStudentModal(st) {
    var isEdit = !!st;
    var v = st&&st.data ? st.data : {
      attendance:80, studyHours:3, assignmentScore:75, participation:70,
      prevMarks:[70,72,74,75], quizScores:[70,72,74,75],
      subjects:{Math:70,Science:70,English:70,History:70,CS:70}
    };
    var grades = ['9th','10th','11th','12th'];

    var html = '<div class="modal-header"><div class="modal-title">'+(isEdit?'&#9998; Edit':'&#43; Add')+' Student</div>'
      +'<button class="modal-close" onclick="Modal.close()">&#10005;</button></div>'
      +'<div class="field-row"><div class="field"><label>Full Name</label><input id="ns-name" value="'+(st?st.name:'')+'" placeholder="Student name"/></div>'
      +'<div class="field"><label>Grade</label><select id="ns-grade">'
      +grades.map(function(g){return '<option value="'+g+'"'+(st&&st.grade===g?' selected':'')+'>'+g+'</option>';}).join('')
      +'</select></div></div>'
      +'<div class="field-row"><div class="field"><label>Password '+(isEdit?'(blank = keep)':'*')+'</label><input type="password" id="ns-pass" placeholder="'+(isEdit?'Leave blank to keep':'Min 4 chars')+'"/></div>'
      +'<div class="field"><label>Confirm Password</label><input type="password" id="ns-pass2" placeholder="Repeat"/></div></div>'
      +'<div class="sec-divider"><span>Academic Data</span></div>'
      +'<div class="field-row"><div class="field"><label>Attendance (%)</label><input type="number" id="ns-att" min="0" max="100" value="'+v.attendance+'"/></div>'
      +'<div class="field"><label>Study Hrs/Day</label><input type="number" id="ns-study" min="0" max="16" step="0.5" value="'+v.studyHours+'"/></div></div>'
      +'<div class="field-row"><div class="field"><label>Assignment Score</label><input type="number" id="ns-assign" min="0" max="100" value="'+v.assignmentScore+'"/></div>'
      +'<div class="field"><label>Participation</label><input type="number" id="ns-part" min="0" max="100" value="'+v.participation+'"/></div></div>'
      +'<div class="sec-divider"><span>Subject Scores</span></div>'
      +'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">'
      +['Math','Science','English','History','CS'].map(function(sub){
        return '<div class="field"><label>'+sub+'</label><input type="number" id="ns-sub-'+sub+'" min="0" max="100" value="'+((v.subjects&&v.subjects[sub])||70)+'"/></div>';
      }).join('')+'</div>'
      +'<div class="sec-divider"><span>History (comma-separated)</span></div>'
      +'<div class="field-row"><div class="field"><label>Exam Marks</label><input id="ns-marks" value="'+(v.prevMarks||[]).join(',')+'" placeholder="70,75,80"/></div>'
      +'<div class="field"><label>Quiz Scores</label><input id="ns-quiz" value="'+(v.quizScores||[]).join(',')+'" placeholder="68,72,78"/></div></div>'
      +'<div id="modal-err" class="error-box hidden"></div>'
      +'<div class="modal-footer"><button class="btn-ol" onclick="Modal.close()">Cancel</button>'
      +'<button class="btn-ai" onclick="Pages.saveStudent(\''+(isEdit?st.id:'')+'\')">&#128190; '+(isEdit?'Save Changes':'Add Student')+'</button></div>';

    Modal.open(html);
  }

  function saveStudent(editId) {
    var errEl = document.getElementById('modal-err');
    errEl.classList.add('hidden');
    var name    = document.getElementById('ns-name').value.trim();
    var grade   = document.getElementById('ns-grade').value;
    var pass    = document.getElementById('ns-pass').value;
    var pass2   = document.getElementById('ns-pass2').value;
    var att     = parseInt(document.getElementById('ns-att').value)||0;
    var study   = parseFloat(document.getElementById('ns-study').value)||0;
    var assign  = parseInt(document.getElementById('ns-assign').value)||0;
    var part    = parseInt(document.getElementById('ns-part').value)||0;
    var marks   = document.getElementById('ns-marks').value.split(',').map(function(x){return parseInt(x.trim());}).filter(function(x){return !isNaN(x);});
    var quiz    = document.getElementById('ns-quiz').value.split(',').map(function(x){return parseInt(x.trim());}).filter(function(x){return !isNaN(x);});
    var subjects={};
    ['Math','Science','English','History','CS'].forEach(function(s){ subjects[s]=parseInt(document.getElementById('ns-sub-'+s).value)||0; });

    if (!name)         { errEl.textContent='Name required.'; errEl.classList.remove('hidden'); return; }
    if (!marks.length) { errEl.textContent='At least one exam mark required.'; errEl.classList.remove('hidden'); return; }
    if (pass && pass !== pass2) { errEl.textContent='Passwords do not match.'; errEl.classList.remove('hidden'); return; }
    if (!editId && pass.length < 4) { errEl.textContent='Password min 4 chars.'; errEl.classList.remove('hidden'); return; }

    var initials = name.split(' ').map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2);
    var payload = { name, grade, avatar:initials,
      data:{ attendance:att, studyHours:study, assignmentScore:assign, participation:part,
             prevMarks:marks, quizScores:quiz.length?quiz:marks, subjects }
    };
    if (pass) payload.password = pass;

    var apiCall = editId ? API.editStudent(editId, payload) : API.addStudent(payload);
    apiCall.then(function() {
      Modal.close();
      UI.toast(editId ? 'Student updated!' : 'Student added!', 'green');
      renderStudentsPage();
    }).catch(function(e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
    });
  }

  function confirmDelete(sid, name) {
    Modal.open('<div class="modal-header"><div class="modal-title">&#128465; Delete Student</div><button class="modal-close" onclick="Modal.close()">&#10005;</button></div>'
      +'<div style="font-size:14px;line-height:1.7;color:var(--muted);margin-bottom:8px">Remove <b style="color:var(--text)">'+name+'</b> permanently?</div>'
      +'<div class="modal-footer"><button class="btn-ol" onclick="Modal.close()">Cancel</button>'
      +'<button class="btn-danger" onclick="Pages.doDelete(\''+sid+'\')">&#128465; Yes, Delete</button></div>');
  }

  function doDelete(sid) {
    API.removeStudent(sid).then(function(){
      Modal.close();
      UI.toast('Student removed.', 'red');
      renderStudentsPage();
    }).catch(function(e){ UI.toast(e.message,'red'); });
  }

  // ── retrain model ────────────────────────────────────────
  function doRetrain() {
    UI.toast('Retraining models…', 'blue');
    API.retrainModel().then(function(r){
      UI.toast('Retrained on '+r.samples+' samples ✓', 'green');
    }).catch(function(e){ UI.toast('Retrain failed: '+e.message,'red'); });
  }

  return {
    renderTDash, renderStudentsPage, viewStudent,
    renderPredictListPage, renderModelPage,
    renderPredictPanel, renderSDash,
    updateSim, showTab, runMLPredict,
    openAddStudent, openEditStudent, openStudentModal,
    saveStudent, confirmDelete, doDelete, doRetrain
  };
})();
