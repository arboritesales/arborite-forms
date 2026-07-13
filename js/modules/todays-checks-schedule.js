// ── TODAY'S CHECKS (manager-curated list of what needs checking) ──
var _todayManageUnlocked = false;

// 'YYYY-MM-DD' in local time (not UTC — toISOString() would shift the date
// near midnight for any timezone ahead of UTC, e.g. British Summer Time)
function _isoDate(d) {
  var m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

function checksCategoryMeta(key) {
  if (key === 'vehicle') return { label: 'Vehicle Checks', icon: '🚗' };
  var cfg = CHECK_CATEGORIES[key];
  return cfg ? { label: cfg.label, icon: cfg.icon } : { label: key, icon: '❓' };
}

function todayMachineOptions(catKey) {
  if (catKey === 'vehicle') {
    var sel = document.getElementById('veh_reg');
    var opts = [];
    if (sel) { Array.prototype.forEach.call(sel.options, function(o){ if (o.value) opts.push(o.value); }); }
    return opts;
  }
  var cfg = CHECK_CATEGORIES[catKey];
  return cfg ? cfg.machines : [];
}

function openChecksTodayView() {
  _todayManageUnlocked = false;
  document.getElementById('checksTodayView').style.display = 'block';
  renderTodayChecks();
}

function closeChecksTodayView() {
  document.getElementById('checksTodayView').style.display = 'none';
}

function startTodayCheck(cat) {
  closeChecksTodayView();
  openChecksView();
  switchChecksTab(cat);
  if (cat === 'vehicle') showVehPinPanel(); else showCatPinPanel(cat);
}

function openManageTodayChecks() {
  if (managerUnlocked) { _todayManageUnlocked = true; renderTodayChecks(); return; }
  _pendingManagerRecord = { kind: 'todayManage' };
  var modal = document.getElementById('vehPassModal');
  if (modal) {
    modal.style.display = 'flex';
    var inp = document.getElementById('vehPassInp');
    if (inp) { inp.value = ''; inp.focus(); }
    document.getElementById('vehPassErr').textContent = '';
  }
}

function renderTodayChecks() {
  var listEl = document.getElementById('todayChecksList');
  if (!listEl) return;
  listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">Loading…</div>';
  fetch(SUPA_URL + '/rest/v1/todays_checks?scheduled_date=eq.' + _isoDate(new Date()) + '&order=created_at.asc', {
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + _authToken() }
  })
  .then(function(r){ return r.json(); })
  .then(function(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      listEl.innerHTML = '<div style="color:rgba(255,255,255,.4);padding:40px;text-align:center;font-size:13px;">Nothing added for today yet.</div>';
    } else {
      listEl.innerHTML = rows.map(function(r) {
        var meta = checksCategoryMeta(r.category);
        return '<div class="veh-list-entry" style="display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:default;">'
          + '<div style="flex:1;min-width:0;">'
          + '<div class="veh-list-reg">' + meta.icon + ' ' + (r.machine || '') + '</div>'
          + '<div class="veh-list-meta">' + meta.label + '</div>'
          + '</div>'
          + '<div style="display:flex;gap:8px;flex-shrink:0;">'
          + '<button onclick="startTodayCheck(\'' + r.category + '\')" style="background:var(--lime);border:none;color:#1a3210;padding:8px 14px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;white-space:nowrap;">Start Check &#8594;</button>'
          + (_todayManageUnlocked ? '<button onclick="removeTodayCheck(\'' + r.id + '\')" style="background:#c62828;border:none;color:white;padding:8px 10px;border-radius:4px;cursor:pointer;">&#10005;</button>' : '')
          + '</div></div>';
      }).join('');
    }
    renderTodayAddForm();
  })
  .catch(function() {
    listEl.innerHTML = '<div style="color:#ff6b6b;padding:20px;text-align:center;font-size:13px;">Could not load today\'s checks</div>';
  });
}

function renderTodayAddForm() {
  var el = document.getElementById('todayManageArea');
  if (!el) return;
  if (!_todayManageUnlocked) {
    el.innerHTML = '<button onclick="openManageTodayChecks()" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:white;padding:8px 16px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;">&#128274; Manage List (Manager Access)</button>';
    return;
  }
  var catOptions = ['vehicle'].concat(Object.keys(CHECK_CATEGORIES)).map(function(k) {
    var meta = checksCategoryMeta(k);
    return '<option value="' + k + '">' + meta.icon + ' ' + meta.label + '</option>';
  }).join('');
  el.innerHTML =
    '<div style="background:#2b2b2b;border-radius:8px;padding:16px;">'
    + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:var(--lime);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">&#10133; Add Item to Today\'s Checks</div>'
    + '<select id="todayAddCat" onchange="todayAddCatChange()" style="width:100%;padding:8px;border-radius:4px;border:none;margin-bottom:8px;font-family:\'Barlow\',sans-serif;font-size:13px;">' + catOptions + '</select>'
    + '<select id="todayAddMachine" style="width:100%;padding:8px;border-radius:4px;border:none;margin-bottom:10px;font-family:\'Barlow\',sans-serif;font-size:13px;"></select>'
    + '<button onclick="addTodayCheck()" style="background:var(--lime);border:none;color:#1a3210;padding:9px 18px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;width:100%;">Add to List</button>'
    + '</div>';
  todayAddCatChange();
}

