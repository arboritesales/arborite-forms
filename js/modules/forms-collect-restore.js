// ── COLLECT / RESTORE ──
function collectFormData() {
  // Temporarily make all panels visible (off-screen) so canvases can be measured
  var hiddenPanels = [];
  var panels = document.querySelectorAll('.panel');
  for (var pi = 0; pi < panels.length; pi++) {
    if (panels[pi].style.display === 'none' || panels[pi].style.display === '') {
      panels[pi].style.visibility = 'hidden';
      panels[pi].style.position = 'absolute';
      panels[pi].style.display = 'block';
      hiddenPanels.push(panels[pi]);
    }
  }
  // Re-init any unsized canvases
  var allCanvases = document.querySelectorAll('.sig-wrap canvas');
  for (var ci = 0; ci < allCanvases.length; ci++) {
    if (allCanvases[ci].id) initSig(allCanvases[ci].id);
  }
  var data = {signatures:{}};
  // Audit is a standalone form (see collectAuditData/restoreAuditData) — excluded here
  // so job saves never pick up whatever is currently in the Audit form.
  var inputs = document.querySelectorAll('input[type="text"]:not(#auditFormPanel *), input[type="date"]:not(#auditFormPanel *), textarea:not(#auditFormPanel *), select:not(#auditFormPanel *)');
  for (var i = 0; i < inputs.length; i++) {
    var el = inputs[i];
    if (el.id && el.id !== 'newJobRef' && el.id !== 'loadSearch') data[el.id] = el.value;
  }
  var radios = document.querySelectorAll('input[type="radio"]:checked:not(#auditFormPanel *)');
  for (var i = 0; i < radios.length; i++) data[radios[i].name] = radios[i].value;
  var checks = document.querySelectorAll('input[type="checkbox"][id]:not(#auditFormPanel *)');
  for (var i = 0; i < checks.length; i++) data[checks[i].id] = checks[i].checked;
  for (var id in pads) {
    if (!pads[id]) continue;
    if (id === 's-auditor') continue;
    var padCanvas = pads[id].canvas || document.getElementById(id);
    if (!padCanvas) continue;
    pads[id].canvas = padCanvas;
    var _dUrl = pads[id].dataUrl;
    if (_dUrl && (_dUrl.length > 100 || _dUrl.indexOf('storage:') === 0)) {
      data.signatures[id] = _dUrl;
    } else if (pads[id].sized) {
      try {
        var url = padCanvas.toDataURL('image/png');
        if (url && url.length > 100 && url !== 'data:,') {
          data.signatures[id] = url;
        }
      } catch(e){}
    }
  }
  // Also collect dynamic canvases not yet in pads (newly built rows)
  var dynCanvases = document.querySelectorAll('.sig-wrap canvas[id]:not(#auditFormPanel *)');
  for (var di = 0; di < dynCanvases.length; di++) {
    var cid = dynCanvases[di].id;
    if (!data.signatures[cid]) {
      var dynPad = pads[cid];
      if (dynPad && dynPad.dataUrl && dynPad.dataUrl.length > 100) {
        data.signatures[cid] = dynPad.dataUrl;
      } else {
        try {
          var durl = dynCanvases[di].toDataURL('image/png');
          if (durl !== 'data:,' && durl.length > 100) data.signatures[cid] = durl;
        } catch(e){}
      }
    }
  }
  // Restore hidden panels
  for (var hi = 0; hi < hiddenPanels.length; hi++) {
    hiddenPanels[hi].style.display = 'none';
    hiddenPanels[hi].style.visibility = '';
    hiddenPanels[hi].style.position = '';
  }
  data._custom_staff    = CUSTOM_STAFF;
  data._custom_machines = CUSTOM_MACHINES;
  // Save documents — only keep storage refs, strip base64 to keep payload small
  data._documents = {};
  if (typeof docStore !== 'undefined') {
    var DOC_CATS_SAVE = ['method_statement','plans','reports','tree_survey','tpo_approval','additional'];
    for (var dc = 0; dc < DOC_CATS_SAVE.length; dc++) {
      var cat = DOC_CATS_SAVE[dc];
      if (docStore[cat] && docStore[cat].length) {
        var catDocs = docStore[cat].map(function(d) {
          // Store only metadata — actual data lives in job_documents table
          return {name: d.name, type: d.type, status: d.status || '', dbId: d.dbId || ''};
        }).filter(function(d){ return d.dbId || d.status === 'local'; });
        if (catDocs.length) data._documents[cat] = catDocs;
      }
    }
  }
  return data;
}

