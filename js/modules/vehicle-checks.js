// ── CHECKS / VEHICLE INSPECTIONS ──
var VEH_EMPLOYEES = {
  '1995': 'Joe Grace',
  '6230': 'Jason Hiscock',
  '1599': 'Luke Richardson',
  '1961': 'Dave Norris',
  '0000': 'James Hilborne',
  '4033': 'Joel Cripps',
  '1234': 'Jon Challinor',
  '0206': 'Liam Couling',
  '2580': 'Liam Cooper',
  '6252': 'Jack Fisher'
};
var _vehInspector = null;
var _vehAutoSaveTimer = null;
var _vehCurrentId = null;

function switchChecksTab(tab) {
  document.getElementById('checksHome').style.display = 'none';
  document.querySelectorAll('.checks-tab-content').forEach(function(c) {
    c.style.display = (c.id === 'checksTab_' + tab) ? 'block' : 'none';
  });
  if (tab === 'vehicle') { fetchVehList(); }
  else if (tab === 'defects') { fetchDefects(); }
  else if (tab === 'schedule') { openScheduleView(); }
  else if (typeof CHECK_CATEGORIES !== 'undefined' && CHECK_CATEGORIES[tab]) { fetchCatList(tab); }
}

function showChecksHome() {
  document.getElementById('checksHome').style.display = 'block';
  document.querySelectorAll('.checks-tab-content').forEach(function(c) { c.style.display = 'none'; });
}

function checksBack() {
  var home = document.getElementById('checksHome');
  if (home && home.style.display !== 'none') { closeChecksView(); }
  else { showChecksHome(); }
}

function openChecksView() {
  document.getElementById('checksView').style.display = 'block';
  var defectsBtn = document.getElementById('defectsTabBtn');
  if (defectsBtn) defectsBtn.style.display = managerUnlocked ? '' : 'none';
  var scheduleBtn = document.getElementById('scheduleTabBtn');
  if (scheduleBtn) scheduleBtn.style.display = managerUnlocked ? '' : 'none';
  showChecksHome();
}

function closeChecksView() {
  document.getElementById('checksView').style.display = 'none';
}

function showVehList() {
  document.getElementById('vehListPanel').style.display = 'block';
  document.getElementById('vehPinPanel').style.display = 'none';
  document.getElementById('vehFormPanel').style.display = 'none';
  document.getElementById('checksView').scrollTop = 0;
}

function showVehPinPanel() {
  document.getElementById('vehListPanel').style.display = 'none';
  document.getElementById('vehPinPanel').style.display = 'block';
  document.getElementById('vehFormPanel').style.display = 'none';
  document.getElementById('vehPin').value = '';
  document.getElementById('vehPinName').style.display = 'none';
  document.getElementById('vehPinConfirm').style.display = 'none';
  document.getElementById('vehPinErr').textContent = '';
  document.getElementById('checksView').scrollTop = 0;
}

function checkVehPin(val) {
  var nameEl = document.getElementById('vehPinName');
  var errEl = document.getElementById('vehPinErr');
  var confirmBtn = document.getElementById('vehPinConfirm');
  errEl.textContent = '';
  nameEl.style.display = 'none';
  confirmBtn.style.display = 'none';
  if (val.length >= 3) {
    var name = VEH_EMPLOYEES[val];
    if (name) {
      nameEl.textContent = '✓ ' + name;
      nameEl.style.display = 'block';
      confirmBtn.style.display = 'inline-block';
    } else if (val.length >= 4) {
      errEl.textContent = 'PIN not recognised — try again';
    }
  }
}

function confirmVehPin() {
  var pinEl = document.getElementById('vehPin');
  var name = VEH_EMPLOYEES[pinEl.value];
  if (!name) return;
  _vehInspector = name;
  _vehCurrentId = null;
  document.getElementById('vehInspectorDisplay').textContent = name;
  document.getElementById('vehDateDisplay').textContent = new Date().toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('vehPinPanel').style.display = 'none';
  document.getElementById('vehFormPanel').style.display = 'block';
  document.getElementById('checksView').scrollTop = 0;
  vehClearForm();
}

