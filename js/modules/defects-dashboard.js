// ── DEFECTS DASHBOARD (Manager Access) ──
// Scans recent completed checks across every category and surfaces any with
// flagged (non-top-score) items, so a manager can triage without opening each
// record individually. Reuses the same scoring logic as the Survey Report.
function fetchDefects() {
  var listEl = document.getElementById('defectsList');
  if (!listEl) return;
  listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">Scanning recent checks...</div>';

  var jobs = [
    fetch(SUPA_URL + '/rest/v1/vehicle_checks?order=created_at.desc&limit=50', {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
    }).then(function(r){ return r.json(); }).then(function(rows){
      return (Array.isArray(rows) ? rows : []).map(function(d){ return _defectEntry('vehicle', null, d); });
    }).catch(function(){ return []; })
  ];
  Object.keys(CHECK_CATEGORIES).forEach(function(cat) {
    var cfg = CHECK_CATEGORIES[cat];
    jobs.push(
      fetch(SUPA_URL + '/rest/v1/' + cfg.table + '?order=created_at.desc&limit=30', {
        headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
      }).then(function(r){ return r.json(); }).then(function(rows){
        return (Array.isArray(rows) ? rows : []).map(function(d){ return _defectEntry('cat', cat, d); });
      }).catch(function(){ return []; })
    );
  });

  Promise.all(jobs).then(function(results) {
    var all = [].concat.apply([], results);
    var defects = all.filter(function(e){ return e.hasDefect; });
    defects.sort(function(a,b){ return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    renderDefectsList(defects);
  });
}

function _defectEntry(kind, cat, d) {
  var fieldRows, name, categoryLabel, meta = _surveyMeta(kind, cat);
  if (kind === 'vehicle') {
    fieldRows = vehFieldList(d);
    name = d.vehicle || 'Unknown vehicle';
    categoryLabel = 'Vehicle';
  } else {
    fieldRows = catFieldRows(cat, d);
    name = d.machine || 'Unknown machine';
    categoryLabel = meta.cfg ? meta.cfg.label : cat;
  }
  var scored = _scoreFieldRows(fieldRows, meta.skipLabels);
  return {
    kind: kind, cat: cat, id: d.id, name: name, categoryLabel: categoryLabel,
    inspector: d.inspector_name || '', createdAt: d.created_at || '',
    dateStr: d.created_at ? new Date(d.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '',
    flaggedCount: scored.flagged.length,
    hasDefect: !!d.has_defect,
    defectComment: d.defect_comment || '',
    defectImages: Array.isArray(d.defect_images) ? d.defect_images : [],
    defectStatus: d.defect_status || '',
    officeNote: d.office_note || ''
  };
}
function _defectPhotoAuthUrl(path) {
  return SUPA_URL + '/storage/v1/object/authenticated/' + DEFECT_BUCKET + '/' + path;
}
function _loadDefectThumbs(container) {
  container.querySelectorAll('img[data-defect-path]').forEach(function(img) {
    var path = img.getAttribute('data-defect-path');
    fetch(_defectPhotoAuthUrl(path), {headers: {apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken()}})
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function(blob) { img.src = URL.createObjectURL(blob); })
      .catch(function() {});
  });
}
function _defectTableFor(kind, cat) {
  return kind === 'vehicle' ? 'vehicle_checks' : CHECK_CATEGORIES[cat].table;
}
function setDefectStatus(kind, cat, id, status, btn) {
  var wrap = btn.parentElement;
  wrap.querySelectorAll('button').forEach(function(b){ b.style.background = 'rgba(255,255,255,.08)'; b.style.color = 'rgba(255,255,255,.6)'; });
  if (status === 'fixed') { btn.style.background = '#7ec820'; btn.style.color = '#1a3210'; }
  else { btn.style.background = '#c62828'; btn.style.color = 'white'; }
  fetch(SUPA_URL + '/rest/v1/' + _defectTableFor(kind, cat) + '?id=eq.' + id, {
    method: 'PATCH',
    headers: {'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken(),'Prefer':'return=minimal'},
    body: JSON.stringify({defect_status: status})
  }).catch(function(){});
}
var _defectNoteTimers = {};
function scheduleDefectNoteSave(kind, cat, id, textarea) {
  var key = kind + '_' + cat + '_' + id;
  clearTimeout(_defectNoteTimers[key]);
  var val = textarea.value;
  _defectNoteTimers[key] = setTimeout(function() {
    fetch(SUPA_URL + '/rest/v1/' + _defectTableFor(kind, cat) + '?id=eq.' + id, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken(),'Prefer':'return=minimal'},
      body: JSON.stringify({office_note: val})
    }).catch(function(){});
  }, 800);
}

function renderDefectsList(defects) {
  var listEl = document.getElementById('defectsList');
  if (!listEl) return;
  if (!defects.length) {
    listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">&#10003; No defects logged.</div>';
    return;
  }
  listEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px;">' + defects.map(function(e) {
    var isFixed = e.defectStatus === 'fixed';
    var thumbs = (e.defectImages || []).map(function(p) {
      return '<img data-defect-path="' + p.replace(/"/g,'&quot;') + '" style="width:42px;height:42px;border-radius:5px;object-fit:cover;background:rgba(255,255,255,.08);">';
    }).join('');
    return '<div style="background:#305818;border:1px solid rgba(198,40,40,.5);border-radius:8px;padding:16px 18px;-webkit-tap-highlight-color:transparent;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;gap:10px;" onclick="openDefectRecord(\'' + e.kind + '\',\'' + (e.cat || '') + '\',\'' + e.id + '\')">'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:800;color:white;letter-spacing:.5px;">' + e.name + '</div>'
      + '<div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;">' + e.categoryLabel + (e.inspector ? ' &middot; ' + e.inspector : '') + ' &middot; ' + e.dateStr + '</div>'
      + (e.defectComment ? '<div style="font-size:12.5px;color:rgba(255,255,255,.85);margin-top:8px;line-height:1.5;">' + e.defectComment + '</div>' : '')
      + (thumbs ? '<div style="display:flex;gap:6px;margin-top:8px;">' + thumbs + '</div>' : '')
      + '</div>'
      + '<div style="font-size:22px;color:rgba(255,255,255,.4);flex-shrink:0;">&#8250;</div>'
      + '</div>'
      + '<div style="margin-top:12px;padding-top:12px;border-top:1px dashed rgba(255,255,255,.15);" onclick="event.stopPropagation()">'
      + '<div style="display:flex;border-radius:4px;overflow:hidden;border:1px solid rgba(255,255,255,.2);width:fit-content;margin-bottom:8px;">'
      + '<button onclick="setDefectStatus(\'' + e.kind + '\',\'' + (e.cat || '') + '\',\'' + e.id + '\',\'fixed\',this)" style="border:none;padding:7px 14px;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;' + (isFixed ? 'background:#7ec820;color:#1a3210;' : 'background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);') + '">Fixed</button>'
      + '<button onclick="setDefectStatus(\'' + e.kind + '\',\'' + (e.cat || '') + '\',\'' + e.id + '\',\'not_fixed\',this)" style="border:none;padding:7px 14px;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;' + (!isFixed ? 'background:#c62828;color:white;' : 'background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);') + '">Not Fixed</button>'
      + '</div>'
      + '<textarea placeholder="Office note — e.g. what was done to fix it" oninput="scheduleDefectNoteSave(\'' + e.kind + '\',\'' + (e.cat || '') + '\',\'' + e.id + '\',this)" style="width:100%;border:1px solid rgba(255,255,255,.2);border-radius:4px;padding:7px 9px;font-size:12.5px;font-family:\'Barlow\',sans-serif;background:rgba(255,255,255,.05);color:white;resize:vertical;min-height:36px;">' + e.officeNote + '</textarea>'
      + '</div>'
      + '</div>';
  }).join('') + '</div>';
  _loadDefectThumbs(listEl);
}

function openDefectRecord(kind, cat, id) {
  if (kind === 'vehicle') {
    switchChecksTab('vehicle');
    loadVehRecord(id);
    _waitAndOpenSurvey(function(){ return _vehDetailData && _vehDetailData.id === id; }, 'vehicle', null);
  } else {
    switchChecksTab(cat);
    loadCatRecord(cat, id);
    _waitAndOpenSurvey(function(){ return _catDetailData[cat] && _catDetailData[cat].id === id; }, 'cat', cat);
  }
}

function _waitAndOpenSurvey(isReady, kind, cat) {
  var tries = 0;
  var iv = setInterval(function() {
    tries++;
    if (isReady() || tries > 30) {
      clearInterval(iv);
      if (isReady()) openSurveyReport(kind, cat);
    }
  }, 100);
}

Object.keys(CHECK_CATEGORIES).forEach(renderCategoryPanel);

