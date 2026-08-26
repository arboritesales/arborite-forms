// ── JOB BAR / MODALS ──
function setJobRef(ref) {
  currentJobRef = ref;
  var fields = ['p_quote','so_quote','ms_jobno','dr_quote'];
  for (var i = 0; i < fields.length; i++) {
    var el = document.getElementById(fields[i]);
    if (el) el.value = ref;
  }
  var barEl = document.getElementById('barRef');
  if (barEl) barEl.innerHTML = ref
    ? '<span style="color:var(--lime);">' + ref + '</span>'
    : 'No job loaded';
  var btn = document.getElementById('btnSave');
  if (btn) btn.disabled = !(ref && ref.length > 0);
  var dashRef = document.getElementById('dash-job-ref-display');
  if (dashRef) dashRef.textContent = ref || 'No job loaded';
  var dashBtn = document.getElementById('dashSaveBtn');
  if (dashBtn) dashBtn.disabled = !(ref && ref.length > 0);
  var appBtn = document.getElementById('appSaveBtn');
  if (appBtn) appBtn.disabled = !(ref && ref.length > 0);
  var appRef = document.getElementById('appBarRef');
  if (appRef) appRef.textContent = ref || 'No job loaded';
  var offRef = document.getElementById('officeJobRef');
  if (offRef) offRef.textContent = ref || 'No job loaded';
  // Show/hide New Job & Load Job buttons on dashboard based on whether a job is active
  var btnNew  = document.querySelector('.btn-new');
  var btnLoad = document.querySelector('.btn-load');
  if (btnNew)  btnNew.style.display  = ref ? 'none' : '';
  if (btnLoad) btnLoad.style.display = ref ? 'none' : '';
}

function onQuoteRefInput(val) {
  val = val.toUpperCase();
  document.getElementById('p_quote').value = val;
  setJobRef(val);
  syncShared();
}

function generateJobRef() {
  // Generate QU-XXXX where XXXX is based on date + random
  var d = new Date();
  var yr = String(d.getFullYear()).slice(-2);
  var mo = String(d.getMonth()+1).padStart(2,'0');
  var rand = String(Math.floor(Math.random()*900)+100);
  return 'QU-' + yr + mo + rand;
}

function showNewJobModal() {
  var ref = generateJobRef();
  document.getElementById('newJobRef').value = ref;
  // Show warning if a job is already loaded
  var warn = document.getElementById('newJobWarning');
  var warnText = document.getElementById('newJobWarningText');
  if (warn && warnText) {
    if (currentJobRef) {
      warnText.textContent = 'Job ' + currentJobRef + ' is currently loaded.';
      warn.style.display = 'block';
    } else {
      warn.style.display = 'none';
    }
  }
  document.getElementById('newJobModal').className = 'modal-bg show';
  setTimeout(function(){
    var inp = document.getElementById('newJobRef');
    inp.focus();
    inp.select();
  }, 100);
}

function confirmNewJob() {
  var ref = document.getElementById('newJobRef').value.trim().toUpperCase();
  if (!ref) { alert('Please enter a quote reference.'); return; }
  hideModals();
  clearAllForms();
  setJobRef(ref);
  syncShared();
  setStatus('New job: ' + ref, 'ok');
  if (_fromJobSelect) {
    _fromJobSelect = false;
    var jss = document.getElementById('jobSelectScreen');
    if (jss) jss.style.display = 'none';
    openForm('signoff');
  }
}

