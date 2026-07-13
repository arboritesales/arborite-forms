
// ── AUTO-UPDATE: when a new service worker takes over, reload to get latest files ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(function(reg) {
    reg.update();
    // Check for updates every time the user switches back to the tab
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') reg.update();
    });
  });
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    window.location.reload();
  });
}

// ── iOS COMPATIBILITY ──
if (typeof console === 'undefined') {
  window.console = {log:function(){},error:function(){},warn:function(){},assert:function(){}};
}
if (typeof console.assert !== 'function') { console.assert = function(){}; }

// ── AUTH ──
var AUDIT_PASS = 'audit2024';
var auditUnlocked = false;
var _supaSession = null;
function _storeSession(data) {
  _supaSession = data;
}

function _clearSession() {
  _supaSession = null;
}

function _authToken() {
  return (_supaSession && _supaSession.access_token) ? _supaSession.access_token : SUPA_KEY;
}

// Lock screen has two modes: 'team' (the shared login every field user uses)
// and 'manager' (a separate Supabase Auth account with the same UI/password
// gates, but managerUnlocked=true — see openVehRecord/openCatRecord/Survey Report).
var lockScreenMode = 'team';

function toggleManagerLogin() {
  lockScreenMode = (lockScreenMode === 'team') ? 'manager' : 'team';
  var sub = document.getElementById('lockSubtitle');
  var link = document.getElementById('lockModeLink');
  var inp = document.getElementById('lockPass');
  var err = document.getElementById('lockErr');
  if (lockScreenMode === 'manager') {
    if (sub) sub.textContent = 'Enter the manager password to continue';
    if (link) link.textContent = '← Team login';
  } else {
    if (sub) sub.textContent = 'Enter the team password to continue';
    if (link) link.textContent = 'Manager login';
  }
  if (inp) { inp.value = ''; inp.focus(); }
  if (err) err.textContent = '';
}

function checkPass() {
  var inp = document.getElementById('lockPass');
  var err = document.getElementById('lockErr');
  if (!inp) return;
  var password = inp.value;
  if (!password) return;
  inp.disabled = true;
  if (err) err.textContent = '';
  var email = (lockScreenMode === 'manager') ? ('manager' + '@arborite.app') : ('login' + '@arborite.app');
  fetch(SUPA_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {'Content-Type':'application/json','apikey':SUPA_KEY},
    body: JSON.stringify({email: email, password: password}),
    credentials: 'omit', mode: 'cors'
  })
  .then(function(r){ return r.json().then(function(d){ return {ok:r.ok,data:d}; }); })
  .then(function(res) {
    inp.disabled = false;
    if (res.ok && res.data.access_token) {
      _storeSession({access_token:res.data.access_token, refresh_token:res.data.refresh_token, expires_at:res.data.expires_at});
      managerUnlocked = (lockScreenMode === 'manager');
      var ls = document.getElementById('lockScreen');
      if (ls) ls.style.display = 'none';
      showJobSelectScreen();
    } else {
      if (err) err.textContent = 'Incorrect password — try again';
      inp.value = '';
      inp.focus();
    }
  })
  .catch(function() {
    inp.disabled = false;
    if (err) err.textContent = 'Connection error — try again';
    inp.focus();
  });
}



// ── CONFIG ──
var SUPA_URL = 'https://labskiotmfvdgcfbhbbl.supabase.co';
var SUPA_KEY = 'sb_publishable_D15QbbKwIm3FB1Lwdcn_YA_TxfXuDX9';
var TABLE    = 'job_forms';
var PANELS   = ['powa','signoff','method','daily','documents','emergency','safety'];
var STAFF, MACHINES, CUSTOM_STAFF, CUSTOM_MACHINES, allJobs, currentJobRef, pads, drCount, docStore;

function init() {
  CUSTOM_STAFF = []; CUSTOM_MACHINES = []; allJobs = []; currentJobRef = ''; pads = {}; drCount = 0; docStore = {};
  STAFF    = ["Joe Grace", "Liam Cooper", "Liam Couling", "Jason Hiscock", "Jack Fisher", "Luke Richardson", "James Hilborn", "Dave Norris", "Jon Challinor", "Joel Cripps", "Brook Taylor-Ware"];
  MACHINES = ["ARB Team", "Kubota 2.7", "CC145", "Cutter", "LV800", "Climber", "MEWP", "Hinowa 2010", "TPF", "FSID74", "Sub Contractor"];
}

