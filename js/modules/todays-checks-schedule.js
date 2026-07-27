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

// Carries the originating todays_checks row through the PIN sign-in step so
// the form can be pre-filled with the machine the manager already scheduled,
// and so the row can be flagged completed once the check is actually saved.
var _activeScheduledCheckId = null;
var _activeScheduledMachine = null;

function startScheduledCheck(cat, id, machine) {
  closeScheduleModal();
  switchChecksTab(cat);
  if (cat === 'vehicle') showVehPinPanel(); else showCatPinPanel(cat);
  _activeScheduledCheckId = id;
  _activeScheduledMachine = machine || '';
}

function _markScheduledComplete(id) {
  fetch(SUPA_URL + '/rest/v1/todays_checks?id=eq.' + id, {
    method: 'PATCH',
    headers: {'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken(),'Prefer':'return=minimal'},
    body: JSON.stringify({ completed: true })
  }).catch(function(){});
}

// ── CHECKS NOTIFICATION BADGE — shown on the Checks tile on the Welcome
// screen so employees see at a glance how many checks are outstanding today,
// without having to open the calendar first. Not filtered server-side by
// `completed` so this still degrades gracefully (shows today's total) before
// supabase_schedule_completed.sql has been run. ──
function refreshChecksBadge() {
  var badge = document.getElementById('checksTileBadge');
  if (!badge) return;
  fetch(SUPA_URL + '/rest/v1/todays_checks?scheduled_date=eq.' + _isoDate(new Date()), {
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
  })
  .then(function(r){ return r.json(); })
  .then(function(rows) {
    var outstanding = (Array.isArray(rows) ? rows : []).filter(function(r){ return !r.completed; }).length;
    if (outstanding > 0) {
      badge.textContent = outstanding;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  })
  .catch(function() { badge.style.display = 'none'; });
}

// ── SCHEDULING CALENDAR — the landing view for the Checks tab. Managers can
// assign up to 4 weeks of checks ahead (any number of items per day); every
// user can browse it and tap a day to start whatever's scheduled on it. ──
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

// Managers only — pages the 4-week window forward/back a month at a time so
// checks can be booked in further ahead than the current window.
function shiftSchedule(deltaWeeks) {
  _scheduleWeekStart = new Date(_scheduleWeekStart.getFullYear(), _scheduleWeekStart.getMonth(), _scheduleWeekStart.getDate() + deltaWeeks * 7);
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
  var prevBtn = document.getElementById('schedulePrevBtn');
  var nextBtn = document.getElementById('scheduleNextBtn');
  var hint = document.getElementById('scheduleHint');
  var allCatBtn = document.getElementById('checksAllCategoriesBtn');
  if (prevBtn) prevBtn.style.display = managerUnlocked ? '' : 'none';
  if (nextBtn) nextBtn.style.display = managerUnlocked ? '' : 'none';
  if (hint) hint.style.display = managerUnlocked ? 'none' : '';
  if (allCatBtn) allCatBtn.style.display = managerUnlocked ? '' : 'none';
  var endDate = new Date(_scheduleWeekStart.getFullYear(), _scheduleWeekStart.getMonth(), _scheduleWeekStart.getDate() + 27);
  var rangeEl = document.getElementById('scheduleRange');
  if (rangeEl) {
    rangeEl.textContent = _scheduleWeekStart.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) + ' – ' + endDate.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  }
  var today = _isoDate(new Date());
  var html = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function(d) {
    return '<div class="sched-weekday-hdr" style="font-family:\'Barlow Condensed\',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(0,0,0,.4);text-align:center;padding-bottom:4px;">' + d + '</div>';
  }).join('');
  for (var i = 0; i < 28; i++) {
    var d = new Date(_scheduleWeekStart.getFullYear(), _scheduleWeekStart.getMonth(), _scheduleWeekStart.getDate() + i);
    var iso = _isoDate(d);
    var items = _scheduleData[iso] || [];
    var isToday = iso === today;
    var weekdayShort = d.toLocaleDateString('en-GB',{weekday:'short'});
    html += '<div class="sched-day-cell" style="background:' + (isToday ? '#eef7e2' : '#fafaf8') + ';border-radius:6px;min-height:120px;padding:8px;display:flex;flex-direction:column;gap:6px;' + (isToday ? 'box-shadow:0 0 0 2px var(--green) inset;' : '') + '">'
      + '<div class="sched-day-date" style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:14px;color:var(--mid);"><span class="sched-day-weekday" style="display:none;">' + weekdayShort + ' </span>' + d.getDate() + '</div>'
      + '<div class="sched-day-pills" style="display:flex;flex-direction:column;gap:4px;flex:1;">'
      + items.slice(0, 5).map(function(it) {
          var meta = checksCategoryMeta(it.category);
          var doneMark = it.completed ? '&#10003; ' : '';
          return '<div style="font-size:11px;font-weight:700;padding:4px 6px;border-radius:3px;background:' + (it.completed ? '#d7ecc9' : '#e8f2e3') + ';color:#2d5a1b;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + doneMark + meta.icon + ' ' + (it.machine || '') + '</div>';
        }).join('')
      + '</div>'
      + '<button class="sched-day-action" onclick="openScheduleDayModal(\'' + iso + '\')" style="margin-top:auto;background:none;border:1.5px dashed var(--border);color:var(--mid);font-size:10.5px;font-weight:700;border-radius:4px;padding:5px;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;">' + (items.length === 0 ? (managerUnlocked ? '+ Add' : 'Nothing') : 'View (' + items.length + ') ›') + '</button>'
      + '</div>';
  }
  grid.innerHTML = html;
}

