// ── METHOD STATEMENT BUILDER (standalone, not tied to a job) ──
// Office → "Build Your Method Statement". Saved documents ride in the same
// job_forms table as Toolbox Talks/Audits, quote_ref prefixed 'MSB-...'.
// Reference data (staff/PPE/SOPs/equipment/exclusion zones/fixed policy
// sections/known hazards) lives in its own ms_* tables — see
// supabase_method_statement_builder.sql.

var msbLogoBase64 = "data:image/png;base64,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";

// PPE that's always included regardless of task selected
var msbBasePPE = ["ppe_helmet", "ppe_hivis", "ppe_boots", "ppe_gloves", "ppe_eye"];

// Contractor is always us — fixed, not user-editable
var MSB_CONTRACTOR_LINES = ["Arborite Tree Services Ltd", "Oxford House", "12-20 Oxford Street", "NEWBURY", "Berkshire", "RG14 1JB"];

// Fixed sequence of work that always appears in 2.0 Work Methodology, below the job-specific overview
var MSB_METHODOLOGY_FIXED_POINTS = [
  "When operators arrive for the first time on site, a site induction will have been booked in with the client. This induction will be site specific, and an operative cannot start work until this has been completed.",
  "A pre commencement meeting shall take place between all operators prior to works starting to be briefed on the method statement and ensure everyone understands the agreed systems of work.",
  "All machinery and equipment shall be subject to pre use checks by competent operators to confirm their suitability for use.",
  "Checklists on plant prior to commencing works shall be completed.",
  "Works will be undertaken within a site signed and guarded on all reasonably foreseeable approaches, using banks person deployed to manage third party access.",
  "Material shall be placed in the designed processing area for woodchipping and removal off site.",
  "The site shall be left in a clean and tidy state, handed back to client."
];

var MSB_STEPS = [
  {key:"job", label:"Job Details"},
  {key:"team", label:"Team & Competency"},
  {key:"plant", label:"Plant & Machinery"},
  {key:"sops", label:"SOPs & Exclusion Zones"},
  {key:"ppe", label:"PPE Assignment"},
  {key:"emergency", label:"Emergency Arrangements"},
  {key:"review", label:"Review & Generate"}
];

var currentMSBRef = null;
var msbStep = 0;
var msbState = null;
var msbRefLib = { staff:[], ppe:[], ez:[], equipment:[], sops:[], hazards:[], fixedSections:[] };
var msbRefLibPromise = null;

function _msbEl(html) {
  var d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstChild;
}
function _msbFmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB') : '—'; }

function resetMSBState() {
  msbState = {
    job: { titleOfDocument:'', client:'', siteAddress:'', what3words:'', workingDays:'', scope:'', methodology:'', methodologyPoints: MSB_METHODOLOGY_FIXED_POINTS.slice(), signOffDate:'', permitsIssuedBy: { highways:'', breakingGround:'' }, clientContactName:'', clientContactPhone:'', clientContactEmail:'', siteControlImages:[], siteControlComments:'' },
    team: [], equipment: [], selectedSOPs: [], selectedExclusionZones: [], ppeAssignments: {},
    emergency: { hospitalName:'', hospitalAddress:'', hospitalPhone:'', routeMap:{storagePath:'',status:''}, routeDistance:'', routeTime:'' },
    status: 'draft', sentAt: null
  };
}

// ── REFERENCE LIBRARY (ms_* tables) ──
function ensureMSBRefLibrary() {
  if (!msbRefLibPromise) msbRefLibPromise = fetchMSBRefLibrary();
  return msbRefLibPromise;
}

function fetchMSBRefLibrary() {
  return Promise.all([
    supaFetch('GET', 'ms_ppe_library?select=*'),
    supaFetch('GET', 'ms_exclusion_zone_library?select=*'),
    supaFetch('GET', 'ms_equipment_library?select=*'),
    supaFetch('GET', 'ms_sop_library?select=*'),
    supaFetch('GET', 'ms_staff?select=*'),
    supaFetch('GET', 'ms_known_hazards?select=*&order=sort_order'),
    supaFetch('GET', 'ms_fixed_sections?select=*')
  ]).then(function(resArr) {
    resArr.forEach(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); });
    return Promise.all(resArr.map(function(r) { return r.json(); }));
  }).then(function(data) {
    msbRefLib.ppe = data[0];
    msbRefLib.ez = data[1];
    msbRefLib.equipment = data[2];
    msbRefLib.sops = data[3].map(function(s) {
      return { id:s.id, category:s.category, heading:s.heading, description:s.description, requiredPPE:s.required_ppe, exclusionZones:s.exclusion_zones };
    });
    msbRefLib.staff = data[4].map(function(p) {
      return { id:p.id, name:p.name, defaultRole:p.default_role, firstAider:p.first_aider, competencies:p.competencies };
    });
    msbRefLib.hazards = data[5].map(function(h) { return { hazard:h.hazard, control:h.control }; });
    msbRefLib.fixedSections = data[6].slice().sort(function(a,b) { return parseFloat(a.n) - parseFloat(b.n); });
  }).catch(function(e) {
    msbRefLibPromise = null; // allow retry
    throw e;
  });
}

function _msbFindStaff(id) {
  for (var i = 0; i < msbRefLib.staff.length; i++) if (msbRefLib.staff[i].id === id) return msbRefLib.staff[i];
  return null;
}
function _msbFindSop(id) {
  for (var i = 0; i < msbRefLib.sops.length; i++) if (msbRefLib.sops[i].id === id) return msbRefLib.sops[i];
  return null;
}
function _msbFindEZ(id) {
  for (var i = 0; i < msbRefLib.ez.length; i++) if (msbRefLib.ez[i].id === id) return msbRefLib.ez[i];
  return null;
}
function _msbFindPPE(id) {
  for (var i = 0; i < msbRefLib.ppe.length; i++) if (msbRefLib.ppe[i].id === id) return msbRefLib.ppe[i];
  return null;
}
function _msbStaffRoles() {
  var seen = {}, out = ['Project Manager', 'Site Supervisor'];
  out.forEach(function(r) { seen[r] = true; });
  msbRefLib.staff.forEach(function(p) { if (!seen[p.defaultRole]) { seen[p.defaultRole] = true; out.push(p.defaultRole); } });
  return out;
}

function derivePPEForMSB() {
  var seen = {}, order = [];
  msbBasePPE.forEach(function(id) { if (!seen[id]) { seen[id] = true; order.push(id); } });
  msbState.selectedSOPs.forEach(function(sopId) {
    var sop = _msbFindSop(sopId);
    if (sop) sop.requiredPPE.forEach(function(id) { if (!seen[id]) { seen[id] = true; order.push(id); } });
  });
  return order.map(_msbFindPPE).filter(Boolean);
}
function deriveExclusionZonesFromMSBSops() {
  var seen = {}, order = [];
  msbState.selectedSOPs.forEach(function(sopId) {
    var sop = _msbFindSop(sopId);
    if (sop) sop.exclusionZones.forEach(function(id) { if (!seen[id]) { seen[id] = true; order.push(id); } });
  });
  return order;
}
// Jon Challinor and Joel Cripps are normally site-visit only, not field
// operators — default their PPE to unticked so they pick only what they
// actually need, rather than starting with the full field-operator set.
var MSB_REDUCED_DEFAULT_PPE_STAFF_IDS = ['s1', 's3'];
function ensureMSBPPEAssignments() {
  var derived = derivePPEForMSB();
  msbState.team.forEach(function(t) {
    if (!msbState.ppeAssignments[t.staffId]) msbState.ppeAssignments[t.staffId] = {};
    var defaultChecked = MSB_REDUCED_DEFAULT_PPE_STAFF_IDS.indexOf(t.staffId) === -1;
    derived.forEach(function(p) {
      if (msbState.ppeAssignments[t.staffId][p.id] === undefined) msbState.ppeAssignments[t.staffId][p.id] = defaultChecked;
    });
  });
}

// ── VIEW / LIST / RECORD LIFECYCLE ──
function openMSBView() {
  document.getElementById('msbView').style.display = 'block';
  ensureMSBRefLibrary().catch(function() {});
  showMSBList();
}
function closeMSBView() {
  document.getElementById('msbView').style.display = 'none';
}
function showMSBList() {
  document.getElementById('msbListPanel').style.display = 'block';
  document.getElementById('msbDeletedListPanel').style.display = 'none';
  document.getElementById('msbFormPanel').style.display = 'none';
  currentMSBRef = null;
  document.getElementById('msbView').scrollTop = 0;
  fetchMSBList();
}
function showMSBForm() {
  document.getElementById('msbListPanel').style.display = 'none';
  document.getElementById('msbDeletedListPanel').style.display = 'none';
  document.getElementById('msbFormPanel').style.display = 'block';
  document.getElementById('msbView').scrollTop = 0;
}
function showMSBDeletedList() {
  document.getElementById('msbListPanel').style.display = 'none';
  document.getElementById('msbFormPanel').style.display = 'none';
  document.getElementById('msbDeletedListPanel').style.display = 'block';
  document.getElementById('msbView').scrollTop = 0;
  fetchMSBDeletedList();
}

// Full form_data for every row currently shown, keyed by quote_ref — lets
// delete/restore merge in a deletedAt flag without a round-trip fetch.
var _msbListRowsCache = {};