function vehClearForm() {
  document.getElementById('veh_reg').value = '';
  document.getElementById('veh_mileage').value = '';
  document.getElementById('veh_notes').value = '';
  document.querySelectorAll('.veh-opts .veh-btn').forEach(function(b){ b.className = b.classList.contains('veh-multi') ? 'veh-btn veh-multi' : 'veh-btn'; });
  document.querySelectorAll('.veh-rating-btn').forEach(function(b){ b.className = 'veh-rating-btn'; });
  document.getElementById('vehSaveStatus').textContent = '';
  resetDefectState('veh');
}

function vehSel(groupId, btn, val) {
  var group = document.getElementById(groupId);
  group.querySelectorAll('.veh-btn:not(.veh-multi)').forEach(function(b){ b.className = 'veh-btn'; });
  group.querySelectorAll('.veh-btn.veh-multi').forEach(function(b){ b.className = 'veh-btn veh-multi'; });
  var cls = 'active-' + val.toLowerCase().replace(/\//g,'').replace(/ /g,'');
  btn.classList.add(cls);
  vehAutoSave();
}

function vehToggle(groupId, btn, val) {
  var group = document.getElementById(groupId);
  group.querySelectorAll('.veh-btn:not(.veh-multi)').forEach(function(b){ b.className = 'veh-btn'; });
  var cls = 'active-' + val.toLowerCase().replace(/ /g,'');
  if (btn.classList.contains(cls)) { btn.classList.remove(cls); } else { btn.classList.add(cls); }
  vehAutoSave();
}

function vehRating(btn, val) {
  document.querySelectorAll('.veh-rating-btn').forEach(function(b){ b.className = 'veh-rating-btn'; });
  btn.classList.add('active-' + val.toLowerCase());
  vehAutoSave();
}

function vehGetFieldVal(groupId) {
  var group = document.getElementById(groupId);
  if (!group) return '';
  var active = [];
  group.querySelectorAll('.veh-btn').forEach(function(b) {
    var cls = Array.from(b.classList).find(function(c){ return c.startsWith('active-'); });
    if (cls) active.push(b.textContent.trim());
  });
  return active.join(', ');
}

function vehGetRating() {
  var btn = document.querySelector('.veh-rating-btn[class*="active-"]');
  return btn ? btn.textContent.trim().replace(/\n.*/,'').trim() : '';
}

function vehAutoSave() {
  clearTimeout(_vehAutoSaveTimer);
  var s = document.getElementById('vehSaveStatus');
  if (s) s.textContent = 'Saving…';
  _vehAutoSaveTimer = setTimeout(function(){ saveVehCheck(true); }, 1200);
}

function saveVehCheck(isAuto) {
  var reg = document.getElementById('veh_reg').value;
  var mileage = document.getElementById('veh_mileage').value;
  var rating = vehGetRating();
  var s = document.getElementById('vehSaveStatus');

  var payload = {
    inspector_name: _vehInspector,
    vehicle: reg,
    mileage: mileage ? parseInt(mileage) : null,
    used_since_last: vehGetFieldVal('veh_used'),
    wheels_tyres: vehGetFieldVal('veh_wheels'),
    lights: vehGetFieldVal('veh_lights'),
    number_plate: vehGetFieldVal('veh_plate'),
    bodywork: vehGetFieldVal('veh_body'),
    exhaust: vehGetFieldVal('veh_exhaust'),
    tow_hitch: vehGetFieldVal('veh_tow'),
    mirrors: vehGetFieldVal('veh_mirrors'),
    wipers: vehGetFieldVal('veh_wipers'),
    washer_fluid: vehGetFieldVal('veh_washer'),
    seatbelt: vehGetFieldVal('veh_seatbelt'),
    horn: vehGetFieldVal('veh_horn'),
    engine_oil: vehGetFieldVal('veh_oil'),
    engine_coolant: vehGetFieldVal('veh_coolant'),
    power_steering: vehGetFieldVal('veh_steering'),
    hydraulic_system: vehGetFieldVal('veh_hyd_sys'),
    hydraulic_fluid: vehGetFieldVal('veh_hyd_fluid'),
    tipping_system: vehGetFieldVal('veh_tip'),
    first_aid: vehGetFieldVal('veh_firstaid'),
    fire_extinguisher: vehGetFieldVal('veh_fire'),
    handbook: vehGetFieldVal('veh_handbook'),
    spanner_socket: vehGetFieldVal('veh_spanner'),
    ladders: vehGetFieldVal('veh_ladders'),
    overall_rating: rating,
    remedial_notes: document.getElementById('veh_notes').value
  };
  var _defPayload = getDefectPayload('veh');
  payload.has_defect = _defPayload.has_defect;
  payload.defect_comment = _defPayload.defect_comment;
  payload.defect_images = _defPayload.defect_images;

  var method = 'POST';
  var url = SUPA_URL + '/rest/v1/vehicle_checks';
  if (_vehCurrentId) {
    method = 'PATCH';
    url += '?id=eq.' + _vehCurrentId;
  }

  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + _authToken(),
      'Prefer': _vehCurrentId ? 'return=minimal' : 'return=representation'
    },
    body: JSON.stringify(_vehCurrentId ? payload : payload)
  })
  .then(function(r) {
    if (!r.ok) {
      return r.json().catch(function(){ return null; }).then(function(body) {
        var reason = (body && (body.message || body.hint || body.code)) ? (body.message || body.hint || body.code) : ('HTTP ' + r.status);
        throw new Error(reason);
      });
    }
    if (r.status === 204) return null;
    return r.json().catch(function(){ return null; });
  })
  .then(function(d) {
    if (!_vehCurrentId && Array.isArray(d) && d[0] && d[0].id) {
      _vehCurrentId = d[0].id;
    }
    if (s) {
      s.style.color = 'var(--lime)';
      s.textContent = '✓ ' + (isAuto ? 'Auto-saved' : 'Saved successfully!');
      if (!isAuto) { setTimeout(function(){ showVehList(); fetchVehList(); }, 1000); }
      else { setTimeout(function(){ if(s) s.textContent = ''; }, 2000); }
    }
  })
  .catch(function(err) {
    console.error('vehicle_checks save failed', err);
    if (s) { s.style.color = '#ff6b6b'; s.textContent = 'Save failed — ' + (err && err.message ? err.message : 'check connection'); }
  });
}