// ── SHARED FIELD MAP ──
var SHARED_MAP = {
  p_client:     ['so_client','ms_client','dr_site'],
  p_address:    ['so_site','ms_site','wl_site','aud_site'],
  p_quote:      ['so_quote','ms_jobno','dr_quote','wl_quote'],
  so_site:      ['p_address','ms_site','wl_site','aud_site'],
  so_quote:     ['p_quote','ms_jobno','dr_quote','wl_quote'],
  so_works:     ['ms_scope','wl_scope'],
  wl_quote:     ['p_quote','so_quote','ms_jobno','dr_quote'],
  wl_site:      ['p_address','so_site','ms_site'],
  wl_scope:     ['so_works','ms_scope']
  // p_w3w removed — w3w fields sync directly to avoid restore wipe
  // p_supervisor removed — each form's supervisor is independent
  // aud_site removed — Audit is now a standalone form, not tied to a job
};

function buildSupervisorList() {
  var dl = document.getElementById('ms_supervisor_list');
  if (!dl) return;
  dl.innerHTML = '';
  var names = allStaff();
  for (var i = 0; i < names.length; i++) {
    var opt = document.createElement('option');
    opt.value = names[i];
    dl.appendChild(opt);
  }
}

function buildCompletedByList() {
  var dl = document.getElementById('completed_by_list');
  if (!dl) return;
  dl.innerHTML = '';
  var names = allStaff();
  for (var i = 0; i < names.length; i++) {
    var opt = document.createElement('option');
    opt.value = names[i];
    dl.appendChild(opt);
  }
}

function syncShared() {
  for (var src in SHARED_MAP) {
    var el = document.getElementById(src);
    var val = el ? el.value : '';
    var tgts = SHARED_MAP[src];
    for (var i = 0; i < tgts.length; i++) {
      var t = document.getElementById(tgts[i]);
      if (t && t.tagName === 'SELECT') {
        // For selects, find matching option or skip
        for (var oi = 0; oi < t.options.length; oi++) {
          if (t.options[oi].value === val) { t.value = val; break; }
        }
      } else if (t) {
        if (val) t.value = val;  // only overwrite target if source has a value
      }
    }
  }
}

// ── STAFF / MACHINES ──
function allStaff()    { return STAFF.concat(CUSTOM_STAFF); }
function allMachines() { return MACHINES.concat(CUSTOM_MACHINES); }

function makeStaffOpts(ph) {
  var o = '<option value="">-- ' + ph + ' --</option>';
  var list = allStaff();
  for (var i = 0; i < list.length; i++) o += '<option value="' + list[i] + '">' + list[i] + '</option>';
  o += '<option value="__new__">+ Add new name...</option>';
  return o;
}
function makeMachineOpts() {
  var o = '<option value="">-- Select task / machine --</option>';
  var list = allMachines();
  for (var i = 0; i < list.length; i++) o += '<option value="' + list[i] + '">' + list[i] + '</option>';
  o += '<option value="__new__">+ Add new...</option>';
  return o;
}
// Rebuild every name/machine dropdown's <option> list from the current
// STAFF/MACHINES + CUSTOM_STAFF/CUSTOM_MACHINES, preserving each select's
// current value. Must run after CUSTOM_STAFF/CUSTOM_MACHINES changes (a new
// name is added, a job is loaded, or forms are cleared for a new job) —
// otherwise a select's option list still reflects whatever was current when
// the page first loaded, and setting .value to a name not in that list
// silently fails (the field just appears blank).
function refreshStaffSelects() {
  var all = document.querySelectorAll('.staff-sel');
  for (var i = 0; i < all.length; i++) {
    var cur = all[i].value;
    var ph = (all[i].options[0] ? all[i].options[0].text.replace('-- ','').replace(' --','') : 'Select name');
    all[i].innerHTML = makeStaffOpts(ph);
    all[i].value = cur;
  }
}
function refreshMachineSelects() {
  var all = document.querySelectorAll('.machine-sel');
  for (var i = 0; i < all.length; i++) {
    var cur = all[i].value;
    all[i].innerHTML = makeMachineOpts();
    all[i].value = cur;
  }
}
function handleStaffSel(sel) {
  if (sel.value !== '__new__') return;
  var name = prompt('Enter new name:');
  if (!name || !name.trim()) { sel.value = ''; return; }
  name = name.trim();
  CUSTOM_STAFF.push(name);
  refreshStaffSelects();
  sel.value = name;
  buildAiderChecks();
}
function handleMachineSel(sel) {
  if (sel.value !== '__new__') return;
  var name = prompt('Enter new machine/task:');
  if (!name || !name.trim()) { sel.value = ''; return; }
  name = name.trim();
  CUSTOM_MACHINES.push(name);
  refreshMachineSelects();
  sel.value = name;
}
function toggleAllComms(cb) {
  var ids = ['comms_voice','comms_hand','comms_sena','comms_other'];
  for (var i = 0; i < ids.length; i++) document.getElementById(ids[i]).checked = cb.checked;
  document.getElementById('comms_other_text').style.display = cb.checked ? 'inline-block' : 'none';
}
function toggleCommsOther(cb) {
  document.getElementById('comms_other_text').style.display = cb.checked ? 'inline-block' : 'none';
  if (!cb.checked) document.getElementById('comms_other_text').value = '';
}

