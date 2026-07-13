// ── AUDITS (standalone, not tied to a job) ──
var currentAuditRef = null;

function openAuditView() {
  document.getElementById('auditView').style.display = 'block';
  fetchAuditList();
  showAuditList();
}

function closeAuditView() {
  document.getElementById('auditView').style.display = 'none';
}

function showAuditList() {
  document.getElementById('auditListPanel').style.display = 'block';
  document.getElementById('auditFormPanel').style.display = 'none';
  currentAuditRef = null;
  document.getElementById('auditView').scrollTop = 0;
}

function fetchAuditList() {
  var listEl = document.getElementById('auditList');
  listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">Loading...</div>';
  supaFetch('GET', TABLE + '?select=id,quote_ref,updated_at,form_data&quote_ref=like.AUD-*&order=updated_at.desc&limit=100')
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      if (!Array.isArray(rows) || rows.length === 0) {
        listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">No audits saved yet.<br><br>Tap <strong style="color:#7ec820;">+ New Audit</strong> to create one.</div>';
        return;
      }
      var html = '<div style="display:flex;flex-direction:column;gap:12px;">';
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var d = row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
        var site = (row.form_data && row.form_data.aud_site) ? row.form_data.aud_site : '';
        var auditor = (row.form_data && row.form_data.aud_auditor) ? row.form_data.aud_auditor : '';
        var ref = row.quote_ref;
        var mainLine = site ? site : ref;
        var subLine = (auditor ? auditor + ' &nbsp;·&nbsp; ' : '') + (site ? ref + ' &nbsp;·&nbsp; ' : '') + d;
        html += '<div style="background:#305818;border:1px solid rgba(126,200,32,.4);border-radius:8px;padding:16px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;-webkit-tap-highlight-color:transparent;" onclick="loadAudit(\'' + ref + '\')">'
          + '<div style="flex:1;min-width:0;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:800;color:#7ec820;letter-spacing:.5px;">' + mainLine + '</div>'
          + '<div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;">' + subLine + '</div></div>'
          + '<div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">'
          + '<button onclick="event.stopPropagation();deleteAudit(\'' + ref + '\')" style="background:none;border:1px solid rgba(255,100,100,.5);border-radius:3px;color:#ff8888;font-size:14px;padding:3px 8px;cursor:pointer;line-height:1.4;" title="Delete">&#x1F5D1;</button>'
          + '<div style="font-size:22px;color:rgba(126,200,32,.6);">&#8250;</div>'
          + '</div>'
          + '</div>';
      }
      html += '</div>';
      listEl.innerHTML = html;
    })
    .catch(function() {
      listEl.innerHTML = '<div style="color:#f8d7da;padding:30px;text-align:center;font-size:13px;">Could not load records — check connection.</div>';
    });
}

function generateAuditRef() {
  var d = new Date();
  var yr = d.getFullYear();
  var mo = String(d.getMonth()+1).padStart(2,'0');
  var dy = String(d.getDate()).padStart(2,'0');
  var rand = String(Math.floor(Math.random()*900)+100);
  return 'AUD-' + yr + mo + dy + '-' + rand;
}

function newAudit() {
  clearAuditForm(true);
  currentAuditRef = generateAuditRef();
  document.getElementById('auditRef').textContent = currentAuditRef;
  document.getElementById('aud_date').value = new Date().toISOString().slice(0,10);
  showAuditForm();
}

function showAuditForm() {
  document.getElementById('auditListPanel').style.display = 'none';
  document.getElementById('auditFormPanel').style.display = 'block';
  document.getElementById('auditView').scrollTop = 0;
  setTimeout(function() { initSig('s-auditor'); }, 60);
}

function clearAuditForm(skipConfirm) {
  if (!skipConfirm && !confirm('Clear all fields on this form?')) return;
  var panel = document.getElementById('auditFormPanel');
  var inputs = panel.querySelectorAll('input[type="text"], input[type="date"], input[type="hidden"], textarea');
  for (var i = 0; i < inputs.length; i++) inputs[i].value = '';
  var sels = panel.querySelectorAll('select');
  for (var i = 0; i < sels.length; i++) sels[i].selectedIndex = 0;
  var checks = panel.querySelectorAll('input[type="radio"], input[type="checkbox"]');
  for (var i = 0; i < checks.length; i++) checks[i].checked = false;
  var btns = ['excellent','satisfactory','unsatisfactory'];
  for (var i = 0; i < btns.length; i++) {
    var b = document.getElementById('ovr_' + btns[i]);
    if (b) b.className = 'ovr-btn';
  }
  var cv = document.getElementById('s-auditor');
  if (cv) {
    var p = pads['s-auditor'];
    if (p && p.ctx && p.sized) p.ctx.clearRect(0, 0, cv.width, cv.height);
    if (p) p.dataUrl = null;
  }
}

