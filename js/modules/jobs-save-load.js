// ── LOCAL DOC PERSISTENCE (survives page reload even if Storage upload pending) ──
function _saveDocLocal(ref, cat, name, dataUrl, mimeType) {
  try {
    localStorage.setItem('arb_doc_' + ref + '_' + cat + '_' + name, dataUrl);
    var idx = [];
    try { idx = JSON.parse(localStorage.getItem('arb_docidx_' + ref) || '[]'); } catch(e){}
    if (!idx.some(function(x){ return x.cat===cat && x.name===name; })) {
      idx.push({cat:cat, name:name, type:mimeType||'image/jpeg'});
      localStorage.setItem('arb_docidx_' + ref, JSON.stringify(idx));
    }
  } catch(e) {}
}
function _removeDocLocal(ref, cat, name) {
  try {
    localStorage.removeItem('arb_doc_' + ref + '_' + cat + '_' + name);
    var idx = [];
    try { idx = JSON.parse(localStorage.getItem('arb_docidx_' + ref) || '[]'); } catch(e){}
    idx = idx.filter(function(x){ return !(x.cat===cat && x.name===name); });
    if (idx.length) localStorage.setItem('arb_docidx_' + ref, JSON.stringify(idx));
    else localStorage.removeItem('arb_docidx_' + ref);
  } catch(e) {}
}
function _mergeLocalDocs(ref) {
  if (!ref) return;
  var idx = [];
  try { idx = JSON.parse(localStorage.getItem('arb_docidx_' + ref) || '[]'); } catch(e){}
  if (!idx.length) return;
  var changed = false;
  idx.forEach(function(item) {
    var cats = docStore[item.cat] || [];
    // If doc already made it to Supabase Storage, clear local copy
    var savedToStorage = cats.some(function(d){ return d.name===item.name && d.data && d.data.indexOf('storage:')===0; });
    if (savedToStorage) { _removeDocLocal(ref, item.cat, item.name); return; }
    // Don't add duplicate
    if (cats.some(function(d){ return d.name===item.name; })) return;
    // Restore from localStorage
    var dataUrl = '';
    try { dataUrl = localStorage.getItem('arb_doc_' + ref + '_' + item.cat + '_' + item.name) || ''; } catch(e){}
    if (!dataUrl) return;
    if (!docStore[item.cat]) docStore[item.cat] = [];
    docStore[item.cat].push({name:item.name, type:item.type||'image/jpeg', data:dataUrl, status:'local'});
    changed = true;
  });
  if (changed) setTimeout(renderAllDocLists, 50);
}

function fetchJobList() {
  // Load from cache immediately so list is never blank
  var cached = _loadJobListCache();
  if (cached && cached.length && (!allJobs || !allJobs.length)) {
    allJobs = cached;
    renderJobList(allJobs);
  }
  supaFetch('GET', TABLE + '?select=id,quote_ref,updated_at&quote_ref=not.like.TBT-*&quote_ref=not.like.AUD-*&quote_ref=not.like.MSB-*&order=updated_at.desc&limit=200')
    .then(function(r) {
      if (!r.ok) return r.text().then(function(t){ throw new Error('HTTP ' + r.status + ' ' + t.substring(0,80)); });
      return r.json();
    })
    .then(function(rows) {
      if (!Array.isArray(rows)) throw new Error('Bad response');
      allJobs = rows;
      _saveJobListCache(rows);
      renderJobList(allJobs);
    })
    .catch(function(e) {
      var msg = e && e.message ? e.message : 'Unknown error';
      var list = document.getElementById('jobList');
      if (allJobs && allJobs.length) {
        // Show cached jobs with a warning
        renderJobList(allJobs);
        if (list) {
          var warn = document.createElement('div');
          warn.style.cssText = 'color:#e67e22;font-size:11px;padding:6px 12px;';
          warn.innerHTML = '⚠ Showing cached jobs (' + msg + ') — <span style="text-decoration:underline;cursor:pointer;" onclick="fetchJobList()">Retry</span>';
          list.insertBefore(warn, list.firstChild);
        }
      } else {
        if (list) list.innerHTML = '<div class="job-empty" style="color:#c0392b;">Error: ' + msg + '<br><br><span style="text-decoration:underline;cursor:pointer;font-weight:700;" onclick="fetchJobList()">Tap to retry</span></div>';
      }
    });
}

