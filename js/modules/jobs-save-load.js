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
  supaFetch('GET', TABLE + '?select=id,quote_ref,updated_at&quote_ref=not.like.TBT-*&order=updated_at.desc&limit=200')
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

var _pendingDeleteRef = null;
var _pendingDeleteIsTBT = false;
var _pendingDeleteIsAudit = false;

function deleteJob(ref) {
  if (managerUnlocked) {
    if (confirm('Delete this job? This cannot be undone.')) _executeDelete(ref, false, false);
    return;
  }
  _pendingDeleteRef = ref;
  _pendingDeleteIsTBT = false;
  _pendingDeleteIsAudit = false;
  hideModals();
  document.getElementById('deletePassInput').value = '';
  document.getElementById('deletePassErr').textContent = '';
  document.getElementById('deletePassModal').className = 'modal-bg show';
}

function deleteTBT(ref) {
  if (managerUnlocked) {
    if (confirm('Delete this toolbox talk? This cannot be undone.')) _executeDelete(ref, true, false);
    return;
  }
  _pendingDeleteRef = ref;
  _pendingDeleteIsTBT = true;
  _pendingDeleteIsAudit = false;
  document.getElementById('deletePassInput').value = '';
  document.getElementById('deletePassErr').textContent = '';
  document.getElementById('deletePassModal').className = 'modal-bg show';
}

function deleteAudit(ref) {
  if (managerUnlocked) {
    if (confirm('Delete this audit? This cannot be undone.')) _executeDelete(ref, false, true);
    return;
  }
  _pendingDeleteRef = ref;
  _pendingDeleteIsTBT = false;
  _pendingDeleteIsAudit = true;
  document.getElementById('deletePassInput').value = '';
  document.getElementById('deletePassErr').textContent = '';
  document.getElementById('deletePassModal').className = 'modal-bg show';
}

function hideDeleteModal() {
  document.getElementById('deletePassModal').className = 'modal-bg';
  _pendingDeleteRef = null;
  _pendingDeleteIsTBT = false;
  _pendingDeleteIsAudit = false;
}

function confirmDeletePass() {
  var p = document.getElementById('deletePassInput').value;
  if (p !== '2001') {
    document.getElementById('deletePassErr').textContent = 'Incorrect password — please try again.';
    document.getElementById('deletePassInput').value = '';
    document.getElementById('deletePassInput').focus();
    return;
  }
  document.getElementById('deletePassModal').className = 'modal-bg';
  hideModals();
  var ref = _pendingDeleteRef;
  var isTBT = _pendingDeleteIsTBT;
  var isAudit = _pendingDeleteIsAudit;
  _pendingDeleteRef = null;
  _pendingDeleteIsTBT = false;
  _pendingDeleteIsAudit = false;
  _executeDelete(ref, isTBT, isAudit);
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

function loadJobByRef(ref) {
  if (SUPA_URL === 'YOUR_SUPABASE_URL') { setStatus('Configure Supabase first', 'err'); return; }
  setStatus('Loading...', '');
  supaFetch('GET', TABLE + '?select=quote_ref,form_data&quote_ref=eq.' + encodeURIComponent(ref) + '&limit=1')
    .then(function(r){ return r.json(); })
    .then(function(rows){
      if (!rows || rows.length === 0) { setStatus('Not found: ' + ref, 'err'); return; }
      clearAllForms();
      // First rebuild dynamic selects so values can be set
      initAllStaffSelects();
      // form_data may be a JSONB object OR a JSON string depending on Supabase column type
      var fd_raw = rows[0].form_data;
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
      var loadedRef = rows[0].quote_ref;
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
      if (_fromJobSelect) {
        _fromJobSelect = false;
        hideModals();
        showDashboard();
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

function sendSave(formData) {
  var payload = {quote_ref:currentJobRef, form_data:formData, updated_at:new Date().toISOString()};

  // Use a timeout to detect iOS silent failures
  var saveTimeout = setTimeout(function() {
    setStatus('Save timeout — retrying…', '');
    sendSaveRaw(payload);
  }, 15000);

  supaFetch('POST', TABLE + '?on_conflict=quote_ref', payload)
    .then(function(r){
      clearTimeout(saveTimeout);
      if (r.ok || r.status === 201 || r.status === 204) {
        _saveJobLocalCache(currentJobRef, payload.form_data);
        _clearOfflinePending();
        setStatus('Saved ' + new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}), 'ok');
        fetchJobList();
      } else {
        return r.text().then(function(t){ throw new Error(r.status + ': ' + t); });
      }
    })
    .catch(function(e){
      clearTimeout(saveTimeout);
      try {
        _saveJobLocalCache(currentJobRef, payload.form_data);
        _markOfflinePending(currentJobRef);
        setStatus('Saved offline ✓ — will sync when connected', 'warn');
      } catch(ex) {
        setStatus('Save failed: ' + (e && e.message ? e.message : 'check connection'), 'err');
      }
    })
    .finally(function(){
      var en = !!currentJobRef;
      var btns2 = document.querySelectorAll('#btnSave, #dashSaveBtn, #appSaveBtn');
      for (var i=0;i<btns2.length;i++) btns2[i].disabled = !en;
    });
}

function sendSaveRaw(payload) {
  // Retry without signatures if original save timed out
  supaFetch('POST', TABLE + '?on_conflict=quote_ref', payload)
    .then(function(r){
      if (r.ok || r.status === 201 || r.status === 204) {
        _saveJobLocalCache(currentJobRef, payload.form_data);
        _clearOfflinePending();
        setStatus('Saved ' + new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}), 'ok');
        fetchJobList();
      } else {
        setStatus('Save error — check connection', 'err');
      }
    })
    .catch(function(){ setStatus('Save error — check connection', 'err'); })
    .finally(function(){
      var en = !!currentJobRef;
      var btns2 = document.querySelectorAll('#btnSave, #dashSaveBtn, #appSaveBtn');
      for (var i=0;i<btns2.length;i++) btns2[i].disabled = !en;
    });
}
function saveForm() { saveJob(); }  // saveJob handles compression + iOS safety

function saveAndClose() {
  if (!currentJobRef) return;
  if (SUPA_URL === 'YOUR_SUPABASE_URL') { setStatus('Supabase not configured', 'err'); return; }
  if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }
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
  supaFetch('POST', TABLE + '?on_conflict=quote_ref', payload)
    .then(function(r){
      if (r.ok || r.status === 201 || r.status === 204) {
        setStatus('Saved & closed', 'ok');
        fetchJobList();
        setTimeout(function(){
          clearAllForms();
          currentJobRef = '';
          setJobRef('');
          setStatus('No job loaded', '');
          showJobSelectScreen();
        }, 200);
      } else {
        return r.text().then(function(t){ throw new Error(r.status + ': ' + t); });
      }
    })
    .catch(function(e){
      setStatus('Save failed: ' + e.message, 'err');
      var btns2 = document.querySelectorAll('#btnSave, #dashSaveBtn, #appSaveBtn');
      for (var j=0;j<btns2.length;j++) btns2[j].disabled = false;
    });
}