function openScheduleDayModal(iso) {
  _scheduleModalDate = iso;
  var d = new Date(iso + 'T00:00:00');
  document.getElementById('scheduleModalTitle').textContent = d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  var footer = document.getElementById('scheduleModalFooter');
  if (footer) footer.style.display = managerUnlocked ? 'flex' : 'none';
  if (managerUnlocked) {
    var typeSel = document.getElementById('scheduleTypeSel');
    typeSel.innerHTML = ['vehicle'].concat(Object.keys(CHECK_CATEGORIES)).map(function(k) {
      var meta = checksCategoryMeta(k);
      return '<option value="' + k + '">' + meta.icon + ' ' + meta.label + '</option>';
    }).join('');
    scheduleTypeChange();
  }
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
    wrap.innerHTML = '<div style="color:#9a9a90;font-size:12.5px;padding:14px 0;text-align:center;">Nothing scheduled for this day.</div>';
    return;
  }
  wrap.innerHTML = items.map(function(it) {
    var meta = checksCategoryMeta(it.category);
    var machineEsc = (it.machine || '').replace(/'/g, "\\'");
    var doneBadge = '<span style="font-size:10.5px;font-weight:800;color:#2d5a1b;background:#e8f2e3;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;">&#10003; Completed</span>';
    var actionHtml;
    if (managerUnlocked) {
      actionHtml = (it.completed ? doneBadge : '')
        + '<button onclick="removeScheduledCheck(\'' + it.id + '\')" style="background:none;border:none;color:#a02020;font-size:16px;cursor:pointer;padding:2px 8px;" aria-label="Remove">&#10005;</button>';
    } else {
      actionHtml = it.completed
        ? doneBadge
        : '<button onclick="startScheduledCheck(\'' + it.category + '\',\'' + it.id + '\',\'' + machineEsc + '\')" style="background:var(--lime);border:none;color:#1a3210;padding:6px 12px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;white-space:nowrap;">Start &#8594;</button>';
    }
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e0e0d8;font-size:12.5px;">'
      + '<span style="font-size:16px;">' + meta.icon + '</span>'
      + '<span style="flex:1;">' + meta.label + ' — ' + (it.machine || '') + '</span>'
      + actionHtml
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

// ── WEEKLY REPORT (Manager Access) — rollup across every check table for a
// given week, reusing the same table/category list as the Defects dashboard ──
var _weeklyReportWeekStart = null; // Date — Monday of the currently viewed week

function openWeeklyReportView() {
  if (!_weeklyReportWeekStart) _weeklyReportWeekStart = _mondayOf(new Date());
  fetchWeeklyReportData();
}

function shiftWeeklyReport(deltaWeeks) {
  var d = _weeklyReportWeekStart || _mondayOf(new Date());
  _weeklyReportWeekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() + deltaWeeks * 7);
  fetchWeeklyReportData();
}

function _weeklyReportTables() {
  var list = [{ kind: 'vehicle', cat: null, table: 'vehicle_checks', nameField: 'vehicle', label: 'Vehicle' }];
  Object.keys(CHECK_CATEGORIES).forEach(function(catKey) {
    var cfg = CHECK_CATEGORIES[catKey];
    list.push({ kind: 'cat', cat: catKey, table: cfg.table, nameField: 'machine', label: cfg.label });
  });
  return list;
}

function fetchWeeklyReportData() {
  var bodyEl = document.getElementById('weeklyReportBody');
  var rangeEl = document.getElementById('weeklyReportRange');
  var weekStart = _weeklyReportWeekStart;
  var weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7); // exclusive
  var weekEndDisplay = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  if (rangeEl) rangeEl.textContent = weekStart.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) + ' – ' + weekEndDisplay.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  if (bodyEl) bodyEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">Loading…</div>';

  var startIso = _isoDate(weekStart) + 'T00:00:00';
  var endIso = _isoDate(weekEnd) + 'T00:00:00';
  var tables = _weeklyReportTables();

  Promise.all(tables.map(function(t) {
    var fields = 'id,created_at,inspector_name,overall_rating,has_defect,' + t.nameField;
    return fetch(SUPA_URL + '/rest/v1/' + t.table + '?select=' + fields + '&created_at=gte.' + startIso + '&created_at=lt.' + endIso + '&order=created_at.desc', {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
    })
    .then(function(r){ return r.json(); })
    .then(function(rows) {
      return (Array.isArray(rows) ? rows : []).map(function(r) {
        return {
          kind: t.kind, cat: t.cat, label: t.label, name: r[t.nameField] || '',
          inspector: r.inspector_name || '', rating: r.overall_rating || '',
          hasDefect: !!r.has_defect, createdAt: r.created_at || '', id: r.id
        };
      });
    })
    .catch(function() { return []; });
  })).then(function(results) {
    var all = [].concat.apply([], results);
    all.sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); });
    renderWeeklyReport(all, tables);
  });
}