function _managerOnlyDelete(what) {
  if (managerUnlocked) return true;
  alert('Only the Manager login can delete ' + what + '. Log out and sign in with the Manager password.');
  return false;
}

function deleteJob(ref) {
  if (!_managerOnlyDelete('jobs')) return;
  if (confirm('Delete this job? This cannot be undone.')) _executeDelete(ref, false, false);
}

function deleteTBT(ref) {
  if (!_managerOnlyDelete('toolbox talks')) return;
  if (confirm('Delete this toolbox talk? This cannot be undone.')) _executeDelete(ref, true, false);
}

function deleteAudit(ref) {
  if (!_managerOnlyDelete('audits')) return;
  if (confirm('Delete this audit? This cannot be undone.')) _executeDelete(ref, false, true);
}

function _executeDelete(ref, isTBT, isAudit) {
  supaFetch('DELETE', TABLE + '?quote_ref=eq.' + encodeURIComponent(ref))
    .then(function(r) {
      if (r.ok || r.status === 204) {
        if (isTBT) {
          fetchTBTList();
          setStatus('TBT deleted: ' + ref, '');
        } else if (isAudit) {
          fetchAuditList();
          setStatus('Audit deleted: ' + ref, '');
        } else {
          _deleteStorageFolder(ref);
          allJobs = allJobs.filter(function(j){ return j.quote_ref !== ref; });
          renderJobList(allJobs);
          if (currentJobRef === ref) {
            setJobRef('');
            setStatus('Job deleted', '');
          } else {
            setStatus('Deleted: ' + ref, '');
          }
        }
      }
    })
    .catch(function(e){ alert('Delete failed: ' + e.message); });
}

// Applies a loaded job's data to the DOM — shared by the normal team-login
// load path (loadJobByRef below) and the subcontractor job-link path
// (bootstrapJobLink in job-share-link.js), so both stay in sync.
function _applyLoadedJobData(loadedRef, fd_raw) {
  clearAllForms();
  // First rebuild dynamic selects so values can be set
  initAllStaffSelects();
  // form_data may be a JSONB object OR a JSON string depending on Supabase column type
  var fd_parsed = (typeof fd_raw === 'string') ? JSON.parse(fd_raw) : fd_raw;
  // Grow the Daily Task Register to fit however many rows this job
  // actually has saved, BEFORE restoring — otherwise rows beyond the
  // default 12 have no DOM element to restore into and get wiped by
  // the next autosave (saves are a full overwrite, not a merge).
  ensureDailyRowsFor(fd_parsed);
  restoreFormData(fd_parsed);
  // Re-sync shared fields and re-apply supervisor value after select is populated
  setTimeout(function() { /* 50ms: enough for selects to populate */
    syncShared();
    var fd = fd_parsed;
    if (fd) {
      var superSels = ['p_completed_by']; // supervisor fields restored independently by their own IDs
      for (var si = 0; si < superSels.length; si++) {
        var sel = document.getElementById(superSels[si]);
        if (sel && fd[superSels[si]]) {
          // Make sure the value exists in options, if not add it
          var found = false;
          for (var oi = 0; oi < sel.options.length; oi++) {
            if (sel.options[oi].value === fd[superSels[si]]) { found = true; break; }
          }
          if (!found && fd[superSels[si]]) {
            var newOpt = document.createElement('option');
            newOpt.value = fd[superSels[si]];
            newOpt.textContent = fd[superSels[si]];
            sel.appendChild(newOpt);
          }
          sel.value = fd[superSels[si]];
        }
      }
      // Restore text override fields
      if (fd.ms_supervisor_text) {
        var mst = document.getElementById('ms_supervisor_text');
        if (mst) mst.value = fd.ms_supervisor_text;
      }
      if (fd.ms_super_name_text) {
        var msnt = document.getElementById('ms_super_name_text');
        if (msnt) msnt.value = fd.ms_super_name_text;
      }
      // Also ensure shared text fields are properly restored
      var sharedFields = ['so_client','ms_client','so_site','ms_site','p_address','so_quote','ms_jobno','p_quote','dr_quote','dr_site','so_w3w','ms_w3w'];
      for (var sf = 0; sf < sharedFields.length; sf++) {
        var fld = document.getElementById(sharedFields[sf]);
        if (fld && fd[sharedFields[sf]]) fld.value = fd[sharedFields[sf]];
      }
      // Restore w3w link buttons
      if (fd.so_w3w) updateW3WLink('so_w3w_link', fd.so_w3w);
      if (fd.ms_w3w) updateW3WLink('ms_w3w_link', fd.ms_w3w);
    }
  }, 50);
  setJobRef(loadedRef);
  _saveJobLocalCache(loadedRef, fd_parsed);
  syncShared();
  setStatus('Loaded: ' + loadedRef, 'ok');
  // Load documents from dedicated table
  _docDbLoad(loadedRef, function(err, docs) {
    docStore = {};
    if (!err && docs.length) {
      docs.forEach(function(row) {
        if (!docStore[row.category]) docStore[row.category] = [];
        // data is null — fetched on demand when user taps View
        docStore[row.category].push({name:row.name, type:row.mime_type, data:null, status:'saved', dbId:row.id});
      });
    }
    renderAllDocLists();
    _mergeLocalDocs(loadedRef);
  });
}