function fetchVehList() {
  var listEl = document.getElementById('vehList');
  if (!listEl) return;
  listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">Loading…</div>';
  fetch(SUPA_URL + '/rest/v1/vehicle_checks?order=created_at.desc&limit=50', {
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + _authToken() }
  })
  .then(function(r){ return r.json(); })
  .then(function(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      listEl.innerHTML = '<div style="color:rgba(255,255,255,.4);padding:40px;text-align:center;font-size:13px;">No inspections yet — tap + New Inspection to begin</div>';
      return;
    }
    listEl.innerHTML = rows.map(function(r) {
      var rating = (r.overall_rating || '').toLowerCase();
      var badgeCls = rating.indexOf('excellent') !== -1 ? 'excellent' : rating.indexOf('unsatisfactory') !== -1 ? 'unsatisfactory' : 'satisfactory';
      var badgeIcon = badgeCls === 'excellent' ? '✅' : badgeCls === 'unsatisfactory' ? '❌' : '⚠️';
      var dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}) : '';
      var miles = r.mileage ? Number(r.mileage).toLocaleString() + ' miles' : '';
      return '<div class="veh-list-entry" onclick="openVehRecord(\'' + r.id + '\')">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
        + '<span class="veh-list-reg">' + (r.vehicle || 'Unknown') + '</span>'
        + '<span class="veh-list-badge ' + badgeCls + '">' + badgeIcon + ' ' + (r.overall_rating || 'No rating') + '</span>'
        + '</div>'
        + '<div class="veh-list-meta">' + (r.inspector_name || '') + (dateStr ? ' · ' + dateStr : '') + (miles ? ' · ' + miles : '') + '</div>'
        + '<div style="font-size:11px;color:rgba(126,200,32,.6);margin-top:4px;font-family:\'Barlow Condensed\',sans-serif;letter-spacing:.5px;">🔒 Tap to view</div>'
        + '</div>';
    }).join('');
  })
  .catch(function() {
    listEl.innerHTML = '<div style="color:#ff6b6b;padding:20px;text-align:center;font-size:13px;">Could not load inspections</div>';
  });
}

var _pendingManagerRecord = null; // {kind:'vehicle'|'cat', cat, id}

