// ── DOCUMENT STORE ──
var docStore = {};
var DOC_CATS = ['method_statement','plans','reports','tree_survey','tpo_approval','additional'];
var MAX_DOCS_PER_CAT = 10;
var _docBlobCache = {}; // key: storage path → blob URL (pre-fetched)

// Uploads go to Supabase Storage as the original file, and job_documents only
// records where it is. If Storage refuses (bucket not set up), files up to
// MAX_DOC_DB_FALLBACK_BYTES fall back to the old base64-in-the-table storage —
// that's capped well below MAX_DOC_BYTES because huge rows in that table slow
// the whole database down for everyone.
var MAX_DOC_BYTES = 50 * 1024 * 1024;
var MAX_DOC_DB_FALLBACK_BYTES = 5 * 1024 * 1024;
var MAX_DOC_LOCAL_BACKUP_CHARS = 3 * 1024 * 1024; // localStorage only holds ~5MB in total

function _prefetchStorageDocs() {
  DOC_CATS.forEach(function(cat) {
    var docs = docStore[cat] || [];
    docs.forEach(function(doc) {
      if (!doc.data || doc.data.indexOf('storage:') !== 0) return;
      var path = doc.data.substring(8);
      if (_docBlobCache[path]) return; // already cached
      var url = _docAuthUrl(path);
      fetch(url, {credentials:'omit', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken()}})
        .then(function(r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then(function(blob) { _docBlobCache[path] = URL.createObjectURL(blob); })
        .catch(function() {}); // silently fail — will fall back to direct URL on tap
    });
  });
}

// ── PDF.js (lazy-loaded; draws PDFs page by page in the viewer) ──
var _pdfJsReady = false;
var _pdfJsLoading = false;
var _pdfJsQueue = [];
var PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
var PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function _loadPdfJs(cb) {
  if (_pdfJsReady) { cb(); return; }
  _pdfJsQueue.push(cb);
  if (_pdfJsLoading) return;
  _pdfJsLoading = true;
  var s = document.createElement('script');
  s.src = PDFJS_CDN;
  s.onload = function() {
    try { pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; } catch(e) {}
    _pdfJsReady = true; _pdfJsLoading = false;
    _pdfJsQueue.forEach(function(fn) { fn(); }); _pdfJsQueue = [];
  };
  s.onerror = function() {
    _pdfJsLoading = false;
    _pdfJsQueue.forEach(function(fn) { fn(true); }); _pdfJsQueue = [];
  };
  document.head.appendChild(s);
}

// Shows a PDF one canvas per page, only drawing pages near the screen and
// freeing them again once scrolled well away. Drawing a whole long survey
// report at once (as the old upload compression did) blows past Safari's
// canvas size limit and older iPads' memory. Returns a cleanup function.
function _renderPdfPages(container, url, onFail) {
  var state = {pdf: null, observer: null, closed: false};

  function freeCanvas(c) { c.width = 0; c.height = 0; }

  function drawPage(holder) {
    if (holder._canvas || holder._busy || state.closed) return;
    holder._busy = true;
    state.pdf.getPage(holder._pageNum).then(function(page) {
      if (state.closed || !holder._wanted) { holder._busy = false; return; }
      var base = page.getViewport({scale: 1});
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var scale = (holder.clientWidth || base.width) * dpr / base.width;
      var maxPixels = 4000000; // well under Safari's per-canvas limit
      if (base.width * base.height * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (base.width * base.height));
      var vp = page.getViewport({scale: scale});
      var canvas = document.createElement('canvas');
      canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
      canvas.style.cssText = 'display:block;width:100%;height:auto;';
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      holder._task = page.render({canvasContext: ctx, viewport: vp});
      return holder._task.promise.then(function() {
        holder._task = null; holder._busy = false;
        if (state.closed || !holder._wanted) { freeCanvas(canvas); return; }
        holder.innerHTML = '';
        holder.style.height = 'auto';
        holder.appendChild(canvas);
        holder._canvas = canvas;
      });
    }).catch(function() { holder._task = null; holder._busy = false; });
  }

  function releasePage(holder) {
    if (holder._task) { try { holder._task.cancel(); } catch(e) {} }
    if (!holder._canvas) return;
    holder.style.height = holder.offsetHeight + 'px'; // keep its space so the scroll position doesn't jump
    freeCanvas(holder._canvas);
    holder.innerHTML = '';
    holder._canvas = null;
  }

  function fail() { if (!state.closed) onFail(); }

  _loadPdfJs(function(err) {
    if (err) { fail(); return; }
    fetch(url)
      .then(function(r) { return r.arrayBuffer(); })
      .then(function(buf) { return pdfjsLib.getDocument({data: buf}).promise; })
      .then(function(pdf) {
        if (state.closed) { pdf.destroy(); return; }
        state.pdf = pdf;
        return pdf.getPage(1).then(function(first) {
          var vp1 = first.getViewport({scale: 1});
          container.innerHTML = '';
          container.style.display = 'block';
          container.style.padding = '8px';
          var width = Math.min(container.clientWidth - 16, 1000);
          var pages = [];
          for (var n = 1; n <= pdf.numPages; n++) {
            var holder = document.createElement('div');
            holder.style.cssText = 'width:100%;max-width:1000px;margin:0 auto 8px;background:#fff;color:#bbb;font:13px sans-serif;text-align:center;';
            holder.style.height = Math.round(width * vp1.height / vp1.width) + 'px';
            holder.textContent = 'Page ' + n;
            holder._pageNum = n;
            container.appendChild(holder);
            pages.push(holder);
          }
          if ('IntersectionObserver' in window) {
            state.observer = new IntersectionObserver(function(entries) {
              entries.forEach(function(e) {
                e.target._wanted = e.isIntersecting;
                if (e.isIntersecting) drawPage(e.target); else releasePage(e.target);
              });
            }, {root: container, rootMargin: '1500px 0px'});
            pages.forEach(function(h) { state.observer.observe(h); });
          } else {
            // Very old iPads have no IntersectionObserver — draw the first pages only
            pages.slice(0, 20).forEach(function(h) { h._wanted = true; drawPage(h); });
            if (pages.length > 20) {
              var more = document.createElement('div');
              more.style.cssText = 'color:white;text-align:center;padding:16px;font-family:Barlow Condensed,sans-serif;';
              more.textContent = 'Showing the first 20 of ' + pages.length + ' pages — tap Open to see the rest.';
              container.appendChild(more);
            }
          }
        });
      })
      .catch(fail);
  });

  return function cleanup() {
    state.closed = true;
    if (state.observer) state.observer.disconnect();
    if (state.pdf) state.pdf.destroy();
  };
}

function _escDocHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

// iOS often hands over an empty file.type for Office files (and occasionally PDFs)
function _guessDocMime(name) {
  if (/\.pdf$/i.test(name)) return 'application/pdf';
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  return 'application/octet-stream';
}

function _isPdfDoc(doc) {
  return doc.type === 'application/pdf' || /\.pdf$/i.test(doc.name || '');
}

function _blobToDataUrl(blob, cb) {
  var reader = new FileReader();
  reader.onload = function(e) { cb(null, e.target.result); };
  reader.onerror = function() { cb(new Error('Could not read file')); };
  reader.readAsDataURL(blob);
}

function _dataUrlToBlob(dataUrl) {
  var parts = dataUrl.split(',');
  var mime = parts[0].split(':')[1].split(';')[0];
  var bin = atob(parts[1]);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], {type: mime});
}