// ── TABS ──
function showTab(id, btn) {
  // Audit password is checked in openForm() when clicking the tile
  for (var i = 0; i < PANELS.length; i++) {
    document.getElementById(PANELS[i]).style.display = (PANELS[i] === id) ? 'block' : 'none';
  }
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    var isEmerg = tabs[i].classList.contains('tab-emergency');
    var base = isEmerg ? 'tab tab-emergency' : 'tab';
    var isActive = btn ? (tabs[i] === btn) : (tabs[i].getAttribute('onclick') && tabs[i].getAttribute('onclick').indexOf("'" + id + "'") >= 0);
    tabs[i].className = isActive ? base + ' active' : base;
  }
  window.scrollTo(0, 0);
  if (id === 'documents') setTimeout(_prefetchStorageDocs, 200);
  setTimeout(function() {
    // Only init canvases in the visible panel, then restore cached signatures
    var cs = document.querySelectorAll('#' + id + ' .sig-wrap canvas');
    for (var i = 0; i < cs.length; i++) {
      initSig(cs[i].id);
      if (sigCache[cs[i].id]) _paintSigOnCanvas(cs[i].id, sigCache[cs[i].id]);
    }
  }, 80);
}

// ── INIT ──
window.addEventListener('load', function() {
  init();
  for (var i = 0; i < PANELS.length; i++) {
    document.getElementById(PANELS[i]).style.display = 'none';
  }
  buildAll();
  setTimeout(initAllSigs, 400);
  setTimeout(renderAllDocLists, 500);
  // Pre-load job list so Load Job modal shows jobs immediately
  if (SUPA_URL !== 'YOUR_SUPABASE_URL') fetchJobList();
});

// ── BUILD ──
function buildAll() {
  buildCompTable();
  buildEquipTable();
  buildAiderChecks();
  buildAudOpsChecks();
  buildOpSigs('opSigsPowa', 5, 'po');
  // opSigsMethod replaced by 15 individual sig boxes
  buildDailyRows(12);
  initAllStaffSelects();
  initDocDropZones();
}

function initAllStaffSelects() {
  // Populate non-staff-sel selects that need staff names
  var extraSels = ['ms_supervisor','p_completed_by'];
  for (var ei = 0; ei < extraSels.length; ei++) {
    var es = document.getElementById(extraSels[ei]);
    if (es && es.tagName === 'SELECT' && (!es.options || es.options.length < 2)) {
      var ph2 = (extraSels[ei] === 'ms_supervisor') ? 'Select site supervisor' : 'Select name';
      es.innerHTML = makeStaffOpts(ph2);
    }
  }
  var selects = document.querySelectorAll('.staff-sel');
  for (var i = 0; i < selects.length; i++) {
    var s = selects[i];
    var ph = 'Select name';
    if (s.id === 'ms_supervisor' || s.id === 'p_supervisor' || s.id === 'dr_supervisor') ph = 'Select site supervisor';
    if (!s.options || s.options.length === 0) {
      s.innerHTML = makeStaffOpts(ph);
    }
  }
}