function fetchMSBList() {
  var listEl = document.getElementById('msbList');
  listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">Loading...</div>';
  Promise.all([
    supaFetch('GET', TABLE + '?select=id,quote_ref,updated_at,form_data&quote_ref=like.MSB-*&form_data->>deletedAt=is.null&order=updated_at.desc&limit=100').then(function(r) { return r.json(); }),
    supaFetch('GET', TABLE + '?select=id&quote_ref=like.MSB-*&form_data->>deletedAt=not.is.null&limit=1000').then(function(r) { return r.json(); }).catch(function() { return []; })
  ]).then(function(results) {
      var rows = results[0], deletedRows = results[1];
      var countEl = document.getElementById('msbDeletedCount');
      if (countEl) countEl.textContent = (Array.isArray(deletedRows) && deletedRows.length) ? ' (' + deletedRows.length + ')' : '';
      if (!Array.isArray(rows) || rows.length === 0) {
        listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">No method statements saved yet.<br><br>Tap <strong style="color:#7ec820;">+ New Method Statement</strong> to create one.</div>';
        return;
      }
      var html = '<div style="display:flex;flex-direction:column;gap:12px;">';
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        _msbListRowsCache[row.quote_ref] = row.form_data || {};
        var fd = row.form_data || {};
        var job = fd.job || {};
        var d = row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
        var ref = row.quote_ref;
        var mainLine = job.client || job.titleOfDocument || ref;
        var subLine = (job.siteAddress ? job.siteAddress + ' &nbsp;·&nbsp; ' : '') + d;
        var badge = fd.status === 'sent'
          ? '<span class="msb-badge sent">Sent to Customer' + (fd.sentAt ? ' — ' + _msbFmtDate(fd.sentAt) : '') + '</span>'
          : '<span class="msb-badge draft">Draft</span>';
        html += '<div style="background:#305818;border:1px solid rgba(126,200,32,.4);border-radius:8px;padding:16px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;-webkit-tap-highlight-color:transparent;" onclick="loadMSB(\'' + ref + '\')">'
          + '<div style="flex:1;min-width:0;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:800;color:#7ec820;letter-spacing:.5px;">' + mainLine + '</div>'
          + '<div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;">' + subLine + '</div>'
          + '<div style="margin-top:6px;">' + badge + '</div></div>'
          + '<div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">'
          + '<button onclick="event.stopPropagation();deleteMSB(\'' + ref + '\')" style="background:none;border:1px solid rgba(255,100,100,.5);border-radius:3px;color:#ff8888;font-size:14px;padding:3px 8px;cursor:pointer;line-height:1.4;" title="Delete">&#x1F5D1;</button>'
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

function fetchMSBDeletedList() {
  var listEl = document.getElementById('msbDeletedList');
  listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">Loading...</div>';
  supaFetch('GET', TABLE + '?select=id,quote_ref,updated_at,form_data&quote_ref=like.MSB-*&form_data->>deletedAt=not.is.null&order=updated_at.desc&limit=100')
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      if (!Array.isArray(rows) || rows.length === 0) {
        listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">Nothing deleted right now.</div>';
        return;
      }
      var html = '<div style="display:flex;flex-direction:column;gap:12px;">';
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        _msbListRowsCache[row.quote_ref] = row.form_data || {};
        var fd = row.form_data || {};
        var job = fd.job || {};
        var ref = row.quote_ref;
        var mainLine = job.client || job.titleOfDocument || ref;
        var deletedWhen = fd.deletedAt ? _msbFmtDate(fd.deletedAt) : '—';
        html += '<div style="background:#3a2010;border:1px solid rgba(255,150,80,.35);border-radius:8px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;">'
          + '<div style="flex:1;min-width:0;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:800;color:#ffb066;letter-spacing:.5px;">' + mainLine + '</div>'
          + '<div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;">Deleted ' + deletedWhen + '</div></div>'
          + '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'
          + '<button onclick="restoreMSB(\'' + ref + '\')" class="btn btn-clear" style="padding:6px 12px;font-size:12px;">Restore</button>'
          + '<button onclick="permanentlyDeleteMSB(\'' + ref + '\')" style="background:none;border:1px solid rgba(255,100,100,.5);border-radius:3px;color:#ff8888;font-size:12px;padding:6px 10px;cursor:pointer;">Delete Permanently</button>'
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

function generateMSBRef() {
  var d = new Date();
  var yr = d.getFullYear();
  var mo = String(d.getMonth()+1).padStart(2,'0');
  var dy = String(d.getDate()).padStart(2,'0');
  var rand = String(Math.floor(Math.random()*900)+100);
  return 'MSB-' + yr + mo + dy + '-' + rand;
}

function newMSB() {
  showMSBForm();
  document.getElementById('msbStepNav').innerHTML = '';
  document.getElementById('msbStepContent').innerHTML = '<div class="msb-main"><div class="msb-note">Loading reference data…</div></div>';
  ensureMSBRefLibrary().then(function() {
    resetMSBState();
    currentMSBRef = generateMSBRef();
    document.getElementById('msbRef').textContent = currentMSBRef;
    msbStep = 0;
    renderMSBAll();
  }).catch(function() {
    document.getElementById('msbStepContent').innerHTML = '<div class="msb-main"><div class="msb-note" style="border-left-color:#c62828;">Could not load reference data (staff/SOPs/PPE/equipment) — check connection and try again.</div></div>';
  });
}

function loadMSB(ref) {
  currentMSBRef = ref;
  showMSBForm();
  document.getElementById('msbRef').textContent = ref;
  document.getElementById('msbStepNav').innerHTML = '';
  document.getElementById('msbStepContent').innerHTML = '<div class="msb-main"><div class="msb-note">Loading…</div></div>';
  Promise.all([
    ensureMSBRefLibrary(),
    supaFetch('GET', TABLE + '?quote_ref=eq.' + encodeURIComponent(ref) + '&select=form_data&limit=1').then(function(r) { return r.json(); })
  ]).then(function(results) {
    var rows = results[1];
    var d = (rows && rows[0] && rows[0].form_data) ? rows[0].form_data : null;
    if (!d) {
      // loadMSB is only ever called for a ref that was just shown in the
      // list, i.e. it's known to exist — a fetch that comes back with no
      // matching row here is a transient failure (network blip, read-lag),
      // NOT a legitimate blank document. Treating it as one previously let
      // a save silently overwrite real content with an empty record under
      // the same ref. Refuse instead: clear currentMSBRef so saveMSBRecord()
      // can't write anything until the record is loaded successfully.
      currentMSBRef = null;
      resetMSBState();
      document.getElementById('msbStepContent').innerHTML = '<div class="msb-main"><div class="msb-note" style="border-left-color:#c62828;">Could not load this record — check connection and try again. (Nothing has been changed or lost — go back to the list and open it again.)</div></div>';
      return;
    }
    resetMSBState();
    if (d.job) msbState.job = d.job;
    _msbMigrateLegacySiteImages();
    msbState.team = d.team || [];
    msbState.equipment = d.equipment || [];
    msbState.selectedSOPs = d.selectedSOPs || [];
    msbState.selectedExclusionZones = d.selectedExclusionZones || [];
    msbState.ppeAssignments = d.ppeAssignments || {};
    if (d.emergency) msbState.emergency = d.emergency;
    msbState.status = d.status || 'draft';
    msbState.sentAt = d.sentAt || null;
    msbStep = 0;
    renderMSBAll();
  }).catch(function() {
    currentMSBRef = null;
    resetMSBState();
    document.getElementById('msbStepContent').innerHTML = '<div class="msb-main"><div class="msb-note" style="border-left-color:#c62828;">Could not load this record — check connection and try again. (Nothing has been changed or lost — go back to the list and open it again.)</div></div>';
  });
}

// Soft delete — moves the record to "Recently Deleted" rather than removing
// it, so a mis-tap here can never actually lose a method statement. Only
// permanentlyDeleteMSB() below does a real, irreversible DELETE.
function deleteMSB(ref) {
  if (!confirm('Delete this method statement? It moves to Recently Deleted, where it can be restored any time.')) return;
  var fd = _msbListRowsCache[ref] || {};
  var updated = {};
  for (var k in fd) updated[k] = fd[k];
  updated.deletedAt = new Date().toISOString();
  supaFetch('PATCH', TABLE + '?quote_ref=eq.' + encodeURIComponent(ref), { form_data: updated })
    .then(function(r) { if (r.ok || r.status === 204) fetchMSBList(); else alert('Delete failed.'); })
    .catch(function() { alert('Delete failed — check connection.'); });
}

function restoreMSB(ref) {
  var fd = _msbListRowsCache[ref] || {};
  var updated = {};
  for (var k in fd) updated[k] = fd[k];
  delete updated.deletedAt;
  supaFetch('PATCH', TABLE + '?quote_ref=eq.' + encodeURIComponent(ref), { form_data: updated })
    .then(function(r) { if (r.ok || r.status === 204) fetchMSBDeletedList(); else alert('Restore failed.'); })
    .catch(function() { alert('Restore failed — check connection.'); });
}

function permanentlyDeleteMSB(ref) {
  var typed = prompt('This permanently deletes it — it cannot be recovered afterwards. Type DELETE to confirm.');
  if (typed !== 'DELETE') return;
  supaFetch('DELETE', TABLE + '?quote_ref=eq.' + encodeURIComponent(ref))
    .then(function(r) { if (r.ok || r.status === 204) { delete _msbListRowsCache[ref]; fetchMSBDeletedList(); } else alert('Delete failed.'); })
    .catch(function() { alert('Delete failed — check connection.'); });
}

function saveMSBRecord() {
  if (!currentMSBRef) return Promise.reject(new Error('No active record'));
  // Strip transient in-flight upload state (_localPreview is a full base64 image —
  // never let it reach the saved JSON, only the storagePath once uploaded).
  var cleanImages = (msbState.job.siteControlImages || []).map(function(p) {
    return { storagePath: p.storagePath || '', status: p.storagePath ? 'saved' : 'pending' };
  }).filter(function(p) { return p.storagePath; });
  var cleanJob = {};
  for (var k in msbState.job) cleanJob[k] = msbState.job[k];
  cleanJob.siteControlImages = cleanImages;
  var rm = msbState.emergency.routeMap || {};
  var cleanEmergency = {};
  for (var ek in msbState.emergency) cleanEmergency[ek] = msbState.emergency[ek];
  cleanEmergency.routeMap = { storagePath: rm.storagePath || '', status: rm.storagePath ? 'saved' : '' };
  var payload = { quote_ref: currentMSBRef, updated_at: new Date().toISOString(), form_data: {
    job: cleanJob, team: msbState.team, equipment: msbState.equipment, selectedSOPs: msbState.selectedSOPs,
    selectedExclusionZones: msbState.selectedExclusionZones, ppeAssignments: msbState.ppeAssignments,
    emergency: cleanEmergency, status: msbState.status, sentAt: msbState.sentAt
  }};
  return supaFetch('POST', TABLE + '?on_conflict=quote_ref', payload).then(function(r) {
    if (!(r.ok || r.status === 201 || r.status === 204)) throw new Error('Save failed (' + r.status + ')');
  });
}

function saveMSBDraft() {
  var btn = document.getElementById('msbSaveDraftBtn');
  if (!currentMSBRef) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  saveMSBRecord().then(function() {
    if (btn) { btn.textContent = '✓ Saved'; setTimeout(function() { btn.textContent = 'Save Draft'; btn.disabled = false; }, 1800); }
  }).catch(function() {
    if (btn) { btn.disabled = false; btn.textContent = 'Save failed'; setTimeout(function() { btn.textContent = 'Save Draft'; }, 2200); }
  });
}

// ── STEP NAVIGATION ──
function renderMSBStepNav() {
  var nav = document.getElementById('msbStepNav');
  nav.innerHTML = '';
  MSB_STEPS.forEach(function(s, i) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'msb-step-btn' + (i === msbStep ? ' active' : '') + (i < msbStep ? ' done' : '');
    btn.textContent = (i+1) + '. ' + s.label;
    btn.onclick = (function(idx) { return function() { msbStep = idx; renderMSBAll(); }; })(i);
    nav.appendChild(btn);
  });
  var backBtn = document.getElementById('msbBackBtn');
  var nextBtn = document.getElementById('msbNextBtn');
  if (backBtn) backBtn.disabled = (msbStep === 0);
  if (nextBtn) nextBtn.style.display = (msbStep === MSB_STEPS.length - 1) ? 'none' : '';
}

function renderMSBAll() {
  renderMSBStepNav();
  var main = document.getElementById('msbStepContent');
  main.innerHTML = '';
  var key = MSB_STEPS[msbStep].key;
  if (key === 'job') renderMSBJobStep(main);
  else if (key === 'team') renderMSBTeamStep(main);
  else if (key === 'plant') renderMSBPlantStep(main);
  else if (key === 'sops') renderMSBSOPStep(main);
  else if (key === 'ppe') renderMSBPPEStep(main);
  else if (key === 'emergency') renderMSBEmergencyStep(main);
  else if (key === 'review') renderMSBReviewStep(main);
}
function msbNextStep() { if (msbStep < MSB_STEPS.length - 1) { msbStep++; renderMSBAll(); } }
function msbBackStep() { if (msbStep > 0) { msbStep--; renderMSBAll(); } }

// ── STEP 1 — JOB DETAILS ──
function renderMSBMethodologyPoints(listEl) {
  listEl.innerHTML = '';
  var points = msbState.job.methodologyPoints || (msbState.job.methodologyPoints = []);
  if (!points.length) {
    listEl.appendChild(_msbEl('<div class="msb-note" style="margin:0;">No points — tap + Add point below if you want any.</div>'));
  }
  points.forEach(function(pt, i) {
    var row = _msbEl('<div style="display:flex;gap:8px;align-items:flex-start;"></div>');
    var ta = document.createElement('textarea');
    ta.style.cssText = 'flex:1;min-height:44px;';
    ta.value = pt;
    ta.oninput = function() { points[i] = ta.value; };
    row.appendChild(ta);
    var rmBtn = document.createElement('button');
    rmBtn.type = 'button';
    rmBtn.textContent = '✕';
    rmBtn.title = 'Remove this point';
    rmBtn.style.cssText = 'background:none;border:1px solid rgba(255,100,100,.5);border-radius:3px;color:#c62828;font-size:14px;padding:6px 10px;cursor:pointer;flex-shrink:0;';
    rmBtn.onclick = function() {
      points.splice(i, 1);
      renderMSBMethodologyPoints(listEl);
    };
    row.appendChild(rmBtn);
    listEl.appendChild(row);
  });
}

function renderMSBJobStep(container) {
  var wrap = _msbEl('<div class="msb-main"></div>');
  wrap.appendChild(_msbEl('<div class="msb-h1">Job Details</div>'));
  wrap.appendChild(_msbEl('<div class="msb-desc">Core information for the cover page of the method statement.</div>'));

  var card = _msbEl('<div class="msb-card"><h3>Job &amp; Site</h3></div>');
  var fields = [
    ['titleOfDocument','Title of Document'],
    ['client','Client'],
    ['siteAddress','Site Address'], ['what3words','What3Words for Access'],
    ['workingDays','Number of Working Days on Site']
  ];
  var grid = _msbEl('<div class="msb-grid2"></div>');
  fields.forEach(function(f) {
    var key = f[0], label = f[1], type = f[2];
    var fwrap = _msbEl('<div class="msb-field"></div>');
    fwrap.appendChild(_msbEl('<label>' + label + '</label>'));
    var input = document.createElement('input');
    input.type = type || 'text';
    input.value = msbState.job[key] || '';
    input.oninput = function() { msbState.job[key] = input.value; };
    fwrap.appendChild(input);
    grid.appendChild(fwrap);
  });
  card.appendChild(grid);

  card.appendChild(_msbEl('<div class="msb-field" style="margin-top:6px;"><label>Contractor</label><div style="font-size:13px;color:var(--mid);padding:8px 0;">' + MSB_CONTRACTOR_LINES.join('<br>') + ' <span style="color:#999;">(fixed — always shown in the PDF)</span></div></div>'));

  var scopeWrap = _msbEl('<div class="msb-field" style="margin-top:6px;"><label>Scope of Work (project scope)</label></div>');
  var ta = document.createElement('textarea');
  ta.placeholder = 'Brief description of the works to be carried out...';
  ta.value = msbState.job.scope || '';
  ta.oninput = function() { msbState.job.scope = ta.value; };
  scopeWrap.appendChild(ta);
  card.appendChild(scopeWrap);

  var methWrap = _msbEl('<div class="msb-field" style="margin-top:14px;"></div>');
  methWrap.appendChild(_msbEl('<label>Work Methodology (Section 2.0)</label>'));
  var methPrompt = document.createElement('div');
  methPrompt.style.cssText = 'font-size:12px;color:var(--mid);margin:2px 0 6px;line-height:1.4;';
  methPrompt.textContent = "This section should be a simple overview of what is going to happen on the site, it does not need to be war and peace, but it is important to include a sequence of work that you would like your staff to follow. Please don't think you have to use long sentences and complex wording, think about who is going to read it i.e. the client who needs to understand what it is that you are going to do and your staff who need to know what order to do things in.";
  methWrap.appendChild(methPrompt);
  var methTa = document.createElement('textarea');
  methTa.placeholder = 'Overview and sequence of work...';
  methTa.value = msbState.job.methodology || '';
  methTa.oninput = function() { msbState.job.methodology = methTa.value; };
  methWrap.appendChild(methTa);
  var methNote = document.createElement('div');
  methNote.style.cssText = 'font-size:11px;color:#999;margin-top:6px;';
  methNote.textContent = 'The points below are always included underneath what you write above — keep, edit, or remove any of them.';
  methWrap.appendChild(methNote);
  card.appendChild(methWrap);

  var methPointsWrap = _msbEl('<div class="msb-field" style="margin-top:14px;"><label>Standard Sequence of Work</label></div>');
  var methPointsList = _msbEl('<div id="msbMethPointsList" style="display:flex;flex-direction:column;gap:8px;margin-top:6px;"></div>');
  methPointsWrap.appendChild(methPointsList);
  var addPointBtn = _msbEl('<button class="btn btn-clear" style="margin-top:8px;" type="button">+ Add point</button>');
  addPointBtn.onclick = function() {
    if (!msbState.job.methodologyPoints) msbState.job.methodologyPoints = [];
    msbState.job.methodologyPoints.push('');
    renderMSBMethodologyPoints(methPointsList);
  };
  methPointsWrap.appendChild(addPointBtn);
  renderMSBMethodologyPoints(methPointsList);
  card.appendChild(methPointsWrap);
  wrap.appendChild(card);

  var signOffCard = _msbEl('<div class="msb-card"><h3>Document Sign-off</h3></div>');
  signOffCard.appendChild(_msbEl('<div class="msb-desc" style="margin:0 0 10px;">Shown above 1.0 Introduction in the PDF — Prepared by Sarah Haste, Reviewed by Joel Cripps, Approved by Jon Challinor are fixed; only the date changes.</div>'));
  var dateWrap = _msbEl('<div class="msb-field" style="max-width:220px;"><label>Date</label></div>');
  var dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = msbState.job.signOffDate || '';
  dateInput.oninput = function() { msbState.job.signOffDate = dateInput.value; };
  dateWrap.appendChild(dateInput);
  signOffCard.appendChild(dateWrap);
  wrap.appendChild(signOffCard);

  if (!msbState.job.permitsIssuedBy) msbState.job.permitsIssuedBy = { highways:'', breakingGround:'' };
  var permitsCard = _msbEl('<div class="msb-card"><h3>Permits Required (Section 7.0)</h3></div>');
  permitsCard.appendChild(_msbEl('<div class="msb-desc" style="margin:0 0 10px;">Enter who issued each permit, if applicable — leave blank to show "—" in the PDF.</div>'));
  var permitsGrid = _msbEl('<div class="msb-grid2"></div>');
  [['highways','Highways Traffic Management — Issued By'],['breakingGround','Breaking Ground — Issued By']].forEach(function(f) {
    var key = f[0], label = f[1];
    var fwrap = _msbEl('<div class="msb-field"></div>');
    fwrap.appendChild(_msbEl('<label>' + label + '</label>'));
    var input = document.createElement('input');
    input.type = 'text';
    input.value = msbState.job.permitsIssuedBy[key] || '';
    input.oninput = function() { msbState.job.permitsIssuedBy[key] = input.value; };
    fwrap.appendChild(input);
    permitsGrid.appendChild(fwrap);
  });
  permitsCard.appendChild(permitsGrid);
  wrap.appendChild(permitsCard);

  var contactCard = _msbEl('<div class="msb-card"><h3>On-Site Client Contact</h3></div>');
  var cGrid = _msbEl('<div class="msb-grid2"></div>');
  [['clientContactName','Name of On-Site Client Contact'],['clientContactPhone','Contact Telephone','tel'],['clientContactEmail','Contact Email','email']].forEach(function(f) {
    var key = f[0], label = f[1], type = f[2];
    var fwrap = _msbEl('<div class="msb-field"></div>');
    fwrap.appendChild(_msbEl('<label>' + label + '</label>'));
    var input = document.createElement('input');
    input.type = type || 'text';
    input.value = msbState.job[key] || '';
    input.oninput = function() { msbState.job[key] = input.value; };
    fwrap.appendChild(input);
    cGrid.appendChild(fwrap);
  });
  contactCard.appendChild(cGrid);
  wrap.appendChild(contactCard);

  container.appendChild(wrap);
}

// ── STEP 2 — TEAM & COMPETENCY ──
function renderMSBTeamStep(container) {
  var wrap = _msbEl('<div class="msb-main"></div>');
  wrap.appendChild(_msbEl('<div class="msb-h1">Team &amp; Competency</div>'));
  wrap.appendChild(_msbEl('<div class="msb-desc">Select who is on this job. Their held competencies pull through automatically — this drives Section 4.0 of the document.</div>'));

  var card = _msbEl('<div class="msb-card"><h3>Select Staff</h3></div>');
  msbRefLib.staff.forEach(function(person) {
    var existing = null;
    for (var i = 0; i < msbState.team.length; i++) if (msbState.team[i].staffId === person.id) existing = msbState.team[i];
    var row = _msbEl('<div class="msb-staff-row' + (existing ? ' selected' : '') + '"></div>');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!existing;
    cb.onchange = function() {
      if (cb.checked) { msbState.team.push({ staffId: person.id, roleOverride: person.defaultRole }); }
      else {
        msbState.team = msbState.team.filter(function(t) { return t.staffId !== person.id; });
        delete msbState.ppeAssignments[person.id];
      }
      renderMSBAll();
    };
    row.appendChild(cb);
    var who = _msbEl('<div class="who"><div class="nm">' + person.name + (person.firstAider ? ' <span class="msb-pill">First Aider</span>' : '') + '</div><div class="rl">' + person.defaultRole + '</div></div>');
    row.appendChild(who);
    if (existing) {
      var roleSelect = document.createElement('select');
      roleSelect.className = 'msb-role-sel';
      _msbStaffRoles().forEach(function(r) {
        var opt = document.createElement('option');
        opt.value = r; opt.textContent = r;
        if (existing.roleOverride === r) opt.selected = true;
        roleSelect.appendChild(opt);
      });
      roleSelect.onchange = function() { existing.roleOverride = roleSelect.value; };
      row.appendChild(roleSelect);
    }
    card.appendChild(row);
  });
  wrap.appendChild(card);

  if (msbState.team.length) {
    var compCard = _msbEl('<div class="msb-card"><h3>Competencies on this job (auto-populated — Section 4.0)</h3></div>');
    var table = _msbEl('<table class="msb-comp-table"><thead><tr><th>Name</th><th>Role</th><th>Competency</th></tr></thead><tbody></tbody></table>');
    var tbody = table.querySelector('tbody');
    msbState.team.forEach(function(t) {
      var person = _msbFindStaff(t.staffId);
      if (!person) return;
      person.competencies.forEach(function(c, i) {
        // <tr>/<td> built via document.createElement, NOT _msbEl — browsers
        // silently drop bare table-row tags set through innerHTML on a div.
        var tr = document.createElement('tr');
        var tdName = document.createElement('td'); tdName.textContent = i === 0 ? person.name : '';
        var tdRole = document.createElement('td'); tdRole.textContent = i === 0 ? t.roleOverride : '';
        var tdComp = document.createElement('td'); tdComp.textContent = c.name;
        tr.appendChild(tdName); tr.appendChild(tdRole); tr.appendChild(tdComp);
        tbody.appendChild(tr);
      });
    });
    compCard.appendChild(table);
    wrap.appendChild(compCard);
  }

  container.appendChild(wrap);
}

// ── STEP 3 — PLANT & MACHINERY ──
function renderMSBPlantStep(container) {
  var wrap = _msbEl('<div class="msb-main"></div>');
  wrap.appendChild(_msbEl('<div class="msb-h1">Plant &amp; Machinery</div>'));
  wrap.appendChild(_msbEl('<div class="msb-desc">Tick the equipment being used on this job. Sound pressure and vibration magnitude are pre-populated — adjust if needed.</div>'));

  var card = _msbEl('<div class="msb-card"><h3>Equipment Used On This Job</h3></div>');
  var header = _msbEl('<div class="msb-equip-row" style="border:none;padding:0 10px;margin-bottom:2px;"><div></div><div style="font-size:11px;color:var(--mid);text-transform:uppercase;">Equipment</div><div style="font-size:11px;color:var(--mid);text-transform:uppercase;">Sound Pressure</div><div style="font-size:11px;color:var(--mid);text-transform:uppercase;">Vibration</div></div>');
  card.appendChild(header);

  msbRefLib.equipment.forEach(function(eq) {
    var existing = null;
    for (var i = 0; i < msbState.equipment.length; i++) if (msbState.equipment[i].id === eq.id) existing = msbState.equipment[i];
    var row = _msbEl('<div class="msb-equip-row"></div>');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!existing;
    cb.onchange = function() {
      if (cb.checked) { msbState.equipment.push({ id: eq.id, name: eq.name, sound: eq.sound, vibration: eq.vibration }); }
      else { msbState.equipment = msbState.equipment.filter(function(e) { return e.id !== eq.id; }); }
      renderMSBAll();
    };
    row.appendChild(cb);
    row.appendChild(_msbEl('<div class="nm">' + eq.name + '</div>'));

    var soundInput = document.createElement('input');
    soundInput.type = 'text';
    soundInput.value = existing ? existing.sound : eq.sound;
    soundInput.disabled = !existing;
    soundInput.oninput = function() { if (existing) existing.sound = soundInput.value; };
    row.appendChild(soundInput);

    var vibInput = document.createElement('input');
    vibInput.type = 'text';
    vibInput.value = existing ? existing.vibration : eq.vibration;
    vibInput.disabled = !existing;
    vibInput.oninput = function() { if (existing) existing.vibration = vibInput.value; };
    row.appendChild(vibInput);

    card.appendChild(row);
  });

  wrap.appendChild(card);

  var ctrlCard = _msbEl('<div class="msb-card"><h3>Site Specific Controls (Section 5.5)</h3></div>');
  ctrlCard.appendChild(_msbEl('<div class="msb-desc" style="margin:0 0 10px;">Add up to 4 photos showing site-specific controls (e.g. barriers, signage, access points).</div>'));
  var imgWrap = _msbEl('<div id="msbSiteCtrlImages" style="display:flex;gap:10px;flex-wrap:wrap;"></div>');
  ctrlCard.appendChild(imgWrap);
  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.id = 'msbSiteCtrlInput';
  fileInput.onchange = function() { msbSiteControlImageUpload(fileInput); };
  ctrlCard.appendChild(fileInput);
  renderMSBSiteControlImages(imgWrap);

  var commentsWrap = _msbEl('<div class="msb-field" style="margin-top:12px;"><label>Comments</label></div>');
  var commentsTa = document.createElement('textarea');
  commentsTa.placeholder = 'No comments required';
  commentsTa.value = msbState.job.siteControlComments || '';
  commentsTa.oninput = function() { msbState.job.siteControlComments = commentsTa.value; };
  commentsWrap.appendChild(commentsTa);
  ctrlCard.appendChild(commentsWrap);

  wrap.appendChild(ctrlCard);

  container.appendChild(wrap);
}

// Site control photos are uploaded to Storage and only the storagePath is kept
// in msbState (same reasoning as defect photos in defects-shared.js) — saving
// the raw base64 straight into the job_forms row makes that save request too
// big and it silently fails ("could not save ... check your connection").
var MSB_SITE_IMG_BUCKET = 'defect-photos';
// Reads go through the authenticated storage endpoint with an auth header —
// same pattern as documents.js/_docAuthUrl and defects-dashboard.js, which is
// the one proven to actually work in this app (the public-bypass URL doesn't).
function _msbSiteImgAuthUrl(path) { return SUPA_URL + '/storage/v1/object/authenticated/' + MSB_SITE_IMG_BUCKET + '/' + path; }
var _msbSiteImgBlobCache = {}; // storagePath -> blob: URL, so repeated re-renders don't re-fetch
function _msbFetchSiteImageBlobUrl(path) {
  if (_msbSiteImgBlobCache[path]) return Promise.resolve(_msbSiteImgBlobCache[path]);
  return fetch(_msbSiteImgAuthUrl(path), {credentials:'omit', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken()}})
    .then(function(r) { if (!r.ok) throw new Error('image fetch failed (' + r.status + ')'); return r.blob(); })
    .then(function(blob) { var url = URL.createObjectURL(blob); _msbSiteImgBlobCache[path] = url; return url; });
}
function _msbFetchAsDataUrl(url) {
  return fetch(url, { credentials: 'omit', mode: 'cors', headers: {'apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken()} }).then(function(r) {
    if (!r.ok) throw new Error('image fetch failed (' + r.status + ')');
    return r.blob();
  }).then(function(blob) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  });
}
function _uploadMSBSiteImage(path, dataUrl, mimeType) {
  var base64 = dataUrl.split(',')[1];
  var chars = atob(base64), bytes = new Uint8Array(chars.length);
  for (var i = 0; i < chars.length; i++) bytes[i] = chars.charCodeAt(i);
  return fetch(SUPA_URL + '/storage/v1/object/' + MSB_SITE_IMG_BUCKET + '/' + path, {
    method: 'POST',
    headers: {'apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken(),'Content-Type':mimeType||'image/jpeg','x-upsert':'true'},
    body: bytes, credentials: 'omit', mode: 'cors'
  });
}

// One-off migration for records saved before the storage-bucket fix, where
// siteControlImages held raw base64 strings instead of {storagePath} — upload
// them to storage now so the next save doesn't silently drop the photos.
function _msbMigrateLegacySiteImages() {
  var images = msbState.job.siteControlImages;
  if (!images || !images.length) return;
  images.forEach(function(entry, i) {
    if (typeof entry !== 'string') return;
    var slot = { storagePath: '', status: 'processing', _localPreview: entry };
    images[i] = slot;
    var path = 'msb-site-controls/' + (currentMSBRef || 'draft') + '/' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2,8) + '.jpg';
    _uploadMSBSiteImage(path, entry, 'image/jpeg').then(function(r) {
      if (r.ok) { slot.storagePath = path; slot.status = 'saved'; delete slot._localPreview; }
      else { slot.status = 'error'; }
      renderMSBSiteControlImages();
    }).catch(function() { slot.status = 'error'; renderMSBSiteControlImages(); });
  });
}

function renderMSBSiteControlImages(wrap) {
  wrap = wrap || document.getElementById('msbSiteCtrlImages');
  if (!wrap) return;
  var images = msbState.job.siteControlImages || (msbState.job.siteControlImages = []);
  wrap.innerHTML = '';
  for (var i = 0; i < 4; i++) {
    var tile = document.createElement('div');
    if (images[i]) {
      var p = images[i];
      tile.style.cssText = 'width:84px;height:84px;border-radius:6px;border:2px solid var(--green);cursor:pointer;overflow:hidden;background:#fafafa;position:relative;';
      if (p.storagePath) {
        var img = document.createElement('img');
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        tile.appendChild(img);
        (function(imgEl, storagePath) {
          _msbFetchSiteImageBlobUrl(storagePath).then(function(blobUrl) { imgEl.src = blobUrl; }).catch(function() { imgEl.replaceWith('⚠'); });
        })(img, p.storagePath);
      } else if (p._localPreview) {
        var img2 = document.createElement('img');
        img2.src = p._localPreview;
        img2.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;opacity:0.6;';
        tile.appendChild(img2);
      } else {
        tile.textContent = '…';
        tile.style.display = 'flex'; tile.style.alignItems = 'center'; tile.style.justifyContent = 'center'; tile.style.color = '#999';
      }
      if (p.status === 'error') tile.style.borderColor = '#c62828';
      (function(idx) {
        tile.onclick = function() {
          if (images[idx].status === 'processing') return;
          if (!confirm('Remove this photo?')) return;
          images.splice(idx, 1);
          renderMSBSiteControlImages();
        };
      })(i);
    } else if (i === images.length) {
      tile.style.cssText = 'width:84px;height:84px;border-radius:6px;border:2px dashed var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;color:#999;background:#fafafa;';
      tile.textContent = '+';
      tile.onclick = function() {
        var inp = document.getElementById('msbSiteCtrlInput');
        if (inp) inp.click();
      };
    } else {
      continue;
    }
    wrap.appendChild(tile);
  }
}

function msbSiteControlImageUpload(input) {
  var file = input.files[0];
  input.value = '';
  if (!file) return;
  var images = msbState.job.siteControlImages || (msbState.job.siteControlImages = []);
  if (images.length >= 4) return;
  var slot = { storagePath: '', status: 'processing' };
  images.push(slot);
  renderMSBSiteControlImages();
  _resizeImageToJpeg(file, 1200, 0.7, function(dataUrl) {
    if (!dataUrl) { slot.status = 'error'; renderMSBSiteControlImages(); return; }
    slot._localPreview = dataUrl;
    renderMSBSiteControlImages();
    var path = 'msb-site-controls/' + (currentMSBRef || 'draft') + '/' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.jpg';
    _uploadMSBSiteImage(path, dataUrl, 'image/jpeg').then(function(r) {
      if (r.ok) { slot.storagePath = path; slot.status = 'saved'; delete slot._localPreview; }
      else { slot.status = 'error'; }
      renderMSBSiteControlImages();
    }).catch(function() { slot.status = 'error'; renderMSBSiteControlImages(); });
  });
}

// Route map for Section 15.0 — a single uploaded photo (e.g. a Google Maps
// route screenshot), same storage upload/read pattern as site control images.
function renderMSBRouteMapImage(wrap) {
  wrap = wrap || document.getElementById('msbRouteMapImg');
  if (!wrap) return;
  var rm = msbState.emergency.routeMap || (msbState.emergency.routeMap = { storagePath:'', status:'' });
  wrap.innerHTML = '';
  var tile = document.createElement('div');
  if (rm.storagePath || rm._localPreview || rm.status === 'processing' || rm.status === 'error') {
    tile.style.cssText = 'width:180px;height:120px;border-radius:6px;border:2px solid var(--green);cursor:pointer;overflow:hidden;background:#fafafa;position:relative;';
    if (rm.storagePath) {
      var img = document.createElement('img');
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      tile.appendChild(img);
      (function(imgEl, storagePath) {
        _msbFetchSiteImageBlobUrl(storagePath).then(function(blobUrl) { imgEl.src = blobUrl; }).catch(function() { imgEl.replaceWith('⚠'); });
      })(img, rm.storagePath);
    } else if (rm._localPreview) {
      var img2 = document.createElement('img');
      img2.src = rm._localPreview;
      img2.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;opacity:0.6;';
      tile.appendChild(img2);
    } else {
      tile.textContent = '…';
      tile.style.display = 'flex'; tile.style.alignItems = 'center'; tile.style.justifyContent = 'center'; tile.style.color = '#999';
    }
    if (rm.status === 'error') tile.style.borderColor = '#c62828';
    tile.onclick = function() {
      if (rm.status === 'processing') return;
      if (!confirm('Remove this route map image?')) return;
      msbState.emergency.routeMap = { storagePath: '', status: '' };
      renderMSBRouteMapImage(wrap);
    };
  } else {
    tile.style.cssText = 'width:180px;height:120px;border-radius:6px;border:2px dashed var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;color:#999;background:#fafafa;';
    tile.textContent = '+';
    tile.onclick = function() {
      var inp = document.getElementById('msbRouteMapInput');
      if (inp) inp.click();
    };
  }
  wrap.appendChild(tile);
}

function msbRouteMapImageUpload(input) {
  var file = input.files[0];
  input.value = '';
  if (!file) return;
  var rm = msbState.emergency.routeMap || (msbState.emergency.routeMap = { storagePath:'', status:'' });
  rm.status = 'processing';
  renderMSBRouteMapImage();
  _resizeImageToJpeg(file, 1200, 0.7, function(dataUrl) {
    if (!dataUrl) { rm.status = 'error'; renderMSBRouteMapImage(); return; }
    rm._localPreview = dataUrl;
    renderMSBRouteMapImage();
    var path = 'msb-route-map/' + (currentMSBRef || 'draft') + '/' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.jpg';
    _uploadMSBSiteImage(path, dataUrl, 'image/jpeg').then(function(r) {
      if (r.ok) { rm.storagePath = path; rm.status = 'saved'; delete rm._localPreview; }
      else { rm.status = 'error'; }
      renderMSBRouteMapImage();
    }).catch(function() { rm.status = 'error'; renderMSBRouteMapImage(); });
  });
}

// ── STEP 4 — SOPs & EXCLUSION ZONES ──
function renderMSBSOPStep(container) {
  var wrap = _msbEl('<div class="msb-main"></div>');
  wrap.appendChild(_msbEl('<div class="msb-h1">SOPs &amp; Exclusion Zones</div>'));
  wrap.appendChild(_msbEl('<div class="msb-desc">Tick the tasks/equipment relevant to this job — only these appear in Section 9.0 of the PDF. Then choose which exclusion zones apply in Section 6.0.</div>'));

  var categories = [];
  msbRefLib.sops.forEach(function(s) { if (categories.indexOf(s.category) === -1) categories.push(s.category); });

  var card = _msbEl('<div class="msb-card"><h3>Select Applicable SOPs <span class="msb-badge draft">' + msbState.selectedSOPs.length + ' of ' + msbRefLib.sops.length + ' selected</span></h3></div>');
  categories.forEach(function(cat) {
    var group = _msbEl('<div class="msb-sop-group"><h4>' + cat + '</h4></div>');
    msbRefLib.sops.filter(function(s) { return s.category === cat; }).forEach(function(sop) {
      var checked = msbState.selectedSOPs.indexOf(sop.id) !== -1;
      var item = _msbEl('<div class="msb-sop-item"></div>');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = checked;
      cb.onchange = function() {
        if (cb.checked) msbState.selectedSOPs.push(sop.id);
        else msbState.selectedSOPs = msbState.selectedSOPs.filter(function(id) { return id !== sop.id; });
        renderMSBAll();
      };
      item.appendChild(cb);
      item.appendChild(_msbEl('<div class="lbl">' + sop.heading + '</div>'));
      group.appendChild(item);
    });
    card.appendChild(group);
  });
  wrap.appendChild(card);

  var ezCard = _msbEl('<div class="msb-card"><h3>Exclusion Zones (Section 6.0) <span class="msb-badge draft">' + msbState.selectedExclusionZones.length + ' selected</span></h3></div>');
  var suggestBtn = _msbEl('<button class="btn btn-clear" style="margin-bottom:12px;">Suggest from selected SOPs</button>');
  suggestBtn.onclick = function() {
    deriveExclusionZonesFromMSBSops().forEach(function(id) {
      if (msbState.selectedExclusionZones.indexOf(id) === -1) msbState.selectedExclusionZones.push(id);
    });
    renderMSBAll();
  };
  ezCard.appendChild(suggestBtn);

  msbRefLib.ez.forEach(function(z) {
    var checked = msbState.selectedExclusionZones.indexOf(z.id) !== -1;
    var item = _msbEl('<div class="msb-ez-item"></div>');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = checked;
    cb.onchange = function() {
      if (cb.checked) msbState.selectedExclusionZones.push(z.id);
      else msbState.selectedExclusionZones = msbState.selectedExclusionZones.filter(function(id) { return id !== z.id; });
      renderMSBAll();
    };
    item.appendChild(cb);
    item.appendChild(_msbEl('<div><div class="act">' + z.activity + '</div><div class="dist">' + z.distance + '</div></div>'));
    ezCard.appendChild(item);
  });
  wrap.appendChild(ezCard);

  container.appendChild(wrap);
}

// ── STEP 5 — PPE ASSIGNMENT ──
function renderMSBPPEStep(container) {
  var wrap = _msbEl('<div class="msb-main"></div>');
  wrap.appendChild(_msbEl('<div class="msb-h1">PPE Assignment</div>'));
  wrap.appendChild(_msbEl('<div class="msb-desc">PPE items are generated from the SOPs you selected. Tick which of your selected operators need each item — this builds the Section 8.0 table.</div>'));

  var derivedPPE = derivePPEForMSB();
  ensureMSBPPEAssignments();

  var card = _msbEl('<div class="msb-card"><h3>PPE Requirements by Operator</h3></div>');

  if (msbState.team.some(function(t) { return MSB_REDUCED_DEFAULT_PPE_STAFF_IDS.indexOf(t.staffId) !== -1; })) {
    card.appendChild(_msbEl('<div class="msb-note" style="margin-bottom:12px;">Jon and Joel default to no PPE ticked, since they\'re usually site visits only — tick whatever they actually need for this job.</div>'));
  }

  if (!msbState.team.length) {
    card.appendChild(_msbEl('<div class="msb-note">Select your team on the Team &amp; Competency step first — PPE is assigned per operator.</div>'));
  } else if (!derivedPPE.length) {
    card.appendChild(_msbEl('<div class="msb-note">Select at least one SOP first — PPE requirements are generated from the tasks selected.</div>'));
  } else {
    // Built via document.createElement, NOT _msbEl — browsers silently drop
    // bare table-structural tags (<tr>/<thead>/<tbody>) set through innerHTML
    // on a plain div, which was crashing this table for everyone.
    var table = document.createElement('table');
    table.className = 'msb-ppe-matrix';
    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    var itemHeadTh = document.createElement('th'); itemHeadTh.className = 'itemcol'; itemHeadTh.textContent = 'PPE Item';
    headRow.appendChild(itemHeadTh);
    msbState.team.forEach(function(t) {
      var person = _msbFindStaff(t.staffId);
      var th = document.createElement('th'); th.textContent = person ? person.name : t.staffId;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    derivedPPE.forEach(function(p) {
      var tr = document.createElement('tr');
      var itemTd = document.createElement('td'); itemTd.className = 'itemcol'; itemTd.textContent = p.name;
      tr.appendChild(itemTd);
      msbState.team.forEach(function(t) {
        var td = document.createElement('td');
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!(msbState.ppeAssignments[t.staffId] && msbState.ppeAssignments[t.staffId][p.id]);
        cb.onchange = function() { msbState.ppeAssignments[t.staffId][p.id] = cb.checked; };
        td.appendChild(cb);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);
  }
  wrap.appendChild(card);
  container.appendChild(wrap);
}

// ── STEP 6 — EMERGENCY ARRANGEMENTS (manual entry — nearest-A&E lookup not wired up yet) ──
function renderMSBEmergencyStep(container) {
  var wrap = _msbEl('<div class="msb-main"></div>');
  wrap.appendChild(_msbEl('<div class="msb-h1">Emergency Arrangements</div>'));
  wrap.appendChild(_msbEl('<div class="msb-desc">Nearest A&amp;E hospital details for Section 15.0. Enter these manually for now.</div>'));

  var card = _msbEl('<div class="msb-card"><h3>Nearest A&amp;E</h3></div>');
  card.appendChild(_msbEl('<div class="msb-note">Automatic lookup from the Site Address is not set up yet — enter the nearest A&amp;E hospital details below by hand.</div>'));

  var grid = _msbEl('<div class="msb-grid2" style="margin-top:14px;"></div>');
  [['hospitalName','Hospital Name'],['hospitalAddress','Address'],['hospitalPhone','Phone']].forEach(function(f) {
    var key = f[0], label = f[1];
    var fwrap = _msbEl('<div class="msb-field"></div>');
    fwrap.appendChild(_msbEl('<label>' + label + '</label>'));
    var input = document.createElement('input');
    input.type = 'text';
    input.value = msbState.emergency[key] || '';
    input.oninput = function() { msbState.emergency[key] = input.value; };
    fwrap.appendChild(input);
    grid.appendChild(fwrap);
  });
  card.appendChild(grid);
  wrap.appendChild(card);

  var routeCard = _msbEl('<div class="msb-card"><h3>Route Map (Section 15.0)</h3></div>');
  routeCard.appendChild(_msbEl('<div class="msb-desc" style="margin:0 0 10px;">Upload a screenshot of the driving route to the nearest A&amp;E (e.g. from Google Maps).</div>'));
  var rmWrap = _msbEl('<div id="msbRouteMapImg"></div>');
  routeCard.appendChild(rmWrap);
  var rmInput = document.createElement('input');
  rmInput.type = 'file';
  rmInput.accept = 'image/*';
  rmInput.style.display = 'none';
  rmInput.id = 'msbRouteMapInput';
  rmInput.onchange = function() { msbRouteMapImageUpload(rmInput); };
  routeCard.appendChild(rmInput);
  renderMSBRouteMapImage(rmWrap);

  var rmGrid = _msbEl('<div class="msb-grid2" style="margin-top:12px;"></div>');
  [['routeDistance','Distance from site to Urgent Care'],['routeTime','Time from site to Urgent Care']].forEach(function(f) {
    var key = f[0], label = f[1];
    var fwrap = _msbEl('<div class="msb-field"></div>');
    fwrap.appendChild(_msbEl('<label>' + label + '</label>'));
    var input = document.createElement('input');
    input.type = 'text';
    input.value = msbState.emergency[key] || '';
    input.oninput = function() { msbState.emergency[key] = input.value; };
    fwrap.appendChild(input);
    rmGrid.appendChild(fwrap);
  });
  routeCard.appendChild(rmGrid);
  wrap.appendChild(routeCard);

  container.appendChild(wrap);
}

// ── STEP 7 — REVIEW & GENERATE ──
function renderMSBReviewStep(container) {
  var wrap = _msbEl('<div class="msb-main"></div>');
  wrap.appendChild(_msbEl('<div class="msb-h1">Review &amp; Generate</div>'));
  wrap.appendChild(_msbEl('<div class="msb-desc">Check everything below, then generate the PDF. The finished document includes the full set of company policy sections plus everything below.</div>'));

  var card = _msbEl('<div class="msb-card"></div>');

  var jobSec = _msbEl('<div class="msb-review-section"><h4>Job Details</h4></div>');
  jobSec.appendChild(_msbEl('<div class="row"><strong>Title of Document:</strong> ' + (msbState.job.titleOfDocument || '—') + '</div>'));
  jobSec.appendChild(_msbEl('<div class="row"><strong>Client:</strong> ' + (msbState.job.client || '—') + '</div>'));
  jobSec.appendChild(_msbEl('<div class="row"><strong>Site Address:</strong> ' + (msbState.job.siteAddress || '—') + '</div>'));
  jobSec.appendChild(_msbEl('<div class="row"><strong>Working Days:</strong> ' + (msbState.job.workingDays || '—') + '</div>'));
  jobSec.appendChild(_msbEl('<div class="row"><strong>On-Site Client Contact:</strong> ' + (msbState.job.clientContactName || '—') + ' — ' + (msbState.job.clientContactPhone || '—') + ' — ' + (msbState.job.clientContactEmail || '—') + '</div>'));
  card.appendChild(jobSec);

  var teamSec = _msbEl('<div class="msb-review-section"><h4>Team (' + msbState.team.length + ')</h4></div>');
  msbState.team.forEach(function(t) {
    var p = _msbFindStaff(t.staffId);
    teamSec.appendChild(_msbEl('<div class="row">' + (p ? p.name : t.staffId) + ' — ' + t.roleOverride + '</div>'));
  });
  if (!msbState.team.length) teamSec.appendChild(_msbEl('<div class="row">No team members selected yet.</div>'));
  card.appendChild(teamSec);

  var eqSec = _msbEl('<div class="msb-review-section"><h4>Equipment (' + msbState.equipment.length + ')</h4></div>');
  msbState.equipment.forEach(function(eq) {
    eqSec.appendChild(_msbEl('<div class="row">' + eq.name + ' — ' + eq.sound + ' / ' + eq.vibration + '</div>'));
  });
  if (!msbState.equipment.length) eqSec.appendChild(_msbEl('<div class="row">No equipment selected yet.</div>'));
  card.appendChild(eqSec);

  var sopSec = _msbEl('<div class="msb-review-section"><h4>SOPs Selected (' + msbState.selectedSOPs.length + ')</h4></div>');
  msbState.selectedSOPs.forEach(function(id) {
    var sop = _msbFindSop(id);
    if (sop) sopSec.appendChild(_msbEl('<div class="row">' + sop.heading + '</div>'));
  });
  if (!msbState.selectedSOPs.length) sopSec.appendChild(_msbEl('<div class="row">No SOPs selected yet.</div>'));
  card.appendChild(sopSec);

  var ezSec = _msbEl('<div class="msb-review-section"><h4>Exclusion Zones Selected (' + msbState.selectedExclusionZones.length + ')</h4></div>');
  msbState.selectedExclusionZones.forEach(function(id) {
    var z = _msbFindEZ(id);
    if (z) ezSec.appendChild(_msbEl('<div class="row">' + z.activity + '</div>'));
  });
  if (!msbState.selectedExclusionZones.length) ezSec.appendChild(_msbEl('<div class="row">None selected.</div>'));
  card.appendChild(ezSec);

  var ppeSec = _msbEl('<div class="msb-review-section"><h4>PPE (Section 8.0)</h4></div>');
  derivePPEForMSB().forEach(function(p) { ppeSec.appendChild(_msbEl('<span class="msb-pill">' + p.name + '</span>')); });
  if (msbState.team.length) ppeSec.appendChild(_msbEl('<div class="row" style="margin-top:6px;">Assigned per operator on the PPE Assignment step.</div>'));
  card.appendChild(ppeSec);

  var emSec = _msbEl('<div class="msb-review-section"><h4>Emergency Arrangements (Section 15.0)</h4></div>');
  emSec.appendChild(_msbEl('<div class="row">' + (msbState.emergency.hospitalName || 'Not entered yet') + '</div>'));
  emSec.appendChild(_msbEl('<div class="row">Route map: ' + (msbState.emergency.routeMap && msbState.emergency.routeMap.storagePath ? 'added' : 'not added') + ' — ' + (msbState.emergency.routeDistance || '—') + ', ' + (msbState.emergency.routeTime || '—') + '</div>'));
  card.appendChild(emSec);

  wrap.appendChild(card);

  var missing = [];
  if (!msbState.job.client) missing.push('Client name');
  if (!msbState.job.siteAddress) missing.push('Site address');
  if (!msbState.team.length) missing.push('At least one team member');
  if (!msbState.selectedSOPs.length) missing.push('At least one SOP');

  if (missing.length) {
    wrap.appendChild(_msbEl('<div class="msb-note">Before generating, please complete: ' + missing.join(', ') + '.</div>'));
  }

  var actions = _msbEl('<div style="display:flex;gap:10px;margin-top:22px;"></div>');
  var genBtn = _msbEl('<button class="btn btn-print" id="msbGenerateBtn">Generate PDF</button>');
  genBtn.disabled = !!missing.length;
  genBtn.onclick = generateMSBPDF;
  actions.appendChild(genBtn);
  wrap.appendChild(actions);

  container.appendChild(wrap);
}

// ── PDF GENERATION (pdfmake, lazy-loaded like this app's pdf.js reader) ──
var _pdfMakeReady = false;
var _pdfMakeLoading = false;
var _pdfMakeQueue = [];
var PDFMAKE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js';
var PDFMAKE_FONTS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.js';

function _loadPdfMake(cb) {
  if (_pdfMakeReady) { cb(); return; }
  _pdfMakeQueue.push(cb);
  if (_pdfMakeLoading) return;
  _pdfMakeLoading = true;
  var s1 = document.createElement('script');
  s1.src = PDFMAKE_CDN;
  s1.onload = function() {
    var s2 = document.createElement('script');
    s2.src = PDFMAKE_FONTS_CDN;
    s2.onload = function() {
      _pdfMakeReady = true; _pdfMakeLoading = false;
      _pdfMakeQueue.forEach(function(fn) { fn(); }); _pdfMakeQueue = [];
    };
    s2.onerror = function() {
      _pdfMakeLoading = false;
      _pdfMakeQueue.forEach(function(fn) { fn(true); }); _pdfMakeQueue = [];
    };
    document.head.appendChild(s2);
  };
  s1.onerror = function() {
    _pdfMakeLoading = false;
    _pdfMakeQueue.forEach(function(fn) { fn(true); }); _pdfMakeQueue = [];
  };
  document.head.appendChild(s1);
}

function _msbBulletBlock(lines, marginBottom) {
  return { text: lines.map(function(l) { return '-  ' + l; }).join('\n'), style: 'body', margin: [0,0,0,marginBottom||0], lineHeight: 1.35 };
}
// Wraps a section's heading + content in a bordered box with a shaded title bar
function _msbBoxed(titleText, body, opts) {
  var bodyStack = Array.isArray(body) ? body : [body];
  var box = {
    table: { widths: ['*'], body: [
      [{ text: titleText, style: 'boxTitle', fillColor: '#e3ead9' }],
      [{ stack: bodyStack, margin: [10,10,10,10] }]
    ]},
    layout: {
      hLineWidth: function() { return 1; },
      vLineWidth: function() { return 1; },
      hLineColor: function() { return '#c4d0bd'; },
      vLineColor: function() { return '#c4d0bd'; },
      paddingLeft: function() { return 0; },
      paddingRight: function() { return 0; },
      paddingTop: function() { return 0; },
      paddingBottom: function() { return 0; }
    },
    margin: [0,0,0,16]
  };
  if (opts && opts.pageBreak) box.pageBreak = opts.pageBreak;
  return box;
}
function _msbFixedSectionBox(sectionNumber) {
  var sec = null;
  for (var i = 0; i < msbRefLib.fixedSections.length; i++) if (msbRefLib.fixedSections[i].n === sectionNumber) sec = msbRefLib.fixedSections[i];
  if (!sec) return null;
  return _msbBoxed(sec.n + '  ' + sec.title, _msbBulletBlock(sec.paragraphs, 0));
}

function _msbFmtDateDotted(d) {
  if (!d) return '—';
  var dt = new Date(d + 'T00:00:00');
  if (isNaN(dt.getTime())) return '—';
  var pad = function(n) { return String(n).length < 2 ? '0' + n : String(n); };
  return pad(dt.getDate()) + '.' + pad(dt.getMonth() + 1) + '.' + dt.getFullYear();
}
// Prepared by / Reviewed by / Approved by table under 1.0 Introduction —
// name and position are fixed, only the date is editable per document.
function _msbSignOffTable(label, name, position, date) {
  return { table: { widths: ['33%','34%','33%'], body: [
    [{ text: label, bold: true, fillColor: '#e3ead9' }, { text: 'Position', bold: true, fillColor: '#e3ead9' }, { text: 'Date', bold: true, fillColor: '#e3ead9' }],
    [name, position, _msbFmtDateDotted(date)]
  ]}, layout: {
    hLineWidth: function() { return 1; },
    vLineWidth: function() { return 1; },
    hLineColor: function() { return '#c4d0bd'; },
    vLineColor: function() { return '#c4d0bd'; }
  }, margin: [0,0,0,10] };
}

function buildMSBDocDefinition(resolvedSiteImages, resolvedRouteMapImage) {
  var derivedPPE = derivePPEForMSB();
  var selectedEZ = msbState.selectedExclusionZones.map(_msbFindEZ).filter(Boolean);

  var teamTableBody = [[{text:'Name',bold:true},{text:'Role',bold:true},{text:'First Aider',bold:true}]];
  msbState.team.forEach(function(t) {
    var p = _msbFindStaff(t.staffId);
    if (p) teamTableBody.push([p.name, t.roleOverride, p.firstAider ? 'Yes' : 'No']);
  });

  var compTableBody = [[{text:'Name',bold:true},{text:'Competency',bold:true}]];
  msbState.team.forEach(function(t) {
    var p = _msbFindStaff(t.staffId);
    if (!p) return;
    p.competencies.forEach(function(c, i) { compTableBody.push([i === 0 ? p.name : '', c.name]); });
  });

  var equipTableBody = [[{text:'Plant/Machinery',bold:true},{text:'Sound Pressure',bold:true},{text:'Vibration Magnitude',bold:true}]];
  msbState.equipment.forEach(function(eq) { equipTableBody.push([eq.name, eq.sound, eq.vibration]); });

  var siteControlImages = (resolvedSiteImages || []).slice(0, 4);
  var siteControlImagesMap = {};
  siteControlImages.forEach(function(img, i) { siteControlImagesMap['siteCtrlImg' + i] = img; });
  var siteControlsContent = [
    { text: msbState.job.siteControlComments || 'No comments required', style: 'body', margin: [0,0,0,siteControlImages.length ? 8 : 0] }
  ];
  if (siteControlImages.length) {
    siteControlsContent.push({ columns: siteControlImages.map(function(img, i) { return { image: 'siteCtrlImg' + i, width: 120 }; }), columnGap: 10 });
  } else if (!msbState.job.siteControlComments) {
    siteControlsContent = [{ text: 'No site specific control images or comments added for this job.', style: 'body' }];
  }

  var ppeTableBody, ppeWidths;
  if (msbState.team.length && derivedPPE.length) {
    var headerRow = [{text:'PPE Item',bold:true}].concat(msbState.team.map(function(t) {
      var p = _msbFindStaff(t.staffId);
      return { text: p ? p.name : t.staffId, bold: true };
    }));
    ppeTableBody = [headerRow];
    derivedPPE.forEach(function(p) {
      var row = [p.name];
      msbState.team.forEach(function(t) {
        row.push(msbState.ppeAssignments[t.staffId] && msbState.ppeAssignments[t.staffId][p.id] ? 'Yes' : '');
      });
      ppeTableBody.push(row);
    });
    ppeWidths = ['*'].concat(msbState.team.map(function() { return 'auto'; }));
  } else {
    ppeTableBody = [[{text:'PPE Item',bold:true}]];
    derivedPPE.forEach(function(p) { ppeTableBody.push([p.name]); });
    ppeWidths = ['*'];
  }

  var ezTableBody = [[{text:'Activity',bold:true},{text:'Minimum Safe Working Distance',bold:true}]];
  selectedEZ.forEach(function(z) { ezTableBody.push([z.activity, z.distance]); });

  var sopContent = [
    { text: 'General', style: 'sopHeading', margin: [0,0,0,4] },
    { ol: [
        'All personal protective equipment must be worn prior to work commencing.',
        'Machinery shall be subject to pre-use checks by the operator, removing machinery from service that fails any of those checks.',
        'The operator is responsible for walking the work area prior to starting, to ensure they have identified any hazards that they may need to mark and that they are happy it is safe to proceed.',
        'Safe working distances shall be applied in accordance with industry good practice. Any deviation from this must first be authorised by the Site Supervisor.'
      ], style: 'body', margin: [0,0,0,10] }
  ];
  msbState.selectedSOPs.forEach(function(id) {
    var sop = _msbFindSop(id);
    if (!sop) return;
    sopContent.push({ text: sop.heading, style: 'sopHeading', margin: [0,14,0,4] });
    sop.description.forEach(function(line) { sopContent.push({ text: '-  ' + line, style: 'body', margin: [0,0,0,4] }); });
  });
  if (!msbState.selectedSOPs.length) sopContent.push({ text: 'No task-specific SOPs were selected for this job.', style: 'body' });

  var methodologyPointsList = (msbState.job.methodologyPoints || []).map(function(p) { return (p || '').trim(); }).filter(Boolean);

  var pdfImages = { logo: msbLogoBase64 };
  for (var _siteImgKey in siteControlImagesMap) pdfImages[_siteImgKey] = siteControlImagesMap[_siteImgKey];
  if (resolvedRouteMapImage) pdfImages.routeMapImg = resolvedRouteMapImage;

  var routeMapContent = resolvedRouteMapImage
    ? [{ image: 'routeMapImg', width: 300, margin: [0,0,0,8] }]
    : [{ text: 'No route map image added for this job.', style: 'body', margin: [0,0,0,8] }];

  var content = [
    { text: 'Method Statement', style: 'title' },
    { text: msbState.job.client || 'Client not specified', style: 'subtitle', margin: [0,0,0,20] },

    _msbBoxed('Job Details', { table: { widths: ['30%','70%'], body: [
      ['Title of Document', msbState.job.titleOfDocument || '—'],
      ['Client', msbState.job.client || '—'],
      ['Scope of Work', msbState.job.scope || '—'],
      ['Contractor', MSB_CONTRACTOR_LINES.join('\n')],
      ['Site Address', msbState.job.siteAddress || '—'],
      ['What3Words for Access', msbState.job.what3words || '—'],
      ['Number of Working Days on Site', msbState.job.workingDays || '—'],
      ['Name of On-Site Client Contact', msbState.job.clientContactName || '—'],
      ['Contact Telephone', msbState.job.clientContactPhone || '—'],
      ['Contact Email', msbState.job.clientContactEmail || '—']
    ]}, layout: 'lightHorizontalLines' }),

    _msbSignOffTable('Prepared by', 'Sarah Haste', 'Office Coordinator', msbState.job.signOffDate),
    _msbSignOffTable('Reviewed by', 'Joel Cripps', 'Contracts Manager', msbState.job.signOffDate),
    _msbSignOffTable('Approved by', 'Jon Challinor', 'Managing Director', msbState.job.signOffDate),

    _msbBoxed('1.0  Introduction', { text: 'The following method statement has been developed to provide a Safe System of Works (SSoW) and must be always adhered to. Any significant deviation from this system of work must first be authorised by a member of the Senior Management Team (Point of contact for works or Managing Director). Please read the entire method statement before the commencement of work. If you have any questions, please speak with the site supervisor before proceeding with the works.', style: 'body' }),

    _msbBoxed('2.0  Work Methodology', [
      { text: msbState.job.methodology || 'No work methodology overview entered.', style: 'body' }
    ].concat(methodologyPointsList.length ? [{ ul: methodologyPointsList, style: 'body', margin: [0,10,0,0] }] : [])),

    _msbBoxed('3.0  Operational Team', { table: { widths: ['*','*','*'], body: teamTableBody }, layout: 'lightHorizontalLines' }),

    _msbBoxed('4.0  Competency', { table: { widths: ['35%','65%'], body: compTableBody }, layout: 'lightHorizontalLines' }),

    _msbBoxed('5.0  Plant and Machinery', { table: { widths: ['*','*','*'], body: equipTableBody }, layout: 'lightHorizontalLines' }),

    _msbBoxed('5.5  Site Specific Controls', siteControlsContent),

    _msbBoxed('6.0  Exclusion Zones', selectedEZ.length
      ? { table: { widths: ['40%','60%'], body: ezTableBody }, layout: 'lightHorizontalLines' }
      : { text: 'No exclusion zones selected for this job.', style: 'body' }),

    _msbBoxed('7.0  Permits Required', { table: { widths: ['40%','60%'], body: [
      [{text:'Permit Type',bold:true},{text:'Issued By',bold:true}],
      ['Highways Traffic Management', (msbState.job.permitsIssuedBy && msbState.job.permitsIssuedBy.highways) || '—'],
      ['Breaking Ground', (msbState.job.permitsIssuedBy && msbState.job.permitsIssuedBy.breakingGround) || '—']
    ]}, layout: 'lightHorizontalLines' }),

    _msbBoxed('8.0  PPE Requirements', { table: { widths: ppeWidths, body: ppeTableBody }, layout: 'lightHorizontalLines' }),

    _msbBoxed('9.0  Standard Operating Procedures', [
      { text: 'Only the SOPs relevant to this job are listed below.', style: 'noteText', margin: [0,0,0,8] }
    ].concat(sopContent), { pageBreak: 'before' })
  ];

  ['11.0','12.0','13.0','14.0'].forEach(function(n) { var b = _msbFixedSectionBox(n); if (b) content.push(b); });

  content.push(_msbBoxed('15.0  Emergency Arrangements', [
    { table: { widths: ['30%','70%'], body: [
      ['Nearest A&E Hospital', msbState.emergency.hospitalName || 'Not entered'],
      ['Address', msbState.emergency.hospitalAddress || '—'],
      ['Phone', msbState.emergency.hospitalPhone || '—']
    ]}, layout: 'lightHorizontalLines', margin: [0,0,0,12] },
    { text: 'Route Map', style: 'sopHeading', margin: [0,0,0,6] }
  ].concat(routeMapContent).concat([
    { table: { widths: ['40%','60%'], body: [
      ['Distance from site to Urgent Care Service', msbState.emergency.routeDistance || '—'],
      ['Time from site to Urgent Care', msbState.emergency.routeTime || '—']
    ]}, layout: 'lightHorizontalLines' }
  ])));

  ['16.0','17.0','18.0','19.0','20.0','21.0','22.0','23.0','24.0','25.0','26.0','27.0','28.0','29.0'].forEach(function(n) {
    var b = _msbFixedSectionBox(n); if (b) content.push(b);
  });

  return {
    pageSize: 'A4',
    pageMargins: [40,80,40,50],
    images: pdfImages,
    header: function() {
      return { margin: [40,18,40,0], columns: [
        { image: 'logo', width: 110 },
        { text: 'Method Statement', alignment: 'right', fontSize: 8, color: '#888', margin: [0,10,0,0] }
      ]};
    },
    footer: function(currentPage, pageCount) {
      return { text: 'Page ' + currentPage + ' of ' + pageCount, alignment: 'center', fontSize: 8, color: '#888' };
    },
    content: content,
    styles: {
      title: { fontSize:24, bold:true, color:'#20342c' },
      subtitle: { fontSize:13, color:'#5a625c' },
      boxTitle: { fontSize:12.5, bold:true, color:'#20342c', margin:[10,7,10,7] },
      sopHeading: { fontSize:12.5, bold:true, color:'#5b4636' },
      body: { fontSize:10.5, color:'#20241f', lineHeight:1.3 },
      noteText: { fontSize:9, italics:true, color:'#888' }
    },
    defaultStyle: { fontSize: 10.5 }
  };
}

function generateMSBPDF() {
  var btn = document.getElementById('msbGenerateBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  ensureMSBPPEAssignments();
  msbState.status = 'sent';
  msbState.sentAt = new Date().toISOString();
  saveMSBRecord().catch(function(e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Generate PDF'; }
    alert('Could not save the method statement — check your connection and try again.' + (e && e.message ? ' (' + e.message + ')' : ''));
    throw { _msbHandled: true };
  }).then(function() {
    var savedImages = (msbState.job.siteControlImages || []).filter(function(p) { return p.storagePath; });
    var routeMapPath = msbState.emergency.routeMap && msbState.emergency.routeMap.storagePath;
    // A single unreachable photo must not block the whole PDF — skip it, don't reject.
    return Promise.all([
      Promise.all(savedImages.map(function(p) {
        return _msbFetchAsDataUrl(_msbSiteImgAuthUrl(p.storagePath)).catch(function() { return null; });
      })),
      routeMapPath ? _msbFetchAsDataUrl(_msbSiteImgAuthUrl(routeMapPath)).catch(function() { return null; }) : Promise.resolve(null)
    ]);
  }).then(function(results) {
    var resolvedSiteImages = results[0].filter(Boolean);
    var resolvedRouteMapImage = results[1];
    _loadPdfMake(function(err) {
      if (err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Generate PDF'; }
        alert('Could not load the PDF library — check your connection and try again.');
        return;
      }
      try {
        var doc = buildMSBDocDefinition(resolvedSiteImages, resolvedRouteMapImage);
        pdfMake.createPdf(doc).download('method-statement-' + (msbState.job.client || 'job').replace(/\s+/g,'-').toLowerCase() + '.pdf');
      } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = 'Generate PDF'; }
        alert('Could not generate PDF: ' + (e && e.message ? e.message : 'unknown error'));
        return;
      }
      renderMSBAll();
    });
  }).catch(function(e) {
    if (e && e._msbHandled) return;
    if (btn) { btn.disabled = false; btn.textContent = 'Generate PDF'; }
    alert('Could not build the PDF: ' + (e && e.message ? e.message : 'unknown error'));
  });
}