function restoreFormData(data) {
  if (!data) return;
  if (data._custom_staff)    CUSTOM_STAFF    = data._custom_staff;
  if (data._custom_machines) CUSTOM_MACHINES = data._custom_machines;
  // Rebuild every name/machine dropdown's options to include this job's own
  // custom names BEFORE the restore loop below sets .value — otherwise a
  // saved custom name has no matching <option> yet and the assignment is
  // silently dropped, so the field reads as blank even though it saved fine.
  refreshStaffSelects();
  refreshMachineSelects();
  var SKIP = {signatures:1,id:1,created_at:1,updated_at:1,_custom_staff:1,_custom_machines:1,p_w3w:1};
  for (var key in data) {
    if (SKIP[key]) continue;
    var el = document.getElementById(key);
    if (!el) continue;
    if (el.closest && el.closest('#auditFormPanel')) continue; // Audit restores via restoreAuditData, not here
    if (el.tagName === 'SELECT' || el.type === 'text' || el.type === 'date' || el.tagName === 'TEXTAREA') {
      el.value = data[key];
    } else if (el.type === 'checkbox') {
      el.checked = !!data[key];
    }
  }
  var keys = Object.keys(data);
  for (var k = 0; k < keys.length; k++) {
    var rads = document.querySelectorAll('input[type="radio"][name="' + keys[k] + '"]:not(#auditFormPanel *)');
    if (rads.length) {
      for (var i = 0; i < rads.length; i++) rads[i].checked = (rads[i].value === data[keys[k]]);
    }
  }
  if (data.comms_other) {
    var ct = document.getElementById('comms_other_text');
    if (ct) ct.style.display = 'inline-block';
  }
  if (data.signatures) {
    // Make all panels temporarily visible so canvases can be sized
    var hiddenPanels2 = [];
    var allPanels = document.querySelectorAll('.panel');
    for (var rpi = 0; rpi < allPanels.length; rpi++) {
      if (allPanels[rpi].style.display === 'none' || allPanels[rpi].style.display === '') {
        allPanels[rpi].style.visibility = 'hidden';
        allPanels[rpi].style.position = 'absolute';
        allPanels[rpi].style.display = 'block';
        hiddenPanels2.push(allPanels[rpi]);
      }
    }
    for (var id in data.signatures) { if (id !== 's-auditor') restoreSig(id, data.signatures[id]); }
    // Restore panels after a short delay (restoreSig uses setTimeout internally)
    setTimeout(function() {
      for (var hi = 0; hi < hiddenPanels2.length; hi++) {
        hiddenPanels2[hi].style.display = 'none';
        hiddenPanels2[hi].style.visibility = '';
        hiddenPanels2[hi].style.position = '';
      }
    }, 300);
  }
  // Cross-fill so_w3w/ms_w3w if only one was saved (e.g. a job saved before
  // the What3Words field existed on both tabs, or before either tab had been
  // opened to trigger the live oninput sync) — otherwise the missing side
  // stays blank on restore even though the other tab has the location.
  var w3wVal = data.so_w3w || data.ms_w3w;
  if (w3wVal) {
    var soW3wEl = document.getElementById('so_w3w');
    var msW3wEl = document.getElementById('ms_w3w');
    if (soW3wEl && !soW3wEl.value) soW3wEl.value = w3wVal;
    if (msW3wEl && !msW3wEl.value) msW3wEl.value = w3wVal;
    updateW3WLink('so_w3w_link', w3wVal);
    updateW3WLink('ms_w3w_link', w3wVal);
  }
  // Restore documents
  if (data._documents && typeof docStore !== 'undefined') {
    docStore = {};
    for (var cat in data._documents) docStore[cat] = data._documents[cat];
    setTimeout(renderAllDocLists, 50);
  }
}