function loadJobByRef(ref) {
  if (SUPA_URL === 'YOUR_SUPABASE_URL') { setStatus('Configure Supabase first', 'err'); return; }
  setStatus('Loading...', '');
  supaFetch('GET', TABLE + '?select=quote_ref,form_data,updated_at&quote_ref=eq.' + encodeURIComponent(ref) + '&limit=1')
    .then(function(r){ return r.json(); })
    .then(function(rows){
      if (!rows || rows.length === 0) { setStatus('Not found: ' + ref, 'err'); return; }
      var serverAt = rows[0].updated_at;
      // Changes still waiting to sync: show them only if they were made on top
      // of the version that is saved now. If the job has been saved elsewhere
      // since, this device's copy is out of date — show the saved job and keep
      // the device's copy as a backup, rather than let it wipe newer work.
      var unsynced = null, stale = false;
      if (_isOfflinePending(ref)) {
        var local = _loadJobLocalCache(ref);
        var localBase = _storedJobBase(ref);
        if (local && localBase !== undefined && _sameTime(localBase, serverAt)) unsynced = local;
        else if (local) { _keepConflictCopy(rows[0].quote_ref, local); stale = true; }
        _clearOfflinePending(ref);
        if (unsynced) _markOfflinePending(ref);
      }
      _applyLoadedJobData(rows[0].quote_ref, unsynced || rows[0].form_data);
      _useJobBase(rows[0].quote_ref, serverAt);
      if (_fromJobSelect) {
        _fromJobSelect = false;
        hideModals();
        showDashboard();
      }
      if (unsynced) setStatus('Showing your unsynced changes — save to send them', 'warn');
      if (stale) {
        setStatus('Loaded the latest saved version', 'warn');
        alert('This device had changes to "' + rows[0].quote_ref + '" that were never sent, but the job has been saved on another device since.\n\n' +
              'To keep the other changes safe, the latest saved version is shown. This device\'s copy has been kept as a backup — add anything missing again.');
      }
    })
    .catch(function(e){
      var cached = _loadJobLocalCache(ref);
      if (cached) {
        clearAllForms();
        initAllStaffSelects();
        ensureDailyRowsFor(cached);
        restoreFormData(cached);
        setJobRef(ref);
        // Offline: base saves on the version this device last had from the
        // server, so they're refused if someone has saved since.
        _jobBase = {ref: ref, at: _storedJobBase(ref)};
        syncShared();
        _docDbLoad(ref, function(err, docs) {
          docStore = {};
          if (!err && docs.length) {
            docs.forEach(function(row) {
              if (!docStore[row.category]) docStore[row.category] = [];
              docStore[row.category].push({name:row.name, type:row.mime_type, data:row.data, status:'saved', dbId:row.id});
            });
          }
          renderAllDocLists();
          _mergeLocalDocs(ref);
        });
        setStatus('Loaded from local cache', 'warn');
        if (_fromJobSelect) { _fromJobSelect = false; hideModals(); showDashboard(); }
      } else {
        setStatus('Load failed — offline and no cached data available', 'err');
      }
    });
}

function compressSignatures(data) {
  // Convert PNG signatures to JPEG at 70% quality to reduce payload size
  // This is crucial for iOS Safari which has fetch body size limits
  if (!data.signatures) return data;
  var compressed = {};
  for (var id in data.signatures) {
    var orig = data.signatures[id];
    if (!orig || orig.indexOf('data:image/png') !== 0) { compressed[id] = orig; continue; }
    try {
      var img = new Image();
      var canvas = document.createElement('canvas');
      // Synchronous approach: use the cached dataUrl directly
      // Reduce by re-encoding as JPEG
      var tmpCanvas = document.createElement('canvas');
      // We need to do this synchronously - use a different approach
      // Just keep the dataUrl as-is but ensure it's valid
      compressed[id] = orig;
    } catch(e) { compressed[id] = orig; }
  }
  data.signatures = compressed;
  return data;
}