function todayAddCatChange() {
  var catSel = document.getElementById('todayAddCat');
  var machSel = document.getElementById('todayAddMachine');
  if (!catSel || !machSel) return;
  var opts = todayMachineOptions(catSel.value);
  machSel.innerHTML = opts.map(function(m){ return '<option>' + m + '</option>'; }).join('');
}

function addTodayCheck() {
  var catSel = document.getElementById('todayAddCat');
  var machSel = document.getElementById('todayAddMachine');
  if (!catSel || !machSel || !catSel.value || !machSel.value) return;
  fetch(SUPA_URL + '/rest/v1/todays_checks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + _authToken(),
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ category: catSel.value, machine: machSel.value, scheduled_date: _isoDate(new Date()) })
  })
  .then(function(r) { if (!r.ok) throw new Error('add failed'); renderTodayChecks(); })
  .catch(function() { alert('Could not add item — check connection and try again.'); });
}

function removeTodayCheck(id) {
  if (!confirm('Remove this item from today\'s checks?')) return;
  fetch(SUPA_URL + '/rest/v1/todays_checks?id=eq.' + id, {
    method: 'DELETE',
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + _authToken() }
  })
  .then(function(r) { if (!r.ok) throw new Error('delete failed'); renderTodayChecks(); })
  .catch(function() { alert('Could not remove item — check connection and try again.'); });
}

// ── SCHEDULING CALENDAR (Manager Access) — assign checks to specific days up
// to 4 weeks ahead. Built on the same todays_checks table/list as above: this
// is just the view that lets a manager populate it for days beyond today. ──
var _scheduleWeekStart = null; // Date — Monday of the first visible week
var _scheduleData = {};        // 'YYYY-MM-DD' -> array of todays_checks rows
var _scheduleModalDate = null;

function _mondayOf(d) {
  var day = d.getDay(); // 0=Sun..6=Sat
  var diff = (day === 0 ? -6 : 1 - day);
  var m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return m;
}

function openScheduleView() {
  _scheduleWeekStart = _mondayOf(new Date());
  fetchScheduleData();
}

function fetchScheduleData() {
  var start = _isoDate(_scheduleWeekStart);
  var endDate = new Date(_scheduleWeekStart.getFullYear(), _scheduleWeekStart.getMonth(), _scheduleWeekStart.getDate() + 27);
  var end = _isoDate(endDate);
  fetch(SUPA_URL + '/rest/v1/todays_checks?scheduled_date=gte.' + start + '&scheduled_date=lte.' + end + '&order=scheduled_date.asc', {
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
  })
  .then(function(r){ return r.json(); })
  .then(function(rows) {
    _scheduleData = {};
    (Array.isArray(rows) ? rows : []).forEach(function(r) {
      if (!_scheduleData[r.scheduled_date]) _scheduleData[r.scheduled_date] = [];
      _scheduleData[r.scheduled_date].push(r);
    });
    renderScheduleGrid();
  })
  .catch(function() {
    var grid = document.getElementById('scheduleGrid');
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;color:#c62828;padding:20px;text-align:center;font-size:13px;">Could not load schedule — check connection and try again.</div>';
  });
}