var sigCache = {}; // persistent store: sigCache[id] = dataUrl

function restoreSig(id, dataUrl) {
  if (!dataUrl || dataUrl === 'data:,') return;

  // Storage reference — fetch the image then treat like a normal base64 sig
  if (dataUrl.indexOf('storage:') === 0) {
    var path = dataUrl.substring(8);
    var url = _storagePublicUrl(path);
    // Keep the storage ref in pads so collectFormData can preserve it
    // if the user saves without redrawing
    if (!pads[id]) pads[id] = {canvas:null, ctx:null, sized:false, dataUrl:dataUrl};
    else pads[id].dataUrl = dataUrl;
    fetch(url, {credentials:'omit', mode:'cors'})
      .then(function(r) { return r.blob(); })
      .then(function(blob) {
        var reader = new FileReader();
        reader.onload = function(e) {
          var b64 = e.target.result;
          sigCache[id] = b64;
          if (pads[id]) pads[id].dataUrl = dataUrl; // keep storage ref, not base64
          drawSigFromCache_b64(id, b64);
        };
        reader.readAsDataURL(blob);
      })
      .catch(function() {});
    return;
  }

  // Plain base64 data URL (legacy jobs saved before Storage migration)
  sigCache[id] = dataUrl;
  if (!pads[id]) pads[id] = {canvas:null, ctx:null, sized:false, dataUrl:dataUrl};
  else pads[id].dataUrl = dataUrl;
  drawSigFromCache(id);
}

// Draw a specific base64 url onto a canvas without touching pads[id].dataUrl
function drawSigFromCache_b64(id, b64url) {
  var canvas = document.getElementById(id);
  if (!canvas) return;
  initSig(id);
  sigCache[id] = b64url; // keep in cache for tab-switching
  _paintSigOnCanvas(id, b64url);
}

// Draw onto a canvas that has ALREADY been initialised by initSig — no double-init
function _paintSigOnCanvas(id, dataUrl) {
  var p = pads[id];
  if (!p || !p.ctx || !p.canvas) return;
  var img = new Image();
  img.onload = function() {
    if (p.ctx && p.canvas) {
      p.ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
      p.ctx.drawImage(img, 0, 0,
        p.canvas.width / (window.devicePixelRatio || 1),
        p.canvas.height / (window.devicePixelRatio || 1));
    }
  };
  img.src = dataUrl;
}

function drawSigFromCache(id) {
  var dataUrl = sigCache[id];
  if (!dataUrl) return;
  var canvas = document.getElementById(id);
  if (!canvas) return; // panel not open yet - will draw when panel opens
  initSig(id);
  var p = pads[id];
  if (!p) return;
  p.dataUrl = dataUrl;
  _paintSigOnCanvas(id, dataUrl);
}

// ── AUDIT OVERALL ──
function toggleCommentSec(id) {
  var el = document.getElementById('csec_' + id);
  var caret = document.getElementById('caret_' + id);
  if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (caret) caret.innerHTML = open ? '&#9660;' : '&#9650;';
}

function setOverall(val) {
  document.getElementById('aud_overall').value = val;
  var keys = ['excellent','satisfactory','unsatisfactory'];
  for (var i = 0; i < keys.length; i++) {
    var b = document.getElementById('ovr_' + keys[i]);
    if (b) b.className = 'ovr-btn' + (keys[i] === val ? ' sel-' + val : '');
  }
}

// ── PRINT / CLEAR ──
// Adds className, prints, then removes it once the print dialog actually
// closes (window.onafterprint) rather than a blind timer — a fixed delay can
// fire before/during print rendering on a slow device, reverting the DOM
// mid-print so the exported PDF doesn't match what was on screen.
function _printWithClass(onCleanup) {
  var done = false;
  function cleanup() {
    if (done) return;
    done = true;
    onCleanup();
    window.onafterprint = null;
  }
  window.onafterprint = cleanup;
  window.print();
  setTimeout(cleanup, 5000); // fallback in case onafterprint doesn't fire
}