function openVehRecord(id) {
  if (!id || id === 'null' || id === 'undefined') {
    alert('This record can\'t be opened — it\'s missing an ID. Please let the office know so it can be fixed.');
    return;
  }
  if (managerUnlocked) { loadVehRecord(id); return; }
  _pendingManagerRecord = { kind: 'vehicle', id: id };
  var modal = document.getElementById('vehPassModal');
  if (modal) {
    modal.style.display = 'flex';
    var inp = document.getElementById('vehPassInp');
    if (inp) { inp.value = ''; inp.focus(); }
    document.getElementById('vehPassErr').textContent = '';
  }
}

function closeVehPassModal() {
  var modal = document.getElementById('vehPassModal');
  if (modal) modal.style.display = 'none';
  _pendingManagerRecord = null;
}

function confirmVehPass() {
  var inp = document.getElementById('vehPassInp');
  var err = document.getElementById('vehPassErr');
  if (!inp) return;
  if (inp.value === '2001') {
    var pending = _pendingManagerRecord;
    closeVehPassModal();
    if (!pending) return;
    if (pending.kind === 'cat') loadCatRecord(pending.cat, pending.id);
    else if (pending.kind === 'todayManage') { _todayManageUnlocked = true; renderTodayChecks(); }
    else loadVehRecord(pending.id);
  } else {
    err.textContent = 'Incorrect password — try again';
    inp.value = '';
    inp.focus();
  }
}

var _vehDetailRecordId = null;

function vehFieldList(d) {
  return [
    ['Vehicle',d.vehicle],['Mileage',d.mileage ? Number(d.mileage).toLocaleString() + ' miles' : ''],
    ['Used since last inspection',d.used_since_last],
    ['Wheels & Tyres',d.wheels_tyres],['Lights',d.lights],['Number Plate',d.number_plate],
    ['Bodywork',d.bodywork],['Exhaust',d.exhaust],['Tow Hitch',d.tow_hitch],
    ['Mirrors',d.mirrors],['Wipers',d.wipers],['Washer Fluid',d.washer_fluid],
    ['Seatbelt',d.seatbelt],['Horn',d.horn],
    ['Engine Oil',d.engine_oil],['Engine Coolant',d.engine_coolant],
    ['Power Steering',d.power_steering],['Hydraulic System',d.hydraulic_system],
    ['Hydraulic Fluid',d.hydraulic_fluid],['Tipping System',d.tipping_system],
    ['First Aid Kit',d.first_aid],['Fire Extinguisher',d.fire_extinguisher],
    ['Handbook Present',d.handbook],['Spanner & Socket Set',d.spanner_socket],
    ['Ladders',d.ladders]
  ];
}

var _vehDetailData = null;

function loadVehRecord(id) {
  _vehDetailRecordId = id;
  _vehDetailData = null;
  document.getElementById('vehListPanel').style.display = 'none';
  document.getElementById('vehPinPanel').style.display = 'none';
  document.getElementById('vehDetailPanel').style.display = 'block';
  document.getElementById('vehDetailContent').innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;">Loading…</div>';
  document.getElementById('checksView').scrollTop = 0;

  fetch(SUPA_URL + '/rest/v1/vehicle_checks?id=eq.' + id, {
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + _authToken() }
  })
  .then(function(r){ return r.json(); })
  .then(function(rows) {
    if (!rows || !rows[0]) {
      console.error('vehicle_checks load failed for id=' + id, rows);
      var reason = (rows && (rows.message || rows.hint || rows.code)) ? (rows.message || rows.hint || rows.code) : 'No record returned';
      document.getElementById('vehDetailContent').innerHTML = '<div style="color:#ff6b6b;padding:20px;text-align:center;">Could not load record<br><span style="font-size:11px;opacity:.7;">' + reason + '</span></div>';
      return;
    }
    var d = rows[0];
    _vehDetailData = d;
    var rating = (d.overall_rating || '').toLowerCase();
    var badgeCls = rating.indexOf('excellent') !== -1 ? 'excellent' : rating.indexOf('unsatisfactory') !== -1 ? 'unsatisfactory' : 'satisfactory';
    var dateStr = d.created_at ? new Date(d.created_at).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '';

    var fields = vehFieldList(d);

    var rows_html = fields.map(function(f) {
      if (!f[1]) return '';
      var val = f[1];
      var colour = '';
      if (/good|yes|correct|excellent/i.test(val)) colour = 'color:#2d5a1b;font-weight:700;';
      else if (/poor|no\b|unsatisfactory/i.test(val)) colour = 'color:#c62828;font-weight:700;';
      else if (/fair|low|satisfactory/i.test(val)) colour = 'color:#7a4d00;font-weight:700;';
      return '<div class="field-row lw"><div class="fc lbl">' + f[0] + '</div><div class="fc" style="padding:10px 14px;' + colour + '">' + val + '</div></div>';
    }).filter(Boolean).join('');

    document.getElementById('vehDetailContent').innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;padding:0 4px;">'
      + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:22px;font-weight:800;color:white;">' + (d.vehicle || '') + '</div>'
      + '<span class="veh-list-badge ' + badgeCls + '">' + (d.overall_rating || '') + '</span>'
      + '</div>'
      + '<div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:16px;padding:0 4px;">' + (d.inspector_name || '') + (dateStr ? ' · ' + dateStr : '') + '</div>'
      + '<div style="background:white;border-radius:8px;overflow:hidden;margin-bottom:14px;">' + rows_html + '</div>'
      + (d.remedial_notes ? '<div style="background:#2b2b2b;border-radius:8px;padding:14px 16px;margin-bottom:14px;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Remedial Notes</div><div style="font-size:13px;color:white;line-height:1.6;">' + d.remedial_notes + '</div></div>' : '');
  })
  .catch(function() {
    document.getElementById('vehDetailContent').innerHTML = '<div style="color:#ff6b6b;padding:20px;text-align:center;">Failed to load</div>';
  });
}