function saveJob() {
  if (!currentJobRef) { setStatus('Create or load a job first', 'err'); return; }
  if (SUPA_URL === 'YOUR_SUPABASE_URL') { setStatus('Supabase not configured', 'err'); return; }
  if (_saveBlockedRef && _saveBlockedRef === currentJobRef) {
    setStatus('NOT SAVED — this job was changed on another device. Open it again to carry on.', 'err');
    return;
  }
  if (_saveInFlight) { _saveQueued = true; return; } // runs again once this save is done
  _saveInFlight = true;
  setStatus('Saving…', '');
  // Disable all save buttons during save
  var saveBtns = document.querySelectorAll('#btnSave, #dashSaveBtn, #appSaveBtn');
  for (var i=0;i<saveBtns.length;i++) saveBtns[i].disabled = true;

  // Flush current canvas pixel data into pads[id].dataUrl before collecting.
  // Skip canvases already pointing at a Storage ref — only flush ones the
  // user has drawn on (dataUrl is base64 or unset).
  for (var _sid in pads) {
    var _sp = pads[_sid];
    if (!_sp || !_sp.sized) continue;
    if (_sp.dataUrl && _sp.dataUrl.indexOf('storage:') === 0) continue;
    var _sc = _sp.canvas || document.getElementById(_sid);
    if (_sc) {
      try {
        var _su = _sc.toDataURL('image/png');
        if (_su && _su.length > 100 && _su !== 'data:,') _sp.dataUrl = _su;
      } catch(e) {}
    }
  }

  // Collect and prepare data
  var formData = collectFormData();

  // Convert PNG sigs to JPEG to reduce payload size (critical for iOS)
  doSaveJob(formData);
}

function doSaveJob(formData) {
  // Step 1: compress PNG signatures to JPEG
  var sigs = formData.signatures || {};
  var sigIds = Object.keys(sigs);
  var idx = 0;

  function compressNext() {
    if (idx >= sigIds.length) { uploadSigsToStorage(formData); return; }
    var id = sigIds[idx++];
    var dataUrl = sigs[id];
    // Skip already-stored refs and short/empty values
    if (!dataUrl || dataUrl.length < 100 || dataUrl.indexOf('data:') !== 0) { compressNext(); return; }
    try {
      var img = new Image();
      img.onload = function() {
        try {
          var c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0);
          var jpeg = c.toDataURL('image/jpeg', 0.7);
          if (jpeg && jpeg.length < dataUrl.length) sigs[id] = jpeg;
        } catch(e) {}
        compressNext();
      };
      img.onerror = function() { compressNext(); };
      img.src = dataUrl;
    } catch(e) { compressNext(); }
  }
  compressNext();
}

function uploadSigsToStorage(formData) {
  // Step 2: upload new base64 signatures to Storage, replace with path refs
  var sigs = formData.signatures || {};
  var toUpload = Object.keys(sigs).filter(function(id) {
    return sigs[id] && sigs[id].indexOf('data:') === 0 && sigs[id].length > 100;
  });
  var idx = 0;

  function uploadNext() {
    if (idx >= toUpload.length) { sendSave(formData); return; }
    var id = toUpload[idx++];
    var path = _storagePath(currentJobRef, id);
    _uploadSig(path, sigs[id])
      .then(function(r) {
        if (r.ok || r.status === 200 || r.status === 201) {
          sigs[id] = 'storage:' + path;
          // Update pads cache so subsequent saves stay as storage refs
          if (pads[id]) pads[id].dataUrl = 'storage:' + path;
        }
        uploadNext();
      })
      .catch(function() { uploadNext(); }); // keep base64 if upload fails
  }
  uploadNext();
}