function loadAudit(ref) {
  currentAuditRef = ref;
  document.getElementById('auditRef').textContent = ref;
  supaFetch('GET', TABLE + '?quote_ref=eq.' + encodeURIComponent(ref) + '&select=form_data&limit=1')
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      clearAuditForm(true);
      showAuditForm();
      if (!rows || !rows[0] || !rows[0].form_data) return;
      restoreAuditData(rows[0].form_data);
    })
    .catch(function() { showAuditForm(); });
}

function collectAuditData() {
  var panel = document.getElementById('auditFormPanel');
  var data = { signatures: {} };
  var inputs = panel.querySelectorAll('input[type="text"][id], input[type="date"][id], input[type="hidden"][id], textarea[id], select[id]');
  for (var i = 0; i < inputs.length; i++) data[inputs[i].id] = inputs[i].value;
  var radios = panel.querySelectorAll('input[type="radio"]:checked');
  for (var i = 0; i < radios.length; i++) data[radios[i].name] = radios[i].value;
  var checks = panel.querySelectorAll('input[type="checkbox"][id]');
  for (var i = 0; i < checks.length; i++) data[checks[i].id] = checks[i].checked;
  var cv = document.getElementById('s-auditor');
  var p = pads['s-auditor'];
  if (p && p.dataUrl && p.dataUrl.indexOf('storage:') === 0) {
    data.signatures['s-auditor'] = p.dataUrl;
  } else if (cv && p && p.sized) {
    try {
      var tmp = document.createElement('canvas');
      tmp.width = cv.width; tmp.height = cv.height;
      var ctx2 = tmp.getContext('2d');
      ctx2.fillStyle = '#ffffff';
      ctx2.fillRect(0, 0, tmp.width, tmp.height);
      ctx2.drawImage(cv, 0, 0);
      var url = tmp.toDataURL('image/jpeg', 0.6);
      if (url && url.length > 100) data.signatures['s-auditor'] = url;
    } catch(e) {}
  }
  return data;
}

function restoreAuditData(data) {
  if (!data) return;
  var panel = document.getElementById('auditFormPanel');
  var inputs = panel.querySelectorAll('input[type="text"][id], input[type="date"][id], input[type="hidden"][id], textarea[id], select[id]');
  for (var i = 0; i < inputs.length; i++) {
    if (data[inputs[i].id] !== undefined) inputs[i].value = data[inputs[i].id];
  }
  var radioGroups = panel.querySelectorAll('input[type="radio"][name]');
  var seenNames = {};
  for (var i = 0; i < radioGroups.length; i++) {
    var name = radioGroups[i].name;
    if (seenNames[name]) continue;
    seenNames[name] = true;
    if (data[name] !== undefined) {
      var rads = panel.querySelectorAll('input[type="radio"][name="' + name + '"]');
      for (var j = 0; j < rads.length; j++) rads[j].checked = (rads[j].value === data[name]);
    }
  }
  var checks = panel.querySelectorAll('input[type="checkbox"][id]');
  for (var i = 0; i < checks.length; i++) {
    if (data[checks[i].id] !== undefined) checks[i].checked = !!data[checks[i].id];
  }
  if (data.aud_overall) setOverall(data.aud_overall);
  if (data.signatures && data.signatures['s-auditor']) {
    setTimeout(function() { restoreSig('s-auditor', data.signatures['s-auditor']); }, 80);
  }
}

function saveAudit() {
  if (!currentAuditRef) return;
  var btn = document.getElementById('auditSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  var data = collectAuditData();
  var payload = { quote_ref: currentAuditRef, updated_at: new Date().toISOString(), form_data: data };
  supaFetch('POST', TABLE + '?on_conflict=quote_ref', payload)
    .then(function(r) {
      if (btn) btn.disabled = false;
      if (r.ok || r.status === 201 || r.status === 204) {
        if (btn) { btn.textContent = '✓ Saved'; setTimeout(function(){ btn.textContent = 'Save'; }, 2000); }
      } else {
        if (btn) { btn.textContent = 'Save failed'; setTimeout(function(){ btn.textContent = 'Save'; }, 2500); }
      }
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.textContent = 'Save failed'; setTimeout(function(){ btn.textContent = 'Save'; }, 2500); }
    });
}

function printAudit() {
  var view = document.getElementById('auditView');
  view.classList.add('printing-audit');
  _printWithClass(function() { view.classList.remove('printing-audit'); });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./service-worker.js').then(function(reg) {
      // Force check for a new version every time the app loads
      reg.update();
      // Watch for a new SW being installed
      reg.addEventListener('updatefound', function() {
        var newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function() {
          // Once the new SW is fully activated, reload to get fresh files
          if (newWorker.state === 'activated') {
            window.location.reload();
          }
        });
      });
      // Fallback: also reload on controllerchange (covers skipWaiting path)
      navigator.serviceWorker.addEventListener('controllerchange', function() {
        window.location.reload();
      });
    }).catch(function() {});
  });
  // Check for updates whenever the app comes back into focus on phone
  window.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then(function(reg) {
        if (reg) reg.update();
      });
    }
  });
}