function printVehRecord() {
  var view = document.getElementById('checksView');
  view.classList.add('printing-veh');
  _printWithClass(function() { view.classList.remove('printing-veh'); });
}

function exportFieldsToExcel(filename, title, meta, fieldPairs) {
  if (typeof XLSX === 'undefined') { alert('Excel export is unavailable — please check your internet connection and try again.'); return; }
  var data = [[title], []];
  meta.forEach(function(m){ data.push(m); });
  data.push([]);
  data.push(['Item', 'Result']);
  fieldPairs.forEach(function(f) {
    if (f[1] !== undefined && f[1] !== null && f[1] !== '') data.push([f[0], f[1]]);
  });
  var ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 60 }, { wch: 30 }];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Check');
  XLSX.writeFile(wb, filename);
}

function safeFileSegment(s) {
  return String(s || 'record').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
}

function downloadVehExcel() {
  var d = _vehDetailData;
  if (!d) return;
  var dateStr = d.created_at ? new Date(d.created_at).toLocaleString('en-GB') : '';
  var meta = [
    ['Inspector', d.inspector_name || ''],
    ['Date', dateStr],
    ['Overall Rating', d.overall_rating || '']
  ];
  var filename = 'Vehicle_Check_' + safeFileSegment(d.vehicle) + '_' + safeFileSegment(dateStr) + '.xlsx';
  exportFieldsToExcel(filename, 'Vehicle Check — ' + (d.vehicle || ''), meta, vehFieldList(d));
}

function closeVehDetail() {
  document.getElementById('vehDetailPanel').style.display = 'none';
  document.getElementById('vehListPanel').style.display = 'block';
  document.getElementById('checksView').scrollTop = 0;
  _vehDetailRecordId = null;
}

function deleteVehRecord() {
  if (!_vehDetailRecordId || _vehDetailRecordId === 'null' || _vehDetailRecordId === 'undefined') {
    alert('This record can\'t be deleted — it\'s missing an ID. Please let the office know so it can be fixed.');
    return;
  }
  if (!confirm('Delete this inspection record? This cannot be undone.')) return;
  var id = _vehDetailRecordId;
  fetch(SUPA_URL + '/rest/v1/vehicle_checks?id=eq.' + id, {
    method: 'DELETE',
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + _authToken() }
  })
  .then(function(r) {
    if (!r.ok) {
      return r.json().catch(function(){ return null; }).then(function(body) {
        console.error('vehicle_checks delete failed for id=' + id, r.status, body);
        var reason = (body && (body.message || body.hint || body.code)) ? (body.message || body.hint || body.code) : ('HTTP ' + r.status);
        throw new Error(reason);
      });
    }
    _vehDetailRecordId = null;
    closeVehDetail();
    fetchVehList();
  })
  .catch(function(err) {
    alert('Could not delete record — ' + (err && err.message ? err.message : 'check connection and try again.'));
  });
}