// Job-link mode (see job-share-link.js) has no team session, so it can't hit
// job_forms directly under RLS — it goes through the job_share_link_save RPC
// instead, which checks the link token itself. Same payload shape either way.
function _jobFormsUpsert(payload) {
  if (JOB_LINK_TOKEN) {
    return fetch(SUPA_URL + '/rest/v1/rpc/job_share_link_save', {
      method: 'POST',
      headers: {'Content-Type':'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken()},
      body: JSON.stringify({p_token: JOB_LINK_TOKEN, p_form_data: payload.form_data}),
      credentials: 'omit', mode: 'cors'
    });
  }
  return supaFetch('POST', TABLE + '?on_conflict=quote_ref', payload);
}

// ── SAVE ONLY OVER THE VERSION THIS SCREEN STARTED FROM ──
// A save sends the whole job, not just what changed. So a phone left open on
// an old copy used to wipe newer work the moment anyone touched it (QU2960,
// 12 Nov 2026). Now each save names the saved version it was based on
// (updated_at), and the server only accepts it if that is still the latest.
//
// _jobBase.at: undefined = not based on any saved version (a new job) — the
// save may only create the job, never replace one; null = based on a saved
// job with no updated_at; otherwise the updated_at the screen was loaded from.
var _jobBase = {ref: '', at: undefined};
var _saveBlockedRef = '';   // a save of this job was refused; stop autosaving it
var _saveInFlight = false;  // one save at a time, or the second looks like a clash
var _saveQueued = false;
var _afterSave = null;

function _getJobBase(ref) { return _jobBase.ref === ref ? _jobBase.at : undefined; }
// Kept on the device too, so offline changes can later be sent safely.
function _rememberJobBase(ref, at) {
  if (at === undefined) return;
  try { localStorage.setItem('arb_jobver_' + ref, JSON.stringify(at)); } catch(e) {}
}
function _storedJobBase(ref) {
  try { var s = localStorage.getItem('arb_jobver_' + ref); return s === null ? undefined : JSON.parse(s); } catch(e) { return undefined; }
}
function _useJobBase(ref, at) {
  _rememberJobBase(ref, at);
  if (ref !== currentJobRef) return;
  _jobBase = {ref: ref, at: at};
  _saveBlockedRef = '';
}
function _sameTime(a, b) {
  if (a == null || b == null) return a == null && b == null;
  return new Date(a).getTime() === new Date(b).getTime();
}

// Resolves {ok:true, at} when saved, {conflict:true, ...} when the job was
// changed elsewhere (nothing is written), and rejects on a network or server
// error so the caller can fall back to saving offline.
function _jobFormsSaveChecked(payload, base) {
  if (JOB_LINK_TOKEN) {
    return _jobFormsUpsert(payload).then(function(r) {
      if (!r.ok) return r.text().then(function(t){ throw new Error(r.status + ': ' + t); });
      return {ok: true, at: payload.updated_at};
    });
  }
  var ref = payload.quote_ref;
  var req;
  if (base === undefined) {
    // New job: plain insert, which the server refuses if the reference exists.
    req = supaFetch('POST', TABLE + '?select=updated_at', payload, 'return=representation');
  } else {
    req = supaFetch('PATCH', TABLE + '?select=updated_at&quote_ref=eq.' + encodeURIComponent(ref) +
                    '&updated_at=' + (base === null ? 'is.null' : 'eq.' + encodeURIComponent(base)),
                    {form_data: payload.form_data, updated_at: payload.updated_at}, 'return=representation');
  }
  return req.then(function(r) {
    if (r.status === 409) return _checkOwnSave(payload, base);
    if (!r.ok) return r.text().then(function(t){ throw new Error(r.status + ': ' + t); });
    return r.json().then(function(rows) {
      if (rows && rows.length) return {ok: true, at: rows[0].updated_at};
      return _checkOwnSave(payload, base);
    });
  });
}
// Nothing matched. If the saved job carries this save's own time, it is this
// save that landed (e.g. a retry after a slow first attempt) — not a clash.
function _checkOwnSave(payload, base) {
  return supaFetch('GET', TABLE + '?select=updated_at&quote_ref=eq.' + encodeURIComponent(payload.quote_ref) + '&limit=1')
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(rows) {
      var row = rows && rows[0];
      if (row && _sameTime(row.updated_at, payload.updated_at)) return {ok: true, at: row.updated_at};
      return {conflict: true, isNew: base === undefined, deleted: !row, serverAt: row ? row.updated_at : null};
    });
}