function buildAudOpsChecks() {
  var wrap = document.getElementById('aud_ops_checks');
  if (!wrap) return;
  var list = allStaff(), h = '';
  for (var i = 0; i < list.length; i++) {
    h += '<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;white-space:nowrap;padding:2px 0;">'
      + '<input type="checkbox" id="aud_op_' + i + '" value="' + list[i] + '" style="width:15px;height:15px;accent-color:var(--green);">'
      + ' ' + list[i] + '</label>';
  }
  wrap.innerHTML = h;
}

function buildCompTable() {
  var Qs = [
    ['Does the site foreman have access to company documentation at the point of work?',['Yes','No']],
    ['Has the client been briefed on the work to be undertaken?',['Yes','Client not available']],
    ['Has the client identified any significant hazards?',['Yes','No','N/a']],
    ['Have the hazards identified by the client been considered in the SMP?',['Yes','No','N/a']],
    ['Have company vehicles been parked safely, appropriately and courteously?',['Yes','N/a']],
    ['Have all reasonable approaches to the worksite been adequately signed and guarded?',['Yes','N/a']],
    ['Do operators hold competencies relevant to the work / equipment to be used?',['Yes','No']],
    ['Has all equipment been subject to pre-use checks, is serviceable with safety features present?',['Yes']],
    ['Are all operators wearing correct PPE, free from defect and fit for use?',['Yes','N/a']],
    ['Are there visible signs of protected species e.g. nesting birds, bats etc.?',['Yes','No','N/a']],
    ['If protected species observed, has a disturbance assessment been completed?',['Yes','No','N/a']],
    ['Are vehicles secure with valuables out of sight?',['Yes','N/a']],
    ['Has an appropriate fuelling point been selected with proactive spill provision?',['Yes','N/a']],
    ['Is the weather suitable for the work to be completed?',['Yes','No']],
    ['Is a concerning Pest and/or Disease present or suspected on or adjacent to the site?',['Yes','No','Unknown']]
  ];
  var tbody = document.getElementById('compQ'), rows = '';
  for (var i = 0; i < Qs.length; i++) {
    var opts = '';
    for (var j = 0; j < Qs[i][1].length; j++) {
      opts += '<label class="opt"><input type="radio" name="cq' + i + '" value="' + Qs[i][1][j] + '"> ' + Qs[i][1][j] + '</label>';
    }
    rows += '<tr><td>' + Qs[i][0] + '</td><td class="ac"><div class="opts" style="justify-content:center;">' + opts + '</div></td></tr>';
  }
  tbody.innerHTML = rows;
}

function buildEquipTable() {
  var items = ['Emergency Contingencies (EC)','Site Considerations (SC)','Environmental Considerations (EnC)',
    'Machinery Considerations (MC)','Chainsaw (C)','Tree Climbing (TC)','Chainsaw in The Tree (CT)',
    'Tree Felling (TF)','Hand Held Pruning Tools (PT)','Tree Planting (TP)',
    'Blower, Vacuum, Sucker (BVS)','Brushwood Chipper (BC)','Stump Grinder (SG)','Winches (W)',
    'Brushcutter / Trimmer / Clearing Saw (BTC)','Hedgetrimmers (HT)','Mechanised Pole Pruner (MPP)',
    'Hydraulic Loading Arm (HLA)','MEWP','Compact Loading Machine (CLM)','Excavator (EX)',
    'Ladders (LAD)','Tractor Use (TU)'];
  var tbody = document.getElementById('equipRows'), rows = '';
  for (var i = 0; i < items.length; i++) {
    rows += '<tr><td>' + items[i] + '</td>'
      + '<td><input type="checkbox" id="eq_' + i + '_pre"></td>'
      + '<td><input type="checkbox" id="eq_' + i + '_day"></td></tr>';
  }
  tbody.innerHTML = rows;
}