function renderScheduleGrid() {
  var grid = document.getElementById('scheduleGrid');
  if (!grid) return;
  var endDate = new Date(_scheduleWeekStart.getFullYear(), _scheduleWeekStart.getMonth(), _scheduleWeekStart.getDate() + 27);
  var rangeEl = document.getElementById('scheduleRange');
  if (rangeEl) {
    rangeEl.textContent = _scheduleWeekStart.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) + ' – ' + endDate.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  }
  var today = _isoDate(new Date());
  var html = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function(d) {
    return '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(0,0,0,.4);text-align:center;padding-bottom:4px;">' + d + '</div>';
  }).join('');
  for (var i = 0; i < 28; i++) {
    var d = new Date(_scheduleWeekStart.getFullYear(), _scheduleWeekStart.getMonth(), _scheduleWeekStart.getDate() + i);
    var iso = _isoDate(d);
    var items = _scheduleData[iso] || [];
    var isToday = iso === today;
    html += '<div style="background:' + (isToday ? '#eef7e2' : '#fafaf8') + ';border-radius:6px;min-height:90px;padding:6px;display:flex;flex-direction:column;gap:4px;' + (isToday ? 'box-shadow:0 0 0 2px var(--green) inset;' : '') + '">'
      + '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:13px;color:var(--mid);">' + d.getDate() + '</div>'
      + items.slice(0, 3).map(function(it) {
          var meta = checksCategoryMeta(it.category);
          return '<div style="font-size:10px;font-weight:700;padding:3px 5px;border-radius:3px;background:#e8f2e3;color:#2d5a1b;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + meta.icon + ' ' + (it.machine || '') + '</div>';
        }).join('')
      + '<button onclick="openScheduleDayModal(\'' + iso + '\')" style="margin-top:auto;background:none;border:1.5px dashed var(--border);color:var(--mid);font-size:10px;font-weight:700;border-radius:4px;padding:4px;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;">' + (items.length === 0 ? '+ Add' : 'View (' + items.length + ') ›') + '</button>'
      + '</div>';
  }
  grid.innerHTML = html;
}

function openScheduleDayModal(iso) {
  _scheduleModalDate = iso;
  var d = new Date(iso + 'T00:00:00');
  document.getElementById('scheduleModalTitle').textContent = d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  var typeSel = document.getElementById('scheduleTypeSel');
  typeSel.innerHTML = ['vehicle'].concat(Object.keys(CHECK_CATEGORIES)).map(function(k) {
    var meta = checksCategoryMeta(k);
    return '<option value="' + k + '">' + meta.icon + ' ' + meta.label + '</option>';
  }).join('');
  scheduleTypeChange();
  renderScheduleModalList();
  document.getElementById('scheduleModal').style.display = 'flex';
}

function closeScheduleModal() {
  document.getElementById('scheduleModal').style.display = 'none';
  renderScheduleGrid();
}

function scheduleTypeChange() {
  var typeSel = document.getElementById('scheduleTypeSel');
  var assetSel = document.getElementById('scheduleAssetSel');
  var opts = todayMachineOptions(typeSel.value);
  assetSel.innerHTML = opts.map(function(m){ return '<option>' + m + '</option>'; }).join('');
}

function renderScheduleModalList() {
  var wrap = document.getElementById('scheduleModalList');
  var items = _scheduleData[_scheduleModalDate] || [];
  if (!items.length) {
    wrap.innerHTML = '<div style="color:#9a9a90;font-size:12.5px;padding:14px 0;text-align:center;">Nothing scheduled yet for this day.</div>';
    return;
  }
  wrap.innerHTML = items.map(function(it) {
    var meta = checksCategoryMeta(it.category);
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e0e0d8;font-size:12.5px;">'
      + '<span style="font-size:16px;">' + meta.icon + '</span>'
      + '<span style="flex:1;">' + meta.label + ' — ' + (it.machine || '') + '</span>'
      + '<button onclick="removeScheduledCheck(\'' + it.id + '\')" style="background:none;border:none;color:#a02020;font-size:16px;cursor:pointer;padding:2px 8px;" aria-label="Remove">&#10005;</button>'
      + '</div>';
  }).join('');
}

function addScheduledCheck() {
  var typeSel = document.getElementById('scheduleTypeSel');
  var assetSel = document.getElementById('scheduleAssetSel');
  if (!typeSel.value || !assetSel.value) return;
  fetch(SUPA_URL + '/rest/v1/todays_checks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + _authToken(),
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ category: typeSel.value, machine: assetSel.value, scheduled_date: _scheduleModalDate })
  })
  .then(function(r){ return r.json(); })
  .then(function(rows) {
    var row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) throw new Error('add failed');
    if (!_scheduleData[_scheduleModalDate]) _scheduleData[_scheduleModalDate] = [];
    _scheduleData[_scheduleModalDate].push(row);
    renderScheduleModalList();
  })
  .catch(function() { alert('Could not add item — check connection and try again.'); });
}

function removeScheduledCheck(id) {
  fetch(SUPA_URL + '/rest/v1/todays_checks?id=eq.' + id, {
    method: 'DELETE',
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
  })
  .then(function(r) {
    if (!r.ok) throw new Error('delete failed');
    _scheduleData[_scheduleModalDate] = (_scheduleData[_scheduleModalDate] || []).filter(function(it){ return String(it.id) !== String(id); });
    renderScheduleModalList();
  })
  .catch(function() { alert('Could not remove item — check connection and try again.'); });
}