function clearAllForms() {
  var inputs = document.querySelectorAll('input[type="text"], input[type="date"], textarea');
  for (var i = 0; i < inputs.length; i++) inputs[i].value = '';
  var checks = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
  for (var i = 0; i < checks.length; i++) checks[i].checked = false;
  var sels = document.querySelectorAll('select');
  for (var i = 0; i < sels.length; i++) sels[i].selectedIndex = 0;
  for (var id in pads) {
    var pd = pads[id];
    if (pd && pd.ctx && pd.sized) pd.ctx.clearRect(0, 0, pd.canvas.width, pd.canvas.height);
  }
  CUSTOM_STAFF = []; CUSTOM_MACHINES = [];
  // Wipe any custom names added during the previous job's session — without
  // this, a name typed into "+ Add new name..." for one job stays selectable
  // in every name dropdown for whichever job is opened next.
  refreshStaffSelects();
  refreshMachineSelects();
  // Reset the Daily Task Register so switching jobs doesn't leave stale
  // rows from the previous job lying around (or an out-of-sync drCount) —
  // ensureDailyRowsFor() rebuilds exactly what the newly loaded job needs.
  var drTbody = document.getElementById('drRows');
  if (drTbody) {
    // Drop stale pads[] entries for the canvases we're about to destroy —
    // otherwise initSig() sees pads[id].sized still true (from the old,
    // now-detached canvas) and skips initializing the freshly built one,
    // so signatures silently draw onto a canvas no longer in the DOM.
    var oldSigCanvases = drTbody.querySelectorAll('canvas[id]');
    for (var _oc = 0; _oc < oldSigCanvases.length; _oc++) delete pads[oldSigCanvases[_oc].id];
    drTbody.innerHTML = '';
  }
  drCount = 0;
  buildDailyRows(12);
  // Clear all uploaded documents and pre-fetch cache
  docStore = {};
  _docBlobCache = {};
  sigCache = {};
  setTimeout(renderAllDocLists, 50);
  // Reset overall rating buttons
  var btns = ['excellent','satisfactory','unsatisfactory'];
  for (var i = 0; i < btns.length; i++) {
    var b = document.getElementById('ovr_' + btns[i]);
    if (b) b.className = 'ovr-btn';
  }
}

function showLoadModal() {
  document.getElementById('loadSearch').value = '';
  document.getElementById('loadModal').className = 'modal-bg show';
  // Show any already-cached jobs immediately so the list isn't blank
  if (allJobs && allJobs.length > 0) {
    renderJobList(allJobs);
  } else {
    document.getElementById('jobList').innerHTML = '<div class="job-empty">Loading saved jobs...</div>';
  }
  if (SUPA_URL !== 'YOUR_SUPABASE_URL') {
    // Refresh from Supabase in the background — don't blank the list while waiting
    var refreshTimeout = setTimeout(function() {
      var list = document.getElementById('jobList');
      if (list && list.innerHTML.indexOf('Loading saved jobs') > -1) {
        list.innerHTML = '<div class="job-empty" style="color:#e67e22;">Server is waking up, please wait… <span style="text-decoration:underline;cursor:pointer;" onclick="fetchJobList()">Retry</span></div>';
      }
    }, 15000);
    supaFetch('GET', TABLE + '?select=id,quote_ref,updated_at&quote_ref=not.like.TBT-*&quote_ref=not.like.AUD-*&quote_ref=not.like.MSB-*&order=updated_at.desc&limit=200')
      .then(function(r) {
        clearTimeout(refreshTimeout);
        if (!r.ok) return r.text().then(function(t){ throw new Error('HTTP ' + r.status + ': ' + t); });
        return r.json();
      })
      .then(function(rows) {
        if (!Array.isArray(rows)) throw new Error('Unexpected response: ' + JSON.stringify(rows).substring(0,100));
        allJobs = rows;
        renderJobList(allJobs);
      })
      .catch(function(e) {
        clearTimeout(refreshTimeout);
        var msg = e && e.message ? e.message : 'Unknown error';
        if (allJobs && allJobs.length > 0) {
          renderJobList(allJobs);
          setStatus('Refresh failed: ' + msg, 'err');
        } else {
          document.getElementById('jobList').innerHTML = '<div class="job-empty" style="color:#c0392b;">Error: ' + msg + '<br><span style="text-decoration:underline;cursor:pointer;" onclick="fetchJobList()">Retry</span></div>';
        }
      });
  }
}

function filterJobList(q) {
  q = (q || '').toLowerCase();
  var filtered = allJobs.filter(function(j) {
    var fd = j.form_data;
    if (fd && typeof fd === 'string') { try { fd = JSON.parse(fd); } catch(e) { fd = null; } }
    return j.quote_ref.toLowerCase().indexOf(q) > -1 ||
      (fd && fd.p_client && fd.p_client.toLowerCase().indexOf(q) > -1);
  });
  renderJobList(filtered);
}