// A copy that could not be saved is never just dropped: it goes into the
// database's job history (job_forms_audit_log, as 'NOT SAVED') so it can be
// recovered, and onto this device.
function _keepConflictCopy(ref, formData) {
  try { localStorage.setItem('arb_conflict_' + ref, JSON.stringify({keptAt: new Date().toISOString(), form_data: formData})); } catch(e) {}
  if (JOB_LINK_TOKEN) return;
  supaFetch('POST', 'job_forms_audit_log', {operation: 'NOT SAVED', quote_ref: ref, form_data: formData}, 'return=minimal')
    .catch(function() {});
}

function _handleSaveConflict(payload, res) {
  var ref = payload.quote_ref;
  _keepConflictCopy(ref, payload.form_data);
  _saveBlockedRef = ref;
  if (res.deleted) {
    setStatus('NOT SAVED — this job has been deleted', 'err');
    alert('Job "' + ref + '" has been deleted, so this was NOT saved.\n\nA copy of your screen has been kept — ask the office if it needs bringing back.');
    return;
  }
  var msg;
  if (res.isNew) {
    setStatus('NOT SAVED — a job called ' + ref + ' already exists', 'err');
    msg = 'A job called "' + ref + '" already exists.\n\n' +
          'This was NOT saved, so the existing job has not been touched.\n\n' +
          'Press OK to open the existing job, or Cancel to stay on this screen (it will not save).';
  } else {
    var when = res.serverAt ? new Date(res.serverAt).toLocaleString('en-GB', {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) : 'recently';
    setStatus('NOT SAVED — this job was changed on another device. Open it again to carry on.', 'err');
    msg = 'Job "' + ref + '" was saved on another device (' + when + ') after you opened it.\n\n' +
          'Your changes were NOT saved, so the other changes are safe. A copy of your screen has been kept.\n\n' +
          'Press OK to open the latest version, then add your changes again.\n' +
          'Press Cancel to stay on this screen (it will not save).';
  }
  if (confirm(msg)) loadJobByRef(ref);
}

function _enableSaveButtons() {
  var en = !!currentJobRef;
  var btns = document.querySelectorAll('#btnSave, #dashSaveBtn, #appSaveBtn');
  for (var i = 0; i < btns.length; i++) btns[i].disabled = !en;
}
function _saveFinished() {
  _saveInFlight = false;
  _enableSaveButtons();
  if (_afterSave) { var f = _afterSave; _afterSave = null; _saveQueued = false; f(); }
  else if (_saveQueued) { _saveQueued = false; saveJob(); }
}

function _saveSucceeded(payload, at) {
  _useJobBase(payload.quote_ref, at);
  _saveJobLocalCache(payload.quote_ref, payload.form_data);
  _clearOfflinePending(payload.quote_ref);
  setStatus('Saved ' + new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}), 'ok');
  if (!JOB_LINK_TOKEN) fetchJobList();
  _resyncPendingJobs();
}

// Only says "Saved offline" if the copy really is on the device. Otherwise
// staff are told plainly, so they don't close the job and lose the work.
function _saveOfflineFallback(payload) {
  if (_saveJobLocalCache(payload.quote_ref, payload.form_data) && _markOfflinePending(payload.quote_ref)) {
    setStatus('Saved offline ✓ — will sync when connected', 'warn');
  } else {
    setStatus('NOT SAVED — no connection and this device\'s storage is full. Keep this job open and save again once connected.', 'err');
  }
}

function sendSave(formData) {
  var payload = {quote_ref:currentJobRef, form_data:formData, updated_at:new Date().toISOString()};
  var base = _getJobBase(currentJobRef);
  var done = false, retried = false;

  function finish(res) {
    if (done) return;
    done = true;
    clearTimeout(saveTimeout);
    if (res && res.ok) _saveSucceeded(payload, res.at);
    else if (res && res.conflict) _handleSaveConflict(payload, res);
    else _saveOfflineFallback(payload);
    _saveFinished();
  }

  // iOS can fail silently: if there's no answer in 15s, send the same save
  // again. Whichever answers first wins; the version check stops the two from
  // clashing, since a retry that finds its own save already landed is fine.
  var saveTimeout = setTimeout(function() {
    retried = true;
    setStatus('Save timeout — retrying…', '');
    _jobFormsSaveChecked(payload, base).then(finish, function(){ finish(null); });
  }, 15000);

  _jobFormsSaveChecked(payload, base).then(finish, function() {
    if (!retried) finish(null); // with a retry under way, wait for its answer
  });
}
function saveForm() { saveJob(); }  // saveJob handles compression + iOS safety