function buildAiderChecks() {
  var wrap = document.getElementById('aider_checks');
  if (!wrap) return;
  var list = allStaff(), h = '';
  for (var i = 0; i < list.length; i++) {
    h += '<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;white-space:nowrap;padding:2px 0;">'
      + '<input type="checkbox" id="aider_' + i + '" value="' + list[i] + '" style="width:15px;height:15px;accent-color:var(--green);">'
      + ' ' + list[i] + '</label>';
  }
  wrap.innerHTML = h;
}

function buildOpSigs(cid, count, prefix) {
  var c = document.getElementById(cid);
  if (!c) return;
  var h = '<div class="op-grid">';
  for (var i = 1; i <= count; i++) {
    var sid = prefix + '_s' + i, nid = prefix + '_n' + i, did = prefix + '_d' + i;
    var br = (i % 2 === 1) ? 'border-right:1px solid var(--border);' : '';
    h += '<div class="op-cell" style="' + br + '">';
    h += '<div style="display:flex;align-items:center;margin-bottom:6px;">';
    h += '<span class="op-num">' + i + '</span>';
    h += '<select id="' + nid + '" class="staff-sel" style="flex:1;" onchange="handleStaffSel(this)">' + makeStaffOpts('Select operator') + '</select>';
    h += '</div><div class="sig-lbl">Signature</div>';
    h += '<div class="sig-wrap"><canvas id="' + sid + '" height="90"></canvas>';
    h += '<button class="sig-clr" data-sig="' + sid + '" onclick="clrSig(this.dataset.sig)">Clear</button></div>';
    h += '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11px;color:var(--mid);">';
    h += 'Date: <input id="' + did + '" type="date" style="border-bottom:1px solid var(--border);padding:2px;font-size:11px;background:transparent;border-top:none;border-left:none;border-right:none;outline:none;">';
    h += '</div></div>';
  }
  h += '</div>';
  c.innerHTML = h;
}

function buildDailyRows(n) { for (var i = 0; i < n; i++) addDrRow(); }

function addDrRow() {
  var tbody = document.getElementById('drRows');
  if (!tbody) return;
  var i = ++drCount, sid = 'dr_s' + i;
  var did = 'dr_date' + i, tiin = 'dr_in' + i, tout = 'dr_out' + i;
  var mid = 'dr_mach' + i;
  var mSel = '<select id="' + mid + '" class="machine-sel" onchange="handleMachineSel(this)">' + makeMachineOpts() + '</select>';
  var sSel = '<select id="dr_name' + i + '" class="staff-sel" onchange="handleStaffSel(this)">' + makeStaffOpts('Select name') + '</select>';
  var tr = document.createElement('tr');
  tr.innerHTML = '<td><input type="date" id="' + did + '"></td>'
    + '<td><input type="text" id="' + tiin + '" placeholder="08:00"></td>'
    + '<td><input type="text" id="' + tout + '" placeholder="17:00"></td>'
    + '<td>' + mSel + '</td><td>' + sSel + '</td>'
    + '<td class="sig-cell"><div class="sig-wrap"><canvas id="' + sid + '" height="90"></canvas>'
    + '<button class="sig-clr" data-sig="' + sid + '" onclick="clrSig(this.dataset.sig)">&#x2715;</button></div></td>';
  tbody.appendChild(tr);
  // Wire autosave immediately — rows added via "+ Add Row" while the panel
  // is already open never get listeners otherwise (attachAutoSave only runs
  // when the panel is opened), so typing in a fresh row silently went unsaved.
  wireAutoSaveOn(tr, 'daily');
  setTimeout(function(s){ return function(){ initSig(s); }; }(sid), 100);
}

// Ensure the Daily Task Register has at least as many rows as the saved
// data references (e.g. dr_date14 exists) — otherwise those fields have
// nowhere to restore into, and the next autosave (a full overwrite) wipes
// them from the database for good.
function ensureDailyRowsFor(data) {
  if (!data) return;
  var maxN = 12;
  for (var k in data) {
    var m = /^dr_date(\d+)$/.exec(k);
    if (m) { var n = parseInt(m[1], 10); if (n > maxN) maxN = n; }
  }
  while (drCount < maxN) addDrRow();
}

