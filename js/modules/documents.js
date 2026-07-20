// ── DOCUMENT STORE ──
var docStore = {};
var DOC_CATS = ['method_statement','plans','reports','tree_survey','tpo_approval','additional'];
var MAX_DOCS_PER_CAT = 10;
var _docBlobCache = {}; // key: storage path → blob URL (pre-fetched)

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

// ── PDF COMPRESSION via PDF.js ──
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

// Renders all PDF pages onto a single tall JPEG — much smaller than the original PDF
function _compressPdfToImage(arrayBuffer, originalName, callback) {
  // callback(result) where result = {dataUrl, type:'image/jpeg', name} or null on failure
  _loadPdfJs(function(err) {
    if (err) { callback(null); return; }
    pdfjsLib.getDocument({data: arrayBuffer}).promise
      .then(function(pdf) {
        var total = pdf.numPages;
        var scale = 1.5; // good readability on retina screens
        var rendered = [];
        var totalH = 0, maxW = 0;

        function renderPage(n) {
          if (n > total) {
            // Composite all pages into one canvas
            var out = document.createElement('canvas');
            out.width = maxW; out.height = totalH;
            var ctx = out.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, maxW, totalH);
            var y = 0;
            rendered.forEach(function(c) { ctx.drawImage(c, 0, y); y += c.height; });
            var dataUrl = out.toDataURL('image/jpeg', 0.82);
            callback({dataUrl: dataUrl, type: 'image/jpeg', name: originalName});
            return;
          }
          pdf.getPage(n).then(function(page) {
            var vp = page.getViewport({scale: scale});
            var c = document.createElement('canvas');
            c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
            if (c.width > maxW) maxW = c.width;
            totalH += c.height;
            var ctx2 = c.getContext('2d');
            ctx2.fillStyle = '#ffffff';
            ctx2.fillRect(0, 0, c.width, c.height);
            page.render({canvasContext: ctx2, viewport: vp}).promise
              .then(function() { rendered.push(c); renderPage(n + 1); })
              .catch(function() { rendered.push(c); renderPage(n + 1); });
          }).catch(function() { renderPage(n + 1); });
        }
        renderPage(1);
      })
      .catch(function() { callback(null); });
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
    var entry = {name: file.name, type: file.type, data: '', status: 'processing'};
    docStore[categoryId].push(entry);
    var idx = docStore[categoryId].length - 1;
    renderDocList(categoryId);
    setStatus('Processing ' + file.name + '…', '');

    function _doUpload(dataUrl, mimeType, uploadName) {
      entry.data = dataUrl;
      entry.type = mimeType;
      entry.name = uploadName;
      entry.status = 'uploading';

      // Save to localStorage as backup immediately
      if (currentJobRef) _saveDocLocal(currentJobRef, categoryId, uploadName, dataUrl, mimeType);

      renderDocList(categoryId);

      if (currentJobRef) {
        setStatus('Saving document…', '');
        _docDbSave(currentJobRef, categoryId, uploadName, mimeType, dataUrl, function(err, id) {
          if (!err && id) {
            entry.dbId = id;
            entry.status = 'saved';
            _removeDocLocal(currentJobRef, categoryId, uploadName);
            setStatus('Document saved ✓', 'ok');
          } else {
            entry.status = 'local';
            setStatus('Saved locally — will sync when connected', 'warn');
          }
          renderDocList(categoryId);
        });
      } else {
        entry.status = 'local';
        renderDocList(categoryId);
        setStatus('Document ready — load a job to save it', 'warn');
      }
    }

    var isPdfFile = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

    if (isPdfFile) {
      // Compress PDF → JPEG image for fast loading on all devices
      var abReader = new FileReader();
      abReader.onload = function(e) {
        _compressPdfToImage(e.target.result, file.name, function(result) {
          if (result) {
            var origKB = Math.round(file.size / 1024);
            var newKB  = Math.round(result.dataUrl.length * 0.75 / 1024);
            setStatus('PDF compressed: ' + origKB + 'KB → ' + newKB + 'KB ✓', 'ok');
            _doUpload(result.dataUrl, result.type, result.name);
          } else {
            // Fallback: store original PDF as-is
            var fbReader = new FileReader();
            fbReader.onload = function(ev) { _doUpload(ev.target.result, file.type, file.name); };
            fbReader.onerror = function() {
              docStore[categoryId].splice(idx, 1);
              renderDocList(categoryId);
              setStatus('Could not read file', 'err');
            };
            fbReader.readAsDataURL(file);
          }
        });
      };
      abReader.onerror = function() {
        docStore[categoryId].splice(idx, 1);
        renderDocList(categoryId);
        setStatus('Could not read file', 'err');
      };
      abReader.readAsArrayBuffer(file);

    } else {
      // Non-PDF: read as data URL directly
      var reader = new FileReader();
      reader.onload = function(e) { _doUpload(e.target.result, file.type, file.name); };
      reader.onerror = function() {
        docStore[categoryId].splice(idx, 1);
        renderDocList(categoryId);
        setStatus('Could not read file', 'err');
      };
      reader.readAsDataURL(file);
    }
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
    var isPdf  = doc.type === 'application/pdf';
    var isXls  = /\.(xlsx?|xls|csv)$/i.test(doc.name);
    var isWord = /\.(docx?|doc)$/i.test(doc.name);
    var icon = isImg ? '🖼' : isPdf ? '📄' : isXls ? '📊' : isWord ? '📝' : '📎';
    var statusBadge = '';
    if (doc.status === 'processing') statusBadge = '<span style="color:#8e44ad;font-size:10px;"> ⚙ Compressing…</span>';
    else if (doc.status === 'uploading') statusBadge = '<span style="color:#e67e22;font-size:10px;"> ⏳ Uploading...</span>';
    else if (doc.status === 'saved') statusBadge = '<span style="color:#27ae60;font-size:10px;"> ✓ Saved</span>';
    else if (doc.status === 'local') statusBadge = doc.data && doc.data.indexOf('data:') === 0 ? '<span style="color:#27ae60;font-size:10px;"> ✓ Saved</span>' : '<span style="color:#e67e22;font-size:10px;"> ⚠ Pending</span>';
    var canView = doc.dbId || (doc.data && (doc.data.indexOf('storage:') === 0 || doc.data.indexOf('data:') === 0));
    var canRetry = doc.status === 'local' && doc.data && doc.data.indexOf('data:') === 0;
    return '<div style="background:#f5f5f2;border:1px solid #ddd;border-radius:6px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;">'
      + '<div style="font-size:11px;font-weight:700;color:#333;word-break:break-all;line-height:1.4;">' + icon + ' ' + doc.name + statusBadge + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
      + (canView ? '<button onclick="viewDoc(\'' + categoryId + '\',' + idx + ')" style="background:#2a4a1a;color:white;' + btnStyle + '">👁 View</button>' : '')
      + (canRetry ? '<button onclick="retryDocUpload(\'' + categoryId + '\',' + idx + ')" style="background:#e67e22;color:white;' + btnStyle + '">↺ Retry Upload</button>' : '')
      + '<button onclick="removeDoc(\'' + categoryId + '\',' + idx + ')" style="background:#c0392b;color:white;' + btnStyle + '">✕ Remove</button>'
      + '</div></div>';
  }).join('');
}