// Saves one document for the current job. cb(err) — on failure the entry
// keeps its file in memory so Retry can try again.
function _saveDocEntry(entry, categoryId, cb) {
  var ref = currentJobRef;
  var blob = entry._file || (entry.data && entry.data.indexOf('data:') === 0 ? _dataUrlToBlob(entry.data) : null);
  if (!blob) { cb(new Error('No file data')); return; }
  if (!blob.type) blob = new Blob([blob], {type: entry.type}); // so a base64 fallback copy is still labelled as e.g. a PDF
  // Timestamped so two uploads with the same file name don't overwrite each other
  var path = _docPath(ref, categoryId, Date.now() + '_' + entry.name);
  _uploadDocBlob(path, blob, entry.type)
    .then(function(r) { if (!r.ok) throw new Error('Storage ' + r.status); })
    .then(function() {
      _docDbSave(ref, categoryId, entry.name, entry.type, 'storage:' + path, function(err, id) {
        if (err) { _docStorageDelete(path); cb(err); return; }
        entry.dbId = id;
        entry.data = 'storage:' + path;
        cb(null);
      });
    }, function() {
      if (blob.size > MAX_DOC_DB_FALLBACK_BYTES) { cb(new Error('too large')); return; }
      _blobToDataUrl(blob, function(err, dataUrl) {
        if (err) { cb(err); return; }
        _docDbSave(ref, categoryId, entry.name, entry.type, dataUrl, function(err2, id) {
          if (err2) { cb(err2); return; }
          entry.dbId = id;
          entry.data = dataUrl;
          cb(null);
        });
      });
    });
}

