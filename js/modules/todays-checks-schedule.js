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

// A check done straight from its tile (not via Start on the Schedule) still
// ticks off the oldest matching outstanding item booked up to today — same
// category, and the same machine unless the category has only one asset
// (hideMachine kits, whose scheduled name may predate a rename). No lower
// date bound: undone bookings carry over until done, however late.
function _completeMatchingScheduled(category, machine) {
  var cfg = CHECK_CATEGORIES[category];
  var now = new Date();
  var q = 'todays_checks?select=id&category=eq.' + encodeURIComponent(category)
    + '&completed=not.is.true&scheduled_date=lte.' + _isoDate(now)
    + '&order=scheduled_date.asc&limit=1';
  if (!(cfg && cfg.hideMachine)) {
    if (!machine) return;
    q += '&machine=eq.' + encodeURIComponent(machine);
  }
  fetch(SUPA_URL + '/rest/v1/' + q, {
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
  })
  .then(function(r){ return r.json(); })
  .then(function(rows) {
    if (Array.isArray(rows) && rows[0] && rows[0].id) _markScheduledComplete(rows[0].id);
  })
  .catch(function(){});
}

// ── DAILY CHECKS — these machines need a check every weekday (Mon–Fri)
// without anyone booking it. They aren't stored as todays_checks rows: a day's
// daily check counts as done when a finished check (one with an overall
// rating) was saved for that machine that day. A missed one shows as missed
// on its own day and stays outstanding until the machine is next checked:
// on weekdays that day's daily check is flagged "not done since", and at
// weekends it carries over every other day like a booking (and always onto
// today). A manager booking for the same machine on the same day takes its
// place. ──
var DAILY_CHECKS = [
  { category: 'digger',  machine: 'KX027-4' },
  { category: 'digger',  machine: 'Volvo ECR145E' },
  { category: 'climber', machine: 'MDB LV 800 Green Climber' },
  { category: 'stump',   machine: 'FSI D74' },
  { category: 'mewp',    machine: 'Hinowa MEWP' }
];
var DAILY_CHECKS_FROM = '2026-10-23'; // first day they were due — nothing missed before it