function viewDoc(categoryId, idx) {
  var doc = (docStore[categoryId] || [])[idx];
  if (!doc) return;

  // If data not yet loaded but we have a DB id, fetch it first then re-open
  if (!doc.data && doc.dbId) {
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
  if (!doc.data) return;

  var isImg  = doc.type && doc.type.indexOf('image/') === 0;
  var isPdf  = doc.type === 'application/pdf';
  var isIOS  = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  var isAndroid = /Android/.test(navigator.userAgent);

  // Convert a data: URL to an object URL so iframes / <a download> work on all platforms
  function dataUrlToObjectUrl(dataUrl) {
    try {
      var parts = dataUrl.split(',');
      var mime  = parts[0].split(':')[1].split(';')[0];
      var byteStr = atob(parts[1]);
      var ab = new ArrayBuffer(byteStr.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
      return URL.createObjectURL(new Blob([ab], {type: mime}));
    } catch(e) { return dataUrl; }
  }

  // Resolve the display URL — use pre-fetched blob if available
  var storagePath = doc.data.indexOf('storage:') === 0 ? doc.data.substring(8) : null;
  var displayUrl;
  if (storagePath && _docBlobCache[storagePath]) {
    displayUrl = _docBlobCache[storagePath];
  } else if (storagePath) {
    displayUrl = null; // will fetch on-demand below
  } else if (doc.data.indexOf('data:') === 0) {
    displayUrl = dataUrlToObjectUrl(doc.data);
  } else {
    displayUrl = doc.data;
  }

  // Build modal
  var existing = document.getElementById('docViewerModal');
  if (existing) document.body.removeChild(existing);
  var modal = document.createElement('div');
  modal.id = 'docViewerModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#111;z-index:99999;display:flex;flex-direction:column;-webkit-overflow-scrolling:touch;';

  // Header — always visible, close always reachable
  var header = document.createElement('div');
  header.style.cssText = 'background:#1a2e10;color:white;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;min-height:52px;box-sizing:border-box;';
  header.innerHTML = '<span style="font-family:Barlow Condensed,sans-serif;font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55%;">' + doc.name + '</span>';

  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';

  // Storage reads need an auth header, which a plain link can't send — so the
  // Open button has nothing to point at until the authenticated blob fetch resolves
  var directUrl = storagePath ? null : displayUrl;

  var openBtn = document.createElement('a');
  openBtn.href = directUrl || '#'; openBtn.target = '_blank'; openBtn.rel = 'noopener';
  if (!directUrl) openBtn.style.opacity = '0.5';
  if (!isImg && !isPdf) openBtn.setAttribute('download', doc.name);
  openBtn.style.cssText = 'background:#4a7a2a;color:white;padding:7px 14px;border-radius:3px;font-family:Barlow Condensed,sans-serif;font-size:12px;font-weight:700;text-decoration:none;text-transform:uppercase;white-space:nowrap;display:inline-flex;align-items:center;';
  openBtn.textContent = '↗ Open';

  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:#c0392b;color:white;border:none;padding:7px 14px;border-radius:3px;font-family:Barlow Condensed,sans-serif;font-size:12px;font-weight:700;cursor:pointer;text-transform:uppercase;white-space:nowrap;';
  closeBtn.textContent = '✕ Close';
  closeBtn.onclick = function() {
    var m = document.getElementById('docViewerModal');
    if (m) document.body.removeChild(m);
  };
  btns.appendChild(openBtn); btns.appendChild(closeBtn);
  header.appendChild(btns);
  modal.appendChild(header);

  // Content area
  var content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;-webkit-overflow-scrolling:touch;';

  function _renderContent(url) {
    // Update Open button href now that we have the final URL
    openBtn.href = url;
    openBtn.style.opacity = '';
    var isBlobUrl = url && url.indexOf('blob:') === 0;

    if (isImg) {
      // Multi-page PDFs get compressed into one tall composited image (see
      // _compressPdfToImage) — constraining that to the modal's height like a
      // normal photo would squeeze it down to an unreadably thin strip. Fill
      // the width instead and let the container scroll vertically, same as
      // scrolling down a long document.
      content.style.display = 'block';
      content.style.textAlign = 'center';
      var img = document.createElement('img');
      img.src = url;
      img.style.cssText = 'width:100%;height:auto;display:block;margin:0 auto;';
      content.innerHTML = '';
      content.appendChild(img);

    } else if (isPdf) {
      // Use inline iframe for blob URLs (already local — fast on all platforms including iOS)
      // Use "Open" button for remote Supabase URLs on mobile (avoids slow remote iframe)
      if (isBlobUrl || (!isIOS && !isAndroid)) {
        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
        content.style.display = 'block';
        content.innerHTML = '';
        content.appendChild(iframe);
      } else {
        // Mobile + remote URL: prompt to open in native viewer
        content.innerHTML = '<div style="color:white;text-align:center;padding:40px 20px;font-family:Barlow Condensed,sans-serif;">'
          + '<div style="font-size:52px;margin-bottom:18px;">📄</div>'
          + '<div style="font-size:20px;font-weight:700;margin-bottom:10px;">' + doc.name + '</div>'
          + '<div style="font-size:14px;opacity:.75;margin-bottom:28px;">Loading… tap Open if it doesn\'t appear</div>'
          + '<a href="' + url + '" target="_blank" rel="noopener" style="background:#4a7a2a;color:white;padding:14px 32px;border-radius:5px;font-weight:700;font-size:16px;text-decoration:none;text-transform:uppercase;display:inline-block;">↗ Open PDF</a>'
          + '</div>';
      }

    } else {
      var fileIcon = /\.(docx?|doc)$/i.test(doc.name) ? '📝' : /\.(xlsx?|xls|csv)$/i.test(doc.name) ? '📊' : '📎';
      content.innerHTML = '<div style="color:white;text-align:center;padding:40px 20px;font-family:Barlow Condensed,sans-serif;">'
        + '<div style="font-size:52px;margin-bottom:18px;">' + fileIcon + '</div>'
        + '<div style="font-size:20px;font-weight:700;margin-bottom:10px;">' + doc.name + '</div>'
        + '<div style="font-size:14px;opacity:.75;margin-bottom:28px;">This file type cannot be previewed in the browser.<br>Tap below to open or download it.</div>'
        + '<a href="' + url + '" target="_blank" rel="noopener" download="' + doc.name + '" style="background:#4a7a2a;color:white;padding:14px 32px;border-radius:5px;font-weight:700;font-size:16px;text-decoration:none;text-transform:uppercase;display:inline-block;">↗ Open / Download</a>'
        + '</div>';
    }
  }

  if (displayUrl) {
    _renderContent(displayUrl);
  } else {
    // Not yet pre-fetched — show spinner and fetch now
    content.innerHTML = '<div style="color:white;text-align:center;padding:40px 20px;font-family:Barlow Condensed,sans-serif;">'
      + '<div style="font-size:36px;margin-bottom:16px;animation:spin 1s linear infinite;display:inline-block;">⏳</div>'
      + '<div style="font-size:15px;opacity:.8;margin-top:8px;">Loading document…</div>'
      + '</div>';
    fetch(_docAuthUrl(storagePath), {credentials:'omit', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken()}})
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function(blob) {
        var blobUrl = URL.createObjectURL(blob);
        _docBlobCache[storagePath] = blobUrl;
        if (document.getElementById('docViewerModal')) _renderContent(blobUrl);
      })
      .catch(function() {
        if (!document.getElementById('docViewerModal')) return;
        content.innerHTML = '<div style="color:white;text-align:center;padding:40px 20px;font-family:Barlow Condensed,sans-serif;">'
          + '<div style="font-size:52px;margin-bottom:18px;">&#9888;</div>'
          + '<div style="font-size:16px;opacity:.85;">Could not load document — check connection and try again.</div>'
          + '</div>';
      });
  }

  modal.appendChild(content);
  document.body.appendChild(modal);
}