// Keeps a copy of an unsaved document in localStorage so it survives a page
// reload — only for files small enough to fit.
function _backupDocLocal(ref, categoryId, entry) {
  if (!ref) return;
  if (entry.data && entry.data.indexOf('data:') === 0) return; // already restored from a local copy
  if (!entry._file || entry._file.size * 1.37 > MAX_DOC_LOCAL_BACKUP_CHARS) return;
  _blobToDataUrl(entry._file, function(err, dataUrl) {
    if (!err) _saveDocLocal(ref, categoryId, entry.name, dataUrl, entry.type);
  });
}

function _saveDocWithStatus(entry, categoryId) {
  var ref = currentJobRef;
  entry.status = 'uploading';
  renderDocList(categoryId);
  setStatus('Saving ' + entry.name + '…', '');
  _saveDocEntry(entry, categoryId, function(err) {
    if (!err) {
      entry.status = 'saved';
      entry._file = null;
      _removeDocLocal(ref, categoryId, entry.name);
      setStatus('Document saved ✓', 'ok');
    } else {
      entry.status = 'failed';
      _backupDocLocal(ref, categoryId, entry);
      setStatus(err.message === 'too large'
        ? entry.name + ' NOT saved — over 5 MB, and document storage isn\'t set up yet'
        : entry.name + ' NOT saved — check connection and tap Retry', 'err');
    }
    renderDocList(categoryId);
  });
}

function _addDocFiles(files, categoryId) {
  files = Array.from(files);
  if (!files.length) return;
  if (!docStore[categoryId]) docStore[categoryId] = [];
  var existing = docStore[categoryId].length;
  if (existing >= MAX_DOCS_PER_CAT) {
    alert('Maximum ' + MAX_DOCS_PER_CAT + ' documents per category. Please remove one first.'); return;
  }
  files = files.slice(0, MAX_DOCS_PER_CAT - existing);
  files.forEach(function(file) {
    if (file.size > MAX_DOC_BYTES) {
      alert(file.name + ' is too large (' + Math.round(file.size / 1048576) + ' MB). The limit is 50 MB.');
      return;
    }
    var entry = {name: file.name, type: file.type || _guessDocMime(file.name), data: '', status: 'local', _file: file};
    docStore[categoryId].push(entry);
    if (!currentJobRef) {
      renderDocList(categoryId);
      setStatus('Document ready — load a job to save it', 'warn');
      return;
    }
    _saveDocWithStatus(entry, categoryId);
  });
}

function handleDocUpload(input, categoryId) {
  _addDocFiles(Array.from(input.files), categoryId);
  input.value = '';
}

function _processDroppedFiles(files, categoryId) {
  _addDocFiles(Array.from(files).filter(function(f){
    return /\.(pdf|docx?|xlsx?|csv|png|jpe?g)$/i.test(f.name);
  }), categoryId);
}