function _addDaysIso(iso, n) {
  var d = new Date(iso + 'T00:00:00');
  return _isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

function _isWeekendIso(iso) {
  var dow = new Date(iso + 'T00:00:00').getDay();
  return dow === 0 || dow === 6;
}

// How far back to look for missed daily checks (at most 60 days).
function _dailyLookbackStart(today) {
  var b = _addDaysIso(today, -60);
  return b > DAILY_CHECKS_FROM ? b : DAILY_CHECKS_FROM;
}

// { 'category|machine': 'YYYY-MM-DD' } — the first missed weekday since the
// machine was last checked, for each machine with a miss still outstanding.
// doneMap must cover _dailyLookbackStart(today) .. today.
function _dailyMissedSince(doneMap, today) {
  var out = {};
  DAILY_CHECKS.forEach(function(d) {
    var key = d.category + '|' + d.machine, since = null;
    for (var iso = _dailyLookbackStart(today); iso <= today; iso = _addDaysIso(iso, 1)) {
      if (doneMap[iso + '|' + key]) since = null;
      else if (iso < today && !since && !_isWeekendIso(iso)) since = iso;
    }
    if (since) out[key] = since;
  });
  return out;
}

// Weekend days only: outstanding missed daily checks carried every other day
// after the first miss, and always onto today.
function _dailyCarriedFor(iso, missedMap, today) {
  if (iso > today || !_isWeekendIso(iso)) return [];
  var day = new Date(iso + 'T00:00:00');
  var out = [];
  DAILY_CHECKS.forEach(function(d) {
    var since = missedMap[d.category + '|' + d.machine];
    if (!since) return;
    var daysLater = Math.round((day - new Date(since + 'T00:00:00')) / 86400000);
    if (daysLater <= 0 || (daysLater % 2 !== 0 && iso !== today)) return;
    out.push({ id: '', daily: true, carried: true, category: d.category, machine: d.machine, scheduled_date: since, completed: false });
  });
  return out;
}

// Resolves to { 'YYYY-MM-DD|category|machine': true } for every finished
// daily-check machine check saved from startIso to endIso (inclusive), and
// every day a machine was marked not in use (see markNotInUse) — a machine
// that wasn't used that day didn't need its daily check.
function _fetchDailyDone(startIso, endIso) {
  var from = new Date(startIso + 'T00:00:00').toISOString();
  var e = new Date(endIso + 'T00:00:00');
  var to = new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1).toISOString();
  var cats = {};
  DAILY_CHECKS.forEach(function(d) { cats[d.category] = 1; });
  return Promise.all(Object.keys(cats).map(function(cat) {
    return fetch(SUPA_URL + '/rest/v1/' + CHECK_CATEGORIES[cat].table + '?select=machine,created_at&overall_rating=not.is.null'
      + '&created_at=gte.' + encodeURIComponent(from) + '&created_at=lt.' + encodeURIComponent(to), {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
    })
    .then(function(r){ return r.json(); })
    .then(function(rows) {
      return (Array.isArray(rows) ? rows : []).map(function(r) {
        return _isoDate(new Date(r.created_at)) + '|' + cat + '|' + r.machine;
      });
    })
    .catch(function() { return []; });
  }).concat([
    fetch(SUPA_URL + '/rest/v1/todays_checks?select=category,machine,scheduled_date&not_in_use=is.true'
      + '&scheduled_date=gte.' + startIso + '&scheduled_date=lte.' + endIso, {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
    })
    .then(function(r){ return r.json(); })
    .then(function(rows) {
      return (Array.isArray(rows) ? rows : []).map(function(r) {
        return r.scheduled_date + '|' + r.category + '|' + r.machine;
      });
    })
    .catch(function() { return []; })
  ])).then(function(lists) {
    var done = {};
    lists.forEach(function(l) { l.forEach(function(k) { done[k] = true; }); });
    return done;
  });
}

// The daily checks due on iso, shaped like todays_checks rows (id '' — Start
// falls back to ticking off any matching booking). bookedMap holds
// 'category|machine' for that day's manager bookings. Today's also carry
// missedSince when an earlier day's check for that machine is outstanding.
function _dailyFor(iso, bookedMap, doneMap, missedMap, today) {
  if (iso < DAILY_CHECKS_FROM || _isWeekendIso(iso)) return [];
  return DAILY_CHECKS.filter(function(d) { return !bookedMap[d.category + '|' + d.machine]; })
    .map(function(d) {
      var key = d.category + '|' + d.machine;
      var done = !!doneMap[iso + '|' + key];
      return { id: '', daily: true, category: d.category, machine: d.machine, scheduled_date: iso, completed: done,
               missedSince: (iso === today && !done && missedMap[key]) || null };
    });
}