function renderWeeklyReport(entries, tables) {
  var bodyEl = document.getElementById('weeklyReportBody');
  if (!bodyEl) return;

  var counts = { total: entries.length, excellent: 0, satisfactory: 0, unsatisfactory: 0, defects: 0 };
  entries.forEach(function(e) {
    var r = (e.rating || '').toLowerCase();
    if (r === 'excellent') counts.excellent++;
    else if (r === 'satisfactory') counts.satisfactory++;
    else if (r === 'unsatisfactory') counts.unsatisfactory++;
    if (e.hasDefect) counts.defects++;
  });

  var byCat = {};
  entries.forEach(function(e) { var k = e.cat || e.kind; byCat[k] = (byCat[k] || 0) + 1; });
  var maxCatCount = Math.max.apply(null, tables.map(function(t){ var k = t.cat || t.kind; return byCat[k] || 0; }).concat([1]));

  var statHtml = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">'
    + '<div style="background:white;border-radius:7px;padding:14px;text-align:center;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:28px;color:var(--green);">' + counts.total + '</div><div style="font-size:11px;color:#8a8a7a;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;">Checks completed</div></div>'
    + '<div style="background:white;border-radius:7px;padding:14px;text-align:center;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:28px;color:var(--green);">' + counts.excellent + '</div><div style="font-size:11px;color:#8a8a7a;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;">Excellent</div></div>'
    + '<div style="background:white;border-radius:7px;padding:14px;text-align:center;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:28px;color:#e6a817;">' + counts.satisfactory + '</div><div style="font-size:11px;color:#8a8a7a;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;">Satisfactory</div></div>'
    + '<div style="background:white;border-radius:7px;padding:14px;text-align:center;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:28px;color:#c62828;">' + counts.defects + '</div><div style="font-size:11px;color:#8a8a7a;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;">Defects logged</div></div>'
    + '</div>';

  var barsHtml = tables.map(function(t) {
    var k = t.cat || t.kind;
    var c = byCat[k] || 0;
    if (!c) return '';
    var pct = Math.round((c / maxCatCount) * 100);
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;font-size:12.5px;">'
      + '<div style="width:120px;flex-shrink:0;color:var(--mid);">' + t.label + '</div>'
      + '<div style="flex:1;height:16px;background:#eee;border-radius:3px;overflow:hidden;"><div style="height:100%;border-radius:3px;background:var(--green);width:' + pct + '%;"></div></div>'
      + '<div style="width:28px;text-align:right;color:#8a8a7a;">' + c + '</div>'
      + '</div>';
  }).join('');

  var reportListHtml = entries.length
    ? '<ul style="list-style:none;margin:0;padding:0;">' + entries.map(function(e) {
        var dateStr = e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '';
        return '<li style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;">'
          + '<a href="#" onclick="openDefectRecord(\'' + e.kind + '\',\'' + (e.cat || '') + '\',\'' + e.id + '\');return false;" style="color:var(--green);text-decoration:none;font-weight:600;">' + e.label + (e.name ? ' — ' + e.name : '') + '</a>'
          + '<span style="color:#8a8a7a;font-size:11.5px;">' + (e.inspector ? e.inspector + ' · ' : '') + dateStr + '</span>'
          + '</li>';
      }).join('') + '</ul>'
    : '<div style="color:#9a9a90;font-size:12.5px;padding:14px 0;text-align:center;">No checks completed this week.</div>';

  bodyEl.innerHTML = statHtml
    + '<div style="background:white;border-radius:8px;padding:16px;margin-bottom:16px;">' + (barsHtml || '<div style="color:#9a9a90;font-size:12.5px;text-align:center;padding:10px 0;">Nothing to break down yet.</div>') + '</div>'
    + '<div style="background:#1a3210;padding:10px 16px;border-radius:8px 8px 0 0;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:var(--lime);text-transform:uppercase;letter-spacing:1px;">Individual Reports</div>'
    + '<div style="background:white;border-radius:0 0 8px 8px;padding:6px 16px 16px;">' + reportListHtml + '</div>';
}