function saveAndClose() {
  if (!currentJobRef) return;
  if (SUPA_URL === 'YOUR_SUPABASE_URL') { setStatus('Supabase not configured', 'err'); return; }
  if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }
  if (_saveBlockedRef && _saveBlockedRef === currentJobRef) {
    setStatus('NOT SAVED — this job was changed on another device. Open it again to carry on.', 'err');
    return;
  }
  if (_saveInFlight) { _afterSave = saveAndClose; setStatus('Saving…', ''); return; }
  _saveInFlight = true;
  setStatus('Saving…', '');
  var saveBtns = document.querySelectorAll('#btnSave, #dashSaveBtn, #appSaveBtn');
  for (var i=0;i<saveBtns.length;i++) saveBtns[i].disabled = true;
  var formData = collectFormData();
  var savedRef = currentJobRef;

  // Compress signatures then save
  var sigs = formData.signatures || {};
  var sigIds = Object.keys(sigs);
  var idx2 = 0;
  function processNextSAC() {
    if (idx2 >= sigIds.length) { doSaveAndClose(formData, savedRef); return; }
    var id2 = sigIds[idx2++];
    var dataUrl2 = sigs[id2];
    if (!dataUrl2 || dataUrl2.length < 100 || dataUrl2.indexOf('storage:') === 0 || dataUrl2.indexOf('data:image/jpeg') === 0) { processNextSAC(); return; }
    try {
      var img2 = new Image();
      img2.onload = function() {
        try {
          var c2 = document.createElement('canvas');
          c2.width = img2.width; c2.height = img2.height;
          var ctx2 = c2.getContext('2d');
          ctx2.fillStyle = '#ffffff'; ctx2.fillRect(0,0,c2.width,c2.height);
          ctx2.drawImage(img2,0,0);
          var jpeg2 = c2.toDataURL('image/jpeg',0.7);
          if (jpeg2 && jpeg2.length < dataUrl2.length) sigs[id2] = jpeg2;
        } catch(e2) {}
        processNextSAC();
      };
      img2.onerror = function(){ processNextSAC(); };
      img2.src = dataUrl2;
    } catch(e3){ processNextSAC(); }
  }
  processNextSAC();
}

function doSaveAndClose(formData, savedRef) {
  // Try to upload any docs still in base64 to Storage (with 10s timeout),
  // then save — keeping storage refs or falling back to base64 for small files.
  var uploadDone = false;
  var uploadTimer = setTimeout(function() {
    if (!uploadDone) { uploadDone = true; _finishSaveAndClose(formData, savedRef); }
  }, 10000);
  uploadDocsToStorage(formData, function() {
    if (!uploadDone) {
      uploadDone = true;
      clearTimeout(uploadTimer);
      _finishSaveAndClose(formData, savedRef);
    }
  });
}

function _finishSaveAndClose(formData, savedRef) {
  // Strip only large base64 docs (>500KB) to keep payload manageable.
  // Small ones are kept as fallback if Storage upload failed.
  if (formData._documents) {
    var DC2 = ['method_statement','plans','reports','tree_survey','tpo_approval','additional'];
    DC2.forEach(function(cat) {
      if (!formData._documents[cat]) return;
      formData._documents[cat] = formData._documents[cat].filter(function(doc) {
        if (!doc.data) return false;
        if (doc.data.indexOf('storage:') === 0) return true; // keep storage refs
        return doc.data.length < 500000; // keep small base64 (<375KB file)
      });
      if (!formData._documents[cat].length) delete formData._documents[cat];
    });
  }
  var payload = {quote_ref:savedRef, form_data:formData, updated_at:new Date().toISOString()};
  _jobFormsSaveChecked(payload, _getJobBase(savedRef))
    .then(function(res){
      _saveInFlight = false;
      if (res.ok) {
        _rememberJobBase(savedRef, res.at);
        _clearOfflinePending(savedRef);
        setStatus('Saved & closed', 'ok');
        fetchJobList();
        setTimeout(function(){
          clearAllForms();
          setJobRef('');
          setStatus('No job loaded', '');
          showJobSelectScreen();
        }, 200);
      } else {
        _enableSaveButtons();
        _handleSaveConflict(payload, res);
      }
    })
    .catch(function(e){
      _saveInFlight = false;
      setStatus('Save failed: ' + e.message, 'err');
      _enableSaveButtons();
    });
}