function initDocDropZones() {
  var zones = document.querySelectorAll('.doc-section-drop');
  for (var i = 0; i < zones.length; i++) {
    (function(zone) {
      var cat = zone.getAttribute('data-cat');
      var counter = 0;
      zone.addEventListener('dragenter', function(e) {
        e.preventDefault();
        counter++;
        zone.classList.add('doc-drop-over');
      });
      zone.addEventListener('dragleave', function() {
        counter--;
        if (counter <= 0) { counter = 0; zone.classList.remove('doc-drop-over'); }
      });
      zone.addEventListener('dragover', function(e) {
        e.preventDefault();
      });
      zone.addEventListener('drop', function(e) {
        e.preventDefault();
        counter = 0;
        zone.classList.remove('doc-drop-over');
        _processDroppedFiles(e.dataTransfer.files, cat);
      });
    })(zones[i]);
  }
}

function renderDocList(categoryId) {
  var el = document.getElementById('doc_list_' + categoryId);
  if (!el) return;
  var docs = docStore[categoryId] || [];
  if (!docs.length) { el.innerHTML = '<div style="color:#999;font-size:12px;padding:8px 0;">No documents uploaded</div>'; return; }
  var btnStyle = 'border:none;padding:6px 12px;border-radius:3px;font-size:11px;font-weight:700;cursor:pointer;font-family:Barlow Condensed,sans-serif;text-transform:uppercase;letter-spacing:.5px;';
  el.innerHTML = docs.map(function(doc, idx) {
    var isImg  = doc.type && doc.type.indexOf('image/') === 0;
    var isPdf  = _isPdfDoc(doc);
    var isXls  = /\.(xlsx?|xls|csv)$/i.test(doc.name);
    var isWord = /\.(docx?|doc)$/i.test(doc.name);
    var icon = isImg ? '🖼' : isPdf ? '📄' : isXls ? '📊' : isWord ? '📝' : '📎';
    var hasLocalData = doc._file || (doc.data && doc.data.indexOf('data:') === 0);
    var statusBadge = '';
    if (doc.status === 'uploading') statusBadge = '<span style="color:#e67e22;font-size:10px;"> ⏳ Saving…</span>';
    else if (doc.status === 'saved' || doc.dbId) statusBadge = '<span style="color:#27ae60;font-size:10px;"> ✓ Saved</span>';
    else statusBadge = '<span style="color:#c0392b;font-size:10px;font-weight:700;"> ⚠ Not saved</span>';
    var canView = doc.dbId || hasLocalData || (doc.data && doc.data.indexOf('storage:') === 0);
    var canRetry = !doc.dbId && doc.status !== 'uploading' && hasLocalData;
    return '<div style="background:#f5f5f2;border:1px solid #ddd;border-radius:6px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;">'
      + '<div style="font-size:11px;font-weight:700;color:#333;word-break:break-all;line-height:1.4;">' + icon + ' ' + _escDocHtml(doc.name) + statusBadge + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
      + (canView ? '<button onclick="viewDoc(\'' + categoryId + '\',' + idx + ')" style="background:#2a4a1a;color:white;' + btnStyle + '">👁 View</button>' : '')
      + (canRetry ? '<button onclick="retryDocUpload(\'' + categoryId + '\',' + idx + ')" style="background:#e67e22;color:white;' + btnStyle + '">↺ Retry Save</button>' : '')
      + '<button onclick="removeDoc(\'' + categoryId + '\',' + idx + ')" style="background:#c0392b;color:white;' + btnStyle + '">✕ Remove</button>'
      + '</div></div>';
  }).join('');
}

function _closeDocViewer() {
  var m = document.getElementById('docViewerModal');
  if (!m) return;
  if (m._cleanup) m._cleanup();
  document.body.removeChild(m);
}