// ── CHECKS NOTIFICATION BADGE — shown on the Checks row on the Welcome
// screen so employees see at a glance how many checks are outstanding,
// without having to open the calendar first. Counts every check booked up
// to today that isn't done yet — it stays up until each one is saved,
// matching the calendar, where undone checks carry over until completed.
// Today's daily checks (DAILY_CHECKS) count too until each is saved, and at
// weekends any missed one still outstanding. ──
function refreshChecksBadge() {
  var badge = document.getElementById('checksTileBadge');
  if (!badge) return;
  var today = _isoDate(new Date());
  var hdrs = { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() } };
  Promise.all([
    fetch(SUPA_URL + '/rest/v1/todays_checks?select=id,completed&completed=is.false&scheduled_date=lte.' + today, hdrs).then(function(r){ return r.json(); }),
    fetch(SUPA_URL + '/rest/v1/todays_checks?select=category,machine&scheduled_date=eq.' + today, hdrs).then(function(r){ return r.json(); }),
    _fetchDailyDone(_dailyLookbackStart(today), today)
  ])
  .then(function(res) {
    var rows = res[0], booked = {};
    (Array.isArray(res[1]) ? res[1] : []).forEach(function(r) { booked[r.category + '|' + r.machine] = 1; });
    var missed = _dailyMissedSince(res[2], today);
    var dailyLeft = _dailyFor(today, booked, res[2], missed, today).concat(_dailyCarriedFor(today, missed, today))
      .filter(function(it) { return !it.completed; }).length;
    var outstanding = (Array.isArray(rows) ? rows : []).filter(function(r){ return !r.completed; }).length + dailyLeft;
    if (outstanding > 0) {
      badge.textContent = outstanding + (outstanding === 1 ? ' check' : ' checks') + ' to do';
      badge.style.display = '';
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
var _scheduleDailyDone = {};   // see _fetchDailyDone
var _scheduleDailyMissed = {}; // see _dailyMissedSince

// That day's daily checks plus, at weekends, any missed one carried onto it
function _scheduleDailyFor(iso) {
  var today = _isoDate(new Date());
  var booked = {};
  (_scheduleData[iso] || []).forEach(function(r) { booked[r.category + '|' + r.machine] = 1; });
  return _dailyFor(iso, booked, _scheduleDailyDone, _scheduleDailyMissed, today)
    .concat(_dailyCarriedFor(iso, _scheduleDailyMissed, today));
}

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

// A booked check that hasn't been done yet shows again every other day after
// it was booked (Mon -> Wed, Fri, Sun, ...), up to today, until it's saved —
// so it stays in front of whoever opens the calendar however late it gets.
// Today always shows every one still not done, whatever day it was booked,
// so it matches the "N checks to do" badge.
function _carriedOverFor(iso) {
  var todayIso = _isoDate(new Date());
  if (iso > todayIso) return [];
  var day = new Date(iso + 'T00:00:00');
  var out = [];
  Object.keys(_scheduleData).forEach(function(k) {
    var daysLater = Math.round((day - new Date(k + 'T00:00:00')) / 86400000);
    if (daysLater <= 0 || (daysLater % 2 !== 0 && iso !== todayIso)) return;
    _scheduleData[k].forEach(function(r) { if (!r.completed) out.push(r); });
  });
  out.sort(function(a, b) { return a.scheduled_date.localeCompare(b.scheduled_date); });
  return out;
}

function _overdueFromLabel(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'});
}

function fetchScheduleData() {
  var start = _isoDate(_scheduleWeekStart);
  var endDate = new Date(_scheduleWeekStart.getFullYear(), _scheduleWeekStart.getMonth(), _scheduleWeekStart.getDate() + 27);
  var end = _isoDate(endDate);
  // Everything in the visible 4 weeks, plus any older booking still not done
  // so it can carry over into them (see _carriedOverFor). Daily-check
  // history also goes back far enough to find any miss still outstanding.
  var today = _isoDate(new Date());
  var lookback = _dailyLookbackStart(today);
  Promise.all([
    fetch(SUPA_URL + '/rest/v1/todays_checks?or=(scheduled_date.gte.' + start + ',completed.is.false)&scheduled_date=lte.' + end + '&order=scheduled_date.asc', {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
    }).then(function(r){ return r.json(); }),
    _fetchDailyDone(start < lookback ? start : lookback, end > today ? end : today)
  ])
  .then(function(res) {
    var rows = res[0];
    _scheduleDailyDone = res[1];
    _scheduleDailyMissed = _dailyMissedSince(res[1], today);
    _scheduleData = {};
    (Array.isArray(rows) ? rows : []).forEach(function(r) {
      if (!_scheduleData[r.scheduled_date]) _scheduleData[r.scheduled_date] = [];
      _scheduleData[r.scheduled_date].push(r);
    });
    renderScheduleGrid();
    var modal = document.getElementById('scheduleModal');
    if (modal && modal.style.display === 'flex') renderScheduleModalList();
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
  if (prevBtn) prevBtn.style.display = managerUnlocked ? '' : 'none';
  if (nextBtn) nextBtn.style.display = managerUnlocked ? '' : 'none';
  if (hint) hint.style.display = managerUnlocked ? 'none' : '';
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
    var carried = _carriedOverFor(iso);
    var daily = _scheduleDailyFor(iso);
    var total = items.length + daily.length + carried.length;
    var isToday = iso === today;
    var weekdayShort = d.toLocaleDateString('en-GB',{weekday:'short'});
    html += '<div class="sched-day-cell" style="background:' + (isToday ? '#eef7e2' : '#fafaf8') + ';border-radius:6px;min-height:120px;padding:8px;display:flex;flex-direction:column;gap:6px;' + (isToday ? 'box-shadow:0 0 0 2px var(--green) inset;' : '') + '">'
      + '<div class="sched-day-date" style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:14px;color:var(--mid);"><span class="sched-day-weekday" style="display:none;">' + weekdayShort + ' </span>' + d.getDate() + '</div>'
      + '<div class="sched-day-pills" style="display:flex;flex-direction:column;gap:4px;flex:1;">'
      + items.concat(daily, carried).slice(0, 6).map(function(it) {
          var meta = checksCategoryMeta(it.category);
          var isCarried = it.scheduled_date !== iso;
          var isMissed = it.daily && !it.carried && !it.completed && iso < today;
          if (it.missedSince) isCarried = true; // today's daily check, overdue from an earlier day
          var mark = it.not_in_use ? '&#9208; ' : it.completed ? '&#10003; ' : isMissed ? '&#10007; ' : isCarried ? '&#8635; ' : '';
          var bg = it.not_in_use ? '#ececea' : it.completed ? '#d7ecc9' : isMissed ? '#f6dede' : isCarried ? '#fdf0d5' : '#e8f2e3';
          var fg = it.not_in_use ? '#55554d' : isMissed ? '#8a1c1c' : isCarried ? '#7a4d00' : '#2d5a1b';
          return '<div style="font-size:11px;font-weight:700;padding:4px 6px;border-radius:3px;background:' + bg + ';color:' + fg + ';line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + mark + meta.icon + ' ' + (it.machine || '') + '</div>';
        }).join('')
      + '</div>'
      + '<button class="sched-day-action" onclick="openScheduleDayModal(\'' + iso + '\')" style="margin-top:auto;background:none;border:1.5px dashed var(--border);color:var(--mid);font-size:10.5px;font-weight:700;border-radius:4px;padding:5px;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;">' + (total === 0 ? (managerUnlocked ? '+ Add' : 'Nothing') : 'View (' + total + ') ›') + '</button>'
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
  var items = (_scheduleData[_scheduleModalDate] || []).concat(_scheduleDailyFor(_scheduleModalDate), _carriedOverFor(_scheduleModalDate));
  var today = _isoDate(new Date());
  if (!items.length) {
    wrap.innerHTML = '<div style="color:#9a9a90;font-size:12.5px;padding:14px 0;text-align:center;">Nothing scheduled for this day.</div>';
    return;
  }
  wrap.innerHTML = items.map(function(it) {
    var meta = checksCategoryMeta(it.category);
    var machineEsc = (it.machine || '').replace(/'/g, "\\'");
    var doneBadge = it.not_in_use
      ? '<span style="font-size:10.5px;font-weight:800;color:#55554d;background:#ececea;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;">&#9208; Not in use</span>'
      : '<span style="font-size:10.5px;font-weight:800;color:#2d5a1b;background:#e8f2e3;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;">&#10003; Completed</span>';
    var notInUseBtn = '<button onclick="markNotInUse(\'' + it.category + '\',\'' + (it.id || '') + '\',\'' + machineEsc + '\')" style="background:none;border:1.5px solid #b8b8ae;color:#55554d;padding:5px 9px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;white-space:nowrap;">Not in use</button>';
    var isCarried = it.scheduled_date !== _scheduleModalDate;
    var overdueTag = isCarried ? '<div style="font-size:10.5px;font-weight:700;color:#7a4d00;margin-top:2px;">&#8635; Not done yet — booked ' + _overdueFromLabel(it.scheduled_date) + '</div>' : '';
    var actionHtml;
    if (it.daily) {
      // Automatic — nothing to remove; only today's can be started
      var since = it.carried ? it.scheduled_date : it.missedSince;
      overdueTag = since
        ? '<div style="font-size:10.5px;font-weight:700;color:#7a4d00;margin-top:2px;">&#8635; Daily check not done since ' + _overdueFromLabel(since) + '</div>'
        : '<div style="font-size:10.5px;font-weight:700;color:#8a8a7a;margin-top:2px;">Daily check (Mon–Fri)</div>';
      if (it.completed) actionHtml = doneBadge;
      else if (_scheduleModalDate < today && !it.carried) actionHtml = '<span style="font-size:10.5px;font-weight:800;color:#8a1c1c;background:#f6dede;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;">&#10007; Missed</span>';
      else if (_scheduleModalDate === today && !managerUnlocked) actionHtml = notInUseBtn + '<button onclick="startScheduledCheck(\'' + it.category + '\',\'\',\'' + machineEsc + '\')" style="background:var(--lime);border:none;color:#1a3210;padding:6px 12px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;white-space:nowrap;">Start &#8594;</button>';
      else actionHtml = '';
    } else if (managerUnlocked && isCarried) {
      // Remove it from the day it was booked on, not from a carried-over copy
      actionHtml = '';
    } else if (managerUnlocked) {
      actionHtml = (it.completed ? doneBadge : '')
        + '<button onclick="removeScheduledCheck(\'' + it.id + '\')" style="background:none;border:none;color:#a02020;font-size:16px;cursor:pointer;padding:2px 8px;" aria-label="Remove">&#10005;</button>';
    } else {
      actionHtml = it.completed
        ? doneBadge
        : (_scheduleModalDate <= today ? notInUseBtn : '') + '<button onclick="startScheduledCheck(\'' + it.category + '\',\'' + it.id + '\',\'' + machineEsc + '\')" style="background:var(--lime);border:none;color:#1a3210;padding:6px 12px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;white-space:nowrap;">Start &#8594;</button>';
    }
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e0e0d8;font-size:12.5px;">'
      + '<span style="font-size:16px;">' + meta.icon + '</span>'
      + '<span style="flex:1;">' + meta.label + ' — ' + (it.machine || '') + overdueTag + '</span>'
      + actionHtml
      + '</div>';
  }).join('');
}

// ── NOT IN USE — tapped instead of Start when a machine isn't being used.
// A booking is flagged in place; a daily check gets a row of its own for
// today, which takes its place like a manager booking would. Either way it's
// a completed todays_checks row with not_in_use set, so it drops off the list
// and the badge, covers that day's daily check, and is listed for managers
// in the Weekly Report. ──
function markNotInUse(cat, id, machine) {
  var meta = checksCategoryMeta(cat);
  if (!confirm(meta.label + ' — ' + machine + '\n\nMark as not in use today? It will come off the list and the office will see it wasn\'t used.')) return;
  var headers = {'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken(),'Prefer':'return=minimal'};
  var flags = { completed: true, not_in_use: true, not_in_use_at: new Date().toISOString() };
  var req = id
    ? fetch(SUPA_URL + '/rest/v1/todays_checks?id=eq.' + id, { method: 'PATCH', headers: headers, body: JSON.stringify(flags) })
    : fetch(SUPA_URL + '/rest/v1/todays_checks', { method: 'POST', headers: headers,
        body: JSON.stringify(Object.assign({ category: cat, machine: machine, scheduled_date: _isoDate(new Date()) }, flags)) });
  req.then(function(r) {
    if (!r.ok) throw new Error('not in use failed');
    fetchScheduleData();
    refreshChecksBadge();
  })
  .catch(function() { alert('Could not mark as not in use — check connection and try again.'); });
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
var _weeklyReportFilter = 'all';   // 'all', 'vehicle', a category key, or a group key

// One choice per tile on the Checks home — grouped kits (Rigging / Climbing)
// report together, with the breakdown split by kit.
function _weeklyReportOptions() {
  var opts = [{ key: 'all', label: 'All checks' }, { key: 'vehicle', label: 'Vehicle Checks' }];
  var seenGroups = {};
  Object.keys(CHECK_CATEGORIES).forEach(function(k) {
    var g = CHECK_CATEGORIES[k].group;
    if (g) {
      if (seenGroups[g]) return;
      seenGroups[g] = 1;
      opts.push({ key: g, label: (CHECK_GROUPS[g] && CHECK_GROUPS[g].label) || g });
    } else {
      opts.push({ key: k, label: CHECK_CATEGORIES[k].label });
    }
  });
  return opts;
}

function setWeeklyReportFilter(key) {
  _weeklyReportFilter = key || 'all';
  fetchWeeklyReportData();
}

function openWeeklyReportView() {
  if (!_weeklyReportWeekStart) _weeklyReportWeekStart = _mondayOf(new Date());
  var sel = document.getElementById('weeklyReportCatSel');
  if (sel) {
    sel.innerHTML = _weeklyReportOptions().map(function(o) {
      return '<option value="' + o.key + '"' + (o.key === _weeklyReportFilter ? ' selected' : '') + '>' + o.label + '</option>';
    }).join('');
  }
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
  var f = _weeklyReportFilter;
  if (f === 'all') return list;
  return list.filter(function(t) {
    if (f === 'vehicle') return t.kind === 'vehicle';
    return t.cat === f || (t.cat && CHECK_CATEGORIES[t.cat].group === f);
  });
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

  // Machines marked not in use this week (see markNotInUse), narrowed to the
  // same tables as the rest of the report
  var cats = {};
  tables.forEach(function(t) { cats[t.cat || t.kind] = 1; });
  var notInUseReq = fetch(SUPA_URL + '/rest/v1/todays_checks?select=category,machine,scheduled_date,not_in_use_at&not_in_use=is.true'
    + '&not_in_use_at=gte.' + startIso + '&not_in_use_at=lt.' + endIso + '&order=not_in_use_at.desc', {
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
  })
  .then(function(r){ return r.json(); })
  .then(function(rows) { return (Array.isArray(rows) ? rows : []).filter(function(r) { return cats[r.category]; }); })
  .catch(function() { return []; });

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
  }).concat([notInUseReq])).then(function(results) {
    var notInUse = results.pop();
    var all = [].concat.apply([], results);
    all.sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); });
    renderWeeklyReport(all, tables, notInUse);
  });
}

// Ratings are stored as the button text (e.g. "✅ ExcellentNo areas of
// non-compliance"), so match by substring — check 'unsatisfactory' before
// 'satisfactory' since one contains the other.
function _ratingWord(rating) {
  var r = (rating || '').toLowerCase();
  if (r.indexOf('unsatisfactory') !== -1) return 'Unsatisfactory';
  if (r.indexOf('satisfactory') !== -1) return 'Satisfactory';
  if (r.indexOf('excellent') !== -1) return 'Excellent';
  return rating || '';
}

var _weeklyReportLast = null; // what's on screen, for Download Excel

function renderWeeklyReport(entries, tables, notInUse) {
  var bodyEl = document.getElementById('weeklyReportBody');
  if (!bodyEl) return;

  // Started-but-never-submitted checks (no overall rating) aren't completed
  // checks — leave them out of every figure and just say how many there are.
  var unfinished = entries.filter(function(e) { return !e.rating; });
  entries = entries.filter(function(e) { return !!e.rating; });

  var counts = { total: entries.length, excellent: 0, satisfactory: 0, unsatisfactory: 0, defects: 0 };
  entries.forEach(function(e) {
    var w = _ratingWord(e.rating);
    if (w === 'Unsatisfactory') counts.unsatisfactory++;
    else if (w === 'Satisfactory') counts.satisfactory++;
    else if (w === 'Excellent') counts.excellent++;
    if (e.hasDefect) counts.defects++;
  });

  // One category picked: break it down by machine/vehicle instead of by category
  var bars;
  if (tables.length === 1) {
    var byName = {};
    entries.forEach(function(e) { var n = e.name || 'Unknown'; byName[n] = (byName[n] || 0) + 1; });
    bars = Object.keys(byName).sort().map(function(n) { return { label: n, count: byName[n] }; });
  } else {
    var byCat = {};
    entries.forEach(function(e) { var k = e.cat || e.kind; byCat[k] = (byCat[k] || 0) + 1; });
    var inGroup = _weeklyReportFilter !== 'all';
    bars = tables.map(function(t) {
      var cfg = t.cat ? CHECK_CATEGORIES[t.cat] : null;
      var label = inGroup && cfg ? (cfg.subLabel ? cfg.shortLabel + ' – ' + cfg.subLabel : cfg.shortLabel || t.label) : t.label;
      return { label: label, count: byCat[t.cat || t.kind] || 0 };
    });
  }
  var maxCatCount = Math.max.apply(null, bars.map(function(b){ return b.count; }).concat([1]));

  var statHtml = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">'
    + '<div style="background:white;border-radius:7px;padding:14px;text-align:center;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:28px;color:var(--green);">' + counts.total + '</div><div style="font-size:11px;color:#8a8a7a;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;">Checks completed</div></div>'
    + '<div style="background:white;border-radius:7px;padding:14px;text-align:center;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:28px;color:var(--green);">' + counts.excellent + '</div><div style="font-size:11px;color:#8a8a7a;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;">Excellent</div></div>'
    + '<div style="background:white;border-radius:7px;padding:14px;text-align:center;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:28px;color:#e6a817;">' + counts.satisfactory + '</div><div style="font-size:11px;color:#8a8a7a;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;">Satisfactory</div></div>'
    + '<div style="background:white;border-radius:7px;padding:14px;text-align:center;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:28px;color:#c62828;">' + counts.defects + '</div><div style="font-size:11px;color:#8a8a7a;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;">Defects logged</div></div>'
    + '</div>'
    + (unfinished.length
      ? '<div style="background:rgba(255,255,255,.1);border-radius:7px;padding:10px 14px;margin-bottom:16px;font-size:12.5px;color:rgba(255,255,255,.8);">&#9203; ' + unfinished.length + ' started but not finished (not counted): '
        + unfinished.map(function(e) { return e.label + ' — ' + (e.name || 'Unknown') + (e.inspector ? ' (' + e.inspector + ')' : ''); }).join(', ') + '</div>'
      : '');

  var barsHtml = bars.map(function(b) {
    var c = b.count;
    if (!c) return '';
    var pct = Math.round((c / maxCatCount) * 100);
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;font-size:12.5px;">'
      + '<div style="width:120px;flex-shrink:0;color:var(--mid);">' + b.label + '</div>'
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

  var notInUseHtml = notInUse.length
    ? '<ul style="list-style:none;margin:0;padding:0;">' + notInUse.map(function(n) {
        var dateStr = new Date(n.not_in_use_at).toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'});
        return '<li style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;">'
          + '<span style="font-weight:600;color:#333;">' + checksCategoryMeta(n.category).icon + ' ' + checksCategoryMeta(n.category).label + ' — ' + (n.machine || '') + '</span>'
          + '<span style="color:#8a8a7a;font-size:11.5px;white-space:nowrap;">' + dateStr + '</span>'
          + '</li>';
      }).join('') + '</ul>'
    : '<div style="color:#9a9a90;font-size:12.5px;padding:14px 0;text-align:center;">No machines marked not in use this week.</div>';

  _weeklyReportLast = { entries: entries, unfinished: unfinished, counts: counts, bars: bars, notInUse: notInUse };

  bodyEl.innerHTML = '<div style="display:flex;justify-content:flex-end;margin-bottom:12px;">'
    + '<button onclick="downloadWeeklyReportExcel()" style="background:#1d6f42;border:none;color:white;padding:7px 14px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;">&#128202; Download Excel</button>'
    + '</div>'
    + statHtml
    + '<div style="background:white;border-radius:8px;padding:16px;margin-bottom:16px;">' + (barsHtml || '<div style="color:#9a9a90;font-size:12.5px;text-align:center;padding:10px 0;">Nothing to break down yet.</div>') + '</div>'
    + '<div style="background:#1a3210;padding:10px 16px;border-radius:8px 8px 0 0;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:var(--lime);text-transform:uppercase;letter-spacing:1px;">Individual Reports</div>'
    + '<div style="background:white;border-radius:0 0 8px 8px;padding:6px 16px 16px;">' + reportListHtml + '</div>'
    + '<div style="background:#1a3210;padding:10px 16px;border-radius:8px 8px 0 0;margin-top:16px;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:var(--lime);text-transform:uppercase;letter-spacing:1px;">&#9208; Machines Not In Use</div>'
    + '<div style="background:white;border-radius:0 0 8px 8px;padding:6px 16px 16px;">' + notInUseHtml + '</div>';
}

// Two sheets: Summary (the figures and breakdown on screen) and Checks (one
// row per completed check, then any started but not finished).
function downloadWeeklyReportExcel() {
  if (typeof XLSX === 'undefined') { _withXlsx(downloadWeeklyReportExcel); return; }
  var r = _weeklyReportLast;
  if (!r) return;
  var opt = _weeklyReportOptions().filter(function(o) { return o.key === _weeklyReportFilter; })[0];
  var catLabel = opt ? opt.label : 'All checks';
  var rangeEl = document.getElementById('weeklyReportRange');
  var range = rangeEl ? rangeEl.textContent : '';
  var single = _weeklyReportTables().length === 1;

  var summary = [
    ['Weekly Report — ' + catLabel], ['Week', range], [],
    ['Checks completed', r.counts.total],
    ['Excellent', r.counts.excellent],
    ['Satisfactory', r.counts.satisfactory],
    ['Unsatisfactory', r.counts.unsatisfactory],
    ['Defects logged', r.counts.defects],
    ['Started but not finished', r.unfinished.length],
    [], [single ? 'Machine / vehicle' : 'Category', 'Checks']
  ];
  r.bars.forEach(function(b) { if (b.count) summary.push([b.label, b.count]); });

  function row(e, rating) {
    var d = e.createdAt ? new Date(e.createdAt) : null;
    return [
      d ? d.toLocaleDateString('en-GB') : '', d ? d.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) : '',
      e.label, e.name, e.inspector, rating, e.hasDefect ? 'Yes' : 'No'
    ];
  }
  var checks = [['Date', 'Time', 'Category', 'Machine / vehicle', 'Inspector', 'Rating', 'Defect']];
  r.entries.forEach(function(e) { checks.push(row(e, _ratingWord(e.rating))); });
  r.unfinished.forEach(function(e) { checks.push(row(e, 'Not finished')); });

  var wb = XLSX.utils.book_new();
  var ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1['!cols'] = [{ wch: 34 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
  var ws2 = XLSX.utils.aoa_to_sheet(checks);
  ws2['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 32 }, { wch: 32 }, { wch: 20 }, { wch: 16 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Checks');
  var unused = [['Date', 'Category', 'Machine / vehicle']];
  r.notInUse.forEach(function(n) {
    unused.push([new Date(n.not_in_use_at).toLocaleDateString('en-GB'), checksCategoryMeta(n.category).label, n.machine || '']);
  });
  var ws3 = XLSX.utils.aoa_to_sheet(unused);
  ws3['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Not in use');
  var weekOf = _weeklyReportWeekStart ? _isoDate(_weeklyReportWeekStart) : '';
  XLSX.writeFile(wb, 'Weekly_Report_' + safeFileSegment(catLabel) + '_' + weekOf + '.xlsx');
}