function renderJobList(jobs) {
  var list = document.getElementById('jobList');
  if (!jobs || jobs.length === 0) {
    list.innerHTML = '<div class="job-empty">No saved jobs found.</div>';
    return;
  }
  list.innerHTML = '';
  for (var i = 0; i < jobs.length; i++) {
    (function(j) {
      var fd = j.form_data;
      if (fd && typeof fd === 'string') { try { fd = JSON.parse(fd); } catch(e) { fd = null; } }
      var client = (fd && fd.p_client) ? fd.p_client : '';
      var saved  = j.updated_at ? new Date(j.updated_at).toLocaleDateString('en-GB') : '';
      var row = document.createElement('div');
      row.className = 'job-item';
      var info = document.createElement('div');
      info.style.flex = '1'; info.style.cursor = 'pointer';
      var ref = document.createElement('div'); ref.className = 'job-item-ref'; ref.textContent = j.quote_ref;
      var det = document.createElement('div'); det.className = 'job-item-info'; det.textContent = client;
      var dt  = document.createElement('div'); dt.className  = 'job-item-date'; dt.textContent = saved;
      info.appendChild(ref); info.appendChild(det);
      info.addEventListener('click', function() { hideModals(); loadJobByRef(j.quote_ref); });
      var link = document.createElement('button');
      link.className = 'job-del-btn'; link.title = 'Get shareable link'; link.innerHTML = '&#128279;';
      link.style.marginRight = '4px';
      link.addEventListener('click', function(e) { e.stopPropagation(); openJobLinkManager(j.quote_ref); });
      var del = document.createElement('button');
      del.className = 'job-del-btn'; del.title = 'Delete'; del.innerHTML = '&#x1F5D1;';
      del.addEventListener('click', function(e) { e.stopPropagation(); deleteJob(j.quote_ref); });
      row.appendChild(info); row.appendChild(dt); row.appendChild(link); row.appendChild(del);
      list.appendChild(row);
    })(jobs[i]);
  }
}

function hideModals() {
  document.getElementById('newJobModal').className = 'modal-bg';
  document.getElementById('loadModal').className = 'modal-bg';
}

// ── JOB DOCUMENTS TABLE ──
var DOC_TABLE = 'job_documents';