function viewDoc(categoryId, idx) {
  var doc = (docStore[categoryId] || [])[idx];
  if (!doc) return;

  // If data not yet loaded but we have a DB id, fetch it first then re-open
  if (!doc.data && !doc._file && doc.dbId) {
    setStatus('Loading document…', '');
    _docDbLoadData(doc.dbId, function(err, data) {
      if (!err && data) {
        doc.data = data;
        setStatus('', '');
        viewDoc(categoryId, idx); // re-call with data now loaded
      } else {
        setStatus('Could not load document — check connection', 'err');
      }
    });
    return;
  }
  if (!doc.data && !doc._file) return;

  var isImg  = doc.type && doc.type.indexOf('image/') === 0;
  var isPdf  = _isPdfDoc(doc);

  // Resolve the display URL — use pre-fetched blob if available
  var data = doc.data || '';
  var storagePath = data.indexOf('storage:') === 0 ? data.substring(8) : null;
  var displayUrl;
  if (doc._file) {
    displayUrl = URL.createObjectURL(doc._file);
  } else if (storagePath && _docBlobCache[storagePath]) {
    displayUrl = _docBlobCache[storagePath];
  } else if (storagePath) {
    displayUrl = null; // will fetch on-demand below
  } else if (data.indexOf('data:') === 0) {
    // Object URLs work in iframes / <a download> on every platform; data: URLs don't
    try { displayUrl = URL.createObjectURL(_dataUrlToBlob(data)); } catch(e) { displayUrl = data; }
  } else {
    displayUrl = data;
  }

  // Build modal
  _closeDocViewer();
  var modal = document.createElement('div');
  modal.id = 'docViewerModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#111;z-index:99999;display:flex;flex-direction:column;-webkit-overflow-scrolling:touch;';

  // Header — always visible, close always reachable
  var header = document.createElement('div');
  header.style.cssText = 'background:#1a2e10;color:white;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;min-height:52px;box-sizing:border-box;';
  header.innerHTML = '<span style="font-family:Barlow Condensed,sans-serif;font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55%;">' + _escDocHtml(doc.name) + '</span>';

  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';

  // Storage reads need an auth header, which a plain link can't send — so the
  // Open button has nothing to point at until the authenticated blob fetch resolves
  var directUrl = storagePath ? null : displayUrl;

  var openBtn = document.createElement('a');
  openBtn.href = directUrl || '#'; openBtn.target = '_blank'; openBtn.rel = 'noopener';
  if (!isImg && !isPdf) openBtn.setAttribute('download', doc.name);
  openBtn.style.cssText = 'background:#4a7a2a;color:white;padding:7px 14px;border-radius:3px;font-family:Barlow Condensed,sans-serif;font-size:12px;font-weight:700;text-decoration:none;text-transform:uppercase;white-space:nowrap;display:inline-flex;align-items:center;';
  if (!directUrl) openBtn.style.opacity = '0.5';
  openBtn.textContent = '↗ Open';

  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:#c0392b;color:white;border:none;padding:7px 14px;border-radius:3px;font-family:Barlow Condensed,sans-serif;font-size:12px;font-weight:700;cursor:pointer;text-transform:uppercase;white-space:nowrap;';
  closeBtn.textContent = '✕ Close';
  closeBtn.onclick = _closeDocViewer;
  btns.appendChild(openBtn); btns.appendChild(closeBtn);
  header.appendChild(btns);
  modal.appendChild(header);

  // Content area
  var content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;-webkit-overflow-scrolling:touch;';

  var loadingHtml = '<div style="color:white;text-align:center;padding:40px 20px;font-family:Barlow Condensed,sans-serif;">'
    + '<div style="font-size:36px;margin-bottom:16px;animation:spin 1s linear infinite;display:inline-block;">⏳</div>'
    + '<div style="font-size:15px;opacity:.8;margin-top:8px;">Loading document…</div>'
    + '</div>';

  function _renderContent(url) {
    // Update Open button href now that we have the final URL
    openBtn.href = url;
    openBtn.style.opacity = '';

    if (isImg) {
      // Older PDFs were stored as one tall composited image (the previous
      // upload compression) — constraining that to the modal's height like a
      // normal photo would squeeze it to an unreadably thin strip. Fill the
      // width instead and let the container scroll vertically.
      content.style.display = 'block';
      content.style.textAlign = 'center';
      var img = document.createElement('img');
      img.src = url;
      img.style.cssText = 'width:100%;height:auto;display:block;margin:0 auto;';
      content.innerHTML = '';
      content.appendChild(img);

    } else if (isPdf) {
      content.innerHTML = loadingHtml;
      modal._cleanup = _renderPdfPages(content, url, function() {
        // PDF.js couldn't load (offline before it was ever cached) — fall back
        // to the browser's own viewer; on iOS that may only show page 1, so
        // the Open button above stays available for the full document
        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
        content.style.display = 'block';
        content.style.padding = '0';
        content.innerHTML = '';
        content.appendChild(iframe);
      });

    } else {
      var fileIcon = /\.(docx?|doc)$/i.test(doc.name) ? '📝' : /\.(xlsx?|xls|csv)$/i.test(doc.name) ? '📊' : '📎';
      content.innerHTML = '<div style="color:white;text-align:center;padding:40px 20px;font-family:Barlow Condensed,sans-serif;">'
        + '<div style="font-size:52px;margin-bottom:18px;">' + fileIcon + '</div>'
        + '<div style="font-size:20px;font-weight:700;margin-bottom:10px;">' + _escDocHtml(doc.name) + '</div>'
        + '<div style="font-size:14px;opacity:.75;margin-bottom:28px;">This file type cannot be previewed in the browser.<br>Tap below to open or download it.</div>'
        + '<a href="' + url + '" target="_blank" rel="noopener" download="' + _escDocHtml(doc.name) + '" style="background:#4a7a2a;color:white;padding:14px 32px;border-radius:5px;font-weight:700;font-size:16px;text-decoration:none;text-transform:uppercase;display:inline-block;">↗ Open / Download</a>'
        + '</div>';
    }
  }

  modal.appendChild(content);
  document.body.appendChild(modal);

  if (displayUrl) {
    _renderContent(displayUrl);
  } else {
    // Not yet pre-fetched — show spinner and fetch now
    content.innerHTML = loadingHtml;
    fetch(_docAuthUrl(storagePath), {credentials:'omit', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken()}})
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function(blob) {
        var blobUrl = URL.createObjectURL(blob);
        _docBlobCache[storagePath] = blobUrl;
        if (document.getElementById('docViewerModal') === modal) _renderContent(blobUrl);
      })
      .catch(function() {
        if (document.getElementById('docViewerModal') !== modal) return;
        content.innerHTML = '<div style="color:white;text-align:center;padding:40px 20px;font-family:Barlow Condensed,sans-serif;">'
          + '<div style="font-size:52px;margin-bottom:18px;">&#9888;</div>'
          + '<div style="font-size:16px;opacity:.85;">Could not load document — check connection and try again.</div>'
          + '</div>';
      });
  }
}

function removeDoc(categoryId, idx) {
  if (!docStore[categoryId]) return;
  var doc = docStore[categoryId][idx];
  if (doc) {
    if (doc.data && doc.data.indexOf('storage:') === 0) _docStorageDelete(doc.data.substring(8));
    else if (doc.dbId && !doc.data) _docDbStoragePath(doc.dbId, function(path) { if (path) _docStorageDelete(path); });
    if (doc.dbId) _docDbDelete(doc.dbId);
    if (currentJobRef) _removeDocLocal(currentJobRef, categoryId, doc.name);
  }
  docStore[categoryId].splice(idx, 1);
  renderDocList(categoryId);
}

function retryDocUpload(categoryId, idx) {
  var doc = (docStore[categoryId] || [])[idx];
  if (!doc || doc.dbId) return;
  if (!doc._file && !(doc.data && doc.data.indexOf('data:') === 0)) return;
  if (!currentJobRef) { setStatus('Open a job first', 'err'); return; }
  _saveDocWithStatus(doc, categoryId);
}

function renderAllDocLists() {
  DOC_CATS.forEach(function(cat) { renderDocList(cat); });
}

function dashPrintAll() {
  window.print();
}