function removeDoc(categoryId, idx) {
  if (!docStore[categoryId]) return;
  var doc = docStore[categoryId][idx];
  if (doc) {
    if (doc.dbId) _docDbDelete(doc.dbId);
    if (currentJobRef) _removeDocLocal(currentJobRef, categoryId, doc.name);
  }
  docStore[categoryId].splice(idx, 1);
  renderDocList(categoryId);
}

function retryDocUpload(categoryId, idx) {
  var doc = (docStore[categoryId] || [])[idx];
  if (!doc || !doc.data || doc.data.indexOf('data:') !== 0) return;
  if (!currentJobRef) { setStatus('Open a job first', 'err'); return; }
  doc.status = 'uploading';
  renderDocList(categoryId);
  setStatus('Retrying save…', '');
  _docDbSave(currentJobRef, categoryId, doc.name, doc.type, doc.data, function(err, id) {
    if (!err && id) {
      doc.dbId = id;
      doc.status = 'saved';
      _removeDocLocal(currentJobRef, categoryId, doc.name);
      setStatus('Document saved ✓', 'ok');
    } else {
      doc.status = 'local';
      setStatus('Retry failed — check connection', 'err');
    }
    renderDocList(categoryId);
  });
}

function renderAllDocLists() {
  DOC_CATS.forEach(function(cat) { renderDocList(cat); });
}

function dashPrintAll() {
  window.print();
}