function printPanel(id) {
  // Add printing-active class only to the target panel so only it prints
  var allPanels = document.querySelectorAll('.panel');
  for (var i = 0; i < allPanels.length; i++) {
    allPanels[i].classList.remove('printing-active');
  }
  var target = document.getElementById(id);
  if (target) target.classList.add('printing-active');
  _printWithClass(function() {
    var allP = document.querySelectorAll('.panel');
    for (var j = 0; j < allP.length; j++) {
      allP[j].classList.remove('printing-active');
    }
  });
}

function clearForm(id) {
  if (!confirm('Clear all fields on this form?')) return;
  var panel = document.getElementById(id);
  var inputs = panel.querySelectorAll('input[type="text"]:not([readonly]), input[type="date"], textarea');
  for (var i = 0; i < inputs.length; i++) inputs[i].value = '';
  var checks = panel.querySelectorAll('input[type="radio"], input[type="checkbox"]');
  for (var i = 0; i < checks.length; i++) checks[i].checked = false;
  var sels = panel.querySelectorAll('select');
  for (var i = 0; i < sels.length; i++) sels[i].selectedIndex = 0;
  var canvases = panel.querySelectorAll('canvas');
  for (var i = 0; i < canvases.length; i++) {
    var p = pads[canvases[i].id];
    if (p && p.ctx && p.sized) p.ctx.clearRect(0, 0, canvases[i].width, canvases[i].height);
  }
  if (id === 'audit') {
    var btns = ['excellent','satisfactory','unsatisfactory'];
    for (var i = 0; i < btns.length; i++) {
      var b = document.getElementById('ovr_' + btns[i]);
      if (b) b.className = 'ovr-btn';
    }
  }
}

function loadRouteMap() {
  var addr = document.getElementById('ms_route_address').value.trim();
  if (!addr) { alert('Please enter an address or postcode.'); return; }
  var container = document.getElementById('ms_map_container');
  var frame = document.getElementById('ms_map_frame');
  var encodedAddr = encodeURIComponent(addr);
  frame.src = 'https://maps.google.com/maps?q=' + encodedAddr + '&output=embed&z=14';
  container.style.display = 'block';
}

function addAmendmentRow() {
  var tbody = document.getElementById('ms_amendments_body');
  if (!tbody) return;
  var rows = tbody.querySelectorAll('tr');
  var nextVer = rows.length + 1;
  var tr = document.createElement('tr');
  tr.innerHTML = '<td style="padding:4px 8px;border-bottom:1px solid #e5e5dc;"><input type="text" value="' + nextVer + '" style="width:50px;font-size:12px;border:none;background:transparent;outline:none;padding:2px 0;"></td>'
    + '<td style="padding:4px 8px;border-bottom:1px solid #e5e5dc;"><input type="date" style="font-size:12px;border:none;background:transparent;outline:none;padding:2px 0;"></td>'
    + '<td style="padding:4px 8px;border-bottom:1px solid #e5e5dc;"><input type="text" placeholder="Description of change..." style="width:100%;font-size:12px;border:none;background:transparent;outline:none;padding:2px 0;"></td>'
    + '<td style="padding:4px 8px;border-bottom:1px solid #e5e5dc;text-align:center;"><button onclick="this.closest(\'tr\').remove()" style="background:none;border:none;color:#c55;cursor:pointer;font-size:14px;" title="Remove">&#x2715;</button></td>';
  tbody.appendChild(tr);
}

// Attachment handling - stores file references in memory for the session
var msAttachments = [];
function handleAttachments(input) {
  var files = input.files;
  for (var i = 0; i < files.length; i++) {
    msAttachments.push(files[i].name);
  }
  var listEl = document.getElementById('ms_attach_list');
  if (listEl) {
    if (msAttachments.length === 0) {
      listEl.textContent = '';
    } else {
      listEl.innerHTML = msAttachments.map(function(n) {
        return '<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">&#128206; ' + n + '</div>';
      }).join('');
    }
  }
  input.value = '';
}

function saveToGoogleDrive(panelId) {
  alert('Print the form first using the Print/PDF button, save as PDF, then upload to Google Drive.');
  printPanel(panelId);
}