function _docFetch(method, path, body, prefer) {
  var h = {'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken()};
  if (prefer) h['Prefer'] = prefer;
  var opts = {method:method, headers:h, credentials:'omit', mode:'cors'};
  if (body) opts.body = JSON.stringify(body);
  return fetch(SUPA_URL + '/rest/v1/' + path, opts);
}

function _docDbSave(jobRef, cat, name, mimeType, dataUrl, cb) {
  _docFetch('POST', DOC_TABLE, {job_ref:jobRef, category:cat, name:name, mime_type:mimeType, data:dataUrl}, 'return=representation')
    .then(function(r){ return r.json(); })
    .then(function(rows){ cb(null, rows && rows[0] ? rows[0].id : null); })
    .catch(function(e){ cb(e, null); });
}

function _docDbDelete(id) {
  _docFetch('DELETE', DOC_TABLE + '?id=eq.' + id).catch(function(){});
}

function _docDbLoad(jobRef, cb) {
  // Load metadata only (no data) — fast on all devices
  _docFetch('GET', DOC_TABLE + '?job_ref=eq.' + encodeURIComponent(jobRef) + '&select=id,category,name,mime_type')
    .then(function(r){ return r.json(); })
    .then(function(rows){ cb(null, rows || []); })
    .catch(function(e){ cb(e, []); });
}

function _docDbLoadData(id, cb) {
  // Fetch data for a single document on demand (when user taps View)
  _docFetch('GET', DOC_TABLE + '?id=eq.' + id + '&select=data')
    .then(function(r){ return r.json(); })
    .then(function(rows){ cb(null, rows && rows[0] ? rows[0].data : null); })
    .catch(function(e){ cb(e, null); });
}

// ── SUPABASE ──
function supaFetch(method, path, body) {
  var h = {'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken()};
  if (method === 'POST') h['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  // credentials:'omit' required for iOS Safari cross-origin fetch to work correctly
  var opts = {method:method, headers:h, credentials:'omit', mode:'cors'};
  if (body) {
    var bodyStr = JSON.stringify(body);
    opts.body = bodyStr;
    // iOS Safari: set explicit content-length hint
    opts.headers['Content-Length'] = String((new TextEncoder().encode(bodyStr)).length);
  }
  return fetch(SUPA_URL + '/rest/v1/' + path, opts);
}

function setStatus(msg, type) {
  var el = document.getElementById('jobStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'job-status' + (type ? ' ' + type : '');
}

// ── SUPABASE STORAGE (signatures & documents) ──
var SIG_BUCKET = 'signatures';
var DOC_BUCKET = 'documents';

function _docPath(quoteRef, categoryId, filename) {
  return quoteRef.replace(/[^a-zA-Z0-9_-]/g, '_') + '/' + categoryId + '/' + filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}
function _docAuthUrl(path) {
  return SUPA_URL + '/storage/v1/object/authenticated/' + DOC_BUCKET + '/' + path;
}
function _uploadDocFile(path, dataUrl, mimeType) {
  var base64 = dataUrl.split(',')[1];
  if (!base64) return Promise.reject(new Error('bad dataUrl'));
  var chars = atob(base64), bytes = new Uint8Array(chars.length);
  for (var i = 0; i < chars.length; i++) bytes[i] = chars.charCodeAt(i);
  return fetch(SUPA_URL + '/storage/v1/object/' + DOC_BUCKET + '/' + path, {
    method: 'POST',
    headers: {'apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken(),'Content-Type':mimeType||'application/octet-stream','x-upsert':'true'},
    body: bytes, credentials: 'omit', mode: 'cors'
  });
}
var DOC_CATEGORIES = ['method_statement','plans','reports','tree_survey','tpo_approval','additional'];

function uploadDocsToStorage(formData, done) {
  var docs = formData._documents || {};
  var toUpload = [];
  var DC = DOC_CATEGORIES;
  DC.forEach(function(cat) {
    if (!docs[cat]) return;
    docs[cat].forEach(function(doc, idx) {
      if (doc.data && doc.data.indexOf('data:') === 0) toUpload.push({cat:cat, idx:idx, doc:doc});
    });
  });
  var i = 0;
  function uploadNext() {
    if (i >= toUpload.length) { done(); return; }
    var item = toUpload[i++];
    var path = _docPath(currentJobRef, item.cat, item.doc.name);
    _uploadDocFile(path, item.doc.data, item.doc.type)
      .then(function(r) {
        if (r.ok || r.status === 200 || r.status === 201) {
          docs[item.cat][item.idx].data = 'storage:' + path;
          _removeDocLocal(currentJobRef, item.cat, item.doc.name);
          if (docStore[item.cat] && docStore[item.cat][item.idx]) {
            docStore[item.cat][item.idx].data = 'storage:' + path;
            docStore[item.cat][item.idx].status = 'saved';
            renderDocList(item.cat);
          }
        }
        uploadNext();
      })
      .catch(function() { uploadNext(); });
  }
  uploadNext();
}

function _storagePath(quoteRef, sigId) {
  return quoteRef.replace(/[^a-zA-Z0-9_-]/g, '_') + '/' + sigId + '.jpg';
}
function _storageAuthUrl(path) {
  return SUPA_URL + '/storage/v1/object/authenticated/' + SIG_BUCKET + '/' + path;
}
function _uploadSig(path, jpegDataUrl) {
  var base64 = jpegDataUrl.split(',')[1];
  if (!base64) return Promise.reject(new Error('bad dataUrl'));
  var chars = atob(base64), bytes = new Uint8Array(chars.length);
  for (var i = 0; i < chars.length; i++) bytes[i] = chars.charCodeAt(i);
  return fetch(SUPA_URL + '/storage/v1/object/' + SIG_BUCKET + '/' + path, {
    method: 'POST',
    headers: {'apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken(),'Content-Type':'image/jpeg','x-upsert':'true'},
    body: bytes, credentials: 'omit', mode: 'cors'
  });
}
function _deleteStorageBucketFolder(bucket, prefix) {
  return fetch(SUPA_URL + '/storage/v1/object/list/' + bucket, {
    method: 'POST',
    headers: {'apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken(),'Content-Type':'application/json'},
    body: JSON.stringify({prefix:prefix, limit:500}), credentials:'omit'
  })
  .then(function(r){ return r.json(); })
  .then(function(files){
    if (!files || files.error) {
      console.error('Storage list failed for ' + bucket + '/' + prefix, files);
      return { ok: false, reason: (files && (files.message || files.error)) || 'could not list files' };
    }
    if (!files.length) return { ok: true, deleted: 0 };
    var names = files.map(function(f){ return prefix + f.name; });
    return fetch(SUPA_URL + '/storage/v1/object/' + bucket, {
      method: 'DELETE',
      headers: {'apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken(),'Content-Type':'application/json'},
      body: JSON.stringify({prefixes: names}), credentials: 'omit'
    }).then(function(r) {
      if (!r.ok) {
        return r.json().catch(function(){ return null; }).then(function(body) {
          console.error('Storage delete failed for ' + bucket + '/' + prefix, r.status, body);
          return { ok: false, reason: (body && body.message) || ('HTTP ' + r.status) };
        });
      }
      return { ok: true, deleted: names.length };
    });
  })
  .catch(function(e){
    console.error('Storage cleanup error for ' + bucket + '/' + prefix, e);
    return { ok: false, reason: (e && e.message) || 'network error' };
  });
}

function _deleteStorageFolder(quoteRef) {
  var prefix = quoteRef.replace(/[^a-zA-Z0-9_-]/g, '_') + '/';
  _deleteStorageBucketFolder(SIG_BUCKET, prefix);
  // documents bucket is nested one level deeper (quoteRef/category/file), and the
  // storage list API only lists one level — so each category folder must be cleared individually
  DOC_CATEGORIES.forEach(function(cat) {
    _deleteStorageBucketFolder(DOC_BUCKET, prefix + cat + '/');
  });
}

function _saveJobListCache(rows) {
  try { localStorage.setItem('arb_job_list', JSON.stringify(rows)); } catch(e) {}
}
function _loadJobListCache() {
  try { var s = localStorage.getItem('arb_job_list'); return s ? JSON.parse(s) : null; } catch(e) { return null; }
}

// ── OFFLINE JOB CACHE ──
// This is only an offline fallback (the server copy is authoritative), so it's
// safe to cap and prune — unbounded growth here is what was freezing the two
// most-used iPads (every job ever opened piling up in localStorage, including
// base64 signature data, until the device's storage quota choked the page).
var LOCAL_JOB_CACHE_LIMIT = 15;

function _saveJobLocalCache(ref, data) {
  try {
    localStorage.setItem('arb_job_' + ref, JSON.stringify(data));
    _touchJobCacheOrder(ref);
  } catch(e) {}
}
function _loadJobLocalCache(ref) {
  try { var s = localStorage.getItem('arb_job_' + ref); return s ? JSON.parse(s) : null; } catch(e) { return null; }
}

function _loadJobCacheOrder() {
  try { var s = localStorage.getItem('arb_job_cache_order'); return s ? JSON.parse(s) : []; } catch(e) { return []; }
}
function _saveJobCacheOrder(order) {
  try { localStorage.setItem('arb_job_cache_order', JSON.stringify(order)); } catch(e) {}
}
// Marks `ref` as most-recently-used, then evicts whatever falls off the end
// of the cap so localStorage never accumulates more than LOCAL_JOB_CACHE_LIMIT
// cached jobs.
function _touchJobCacheOrder(ref) {
  var order = _loadJobCacheOrder().filter(function(r){ return r !== ref; });
  order.push(ref);
  while (order.length > LOCAL_JOB_CACHE_LIMIT) {
    var evicted = order.shift();
    try { localStorage.removeItem('arb_job_' + evicted); } catch(e) {}
  }
  _saveJobCacheOrder(order);
}
// One-time (per load) sweep for devices that built up cached jobs before this
// cap existed — any arb_job_* entry not tracked in the order list predates
// tracking, so its age is unknown; safest is to drop it immediately rather
// than guess. Also re-applies the cap in case the order list itself is stale.
function _pruneJobLocalCache() {
  try {
    var order = _loadJobCacheOrder();
    var tracked = {};
    for (var i = 0; i < order.length; i++) tracked[order[i]] = true;
    for (var k in localStorage) {
      if (k.indexOf('arb_job_') !== 0) continue;
      if (k === 'arb_job_list' || k === 'arb_job_cache_order') continue;
      var ref = k.substring('arb_job_'.length);
      if (!tracked[ref]) { try { localStorage.removeItem(k); } catch(e) {} }
    }
    while (order.length > LOCAL_JOB_CACHE_LIMIT) {
      var evicted = order.shift();
      try { localStorage.removeItem('arb_job_' + evicted); } catch(e) {}
    }
    _saveJobCacheOrder(order);
  } catch(e) {}
}
function _markOfflinePending(ref) {
  try { localStorage.setItem('arb_offline_pending', ref); } catch(e) {}
}
function _clearOfflinePending() {
  try { localStorage.removeItem('arb_offline_pending'); } catch(e) {}
}
function _getOfflinePending() {
  try { return localStorage.getItem('arb_offline_pending'); } catch(e) { return null; }
}
window.addEventListener('online', function() {
  var pending = _getOfflinePending();
  if (!pending) return;
  if (currentJobRef && currentJobRef === pending) {
    setStatus('Back online — syncing…', '');
    setTimeout(saveJob, 800);
  } else {
    setStatus('Back online — open job "' + pending + '" and save to sync', '');
  }
});

