// 'YYYY-MM-DD' in local time (not UTC — toISOString() would shift the date
// near midnight for any timezone ahead of UTC, e.g. British Summer Time)
function _isoDate(d) {
  var m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

var CHECK_GROUP_ICONS = { handtools: '🔧', climbingkit: '🧗', riggingkit: '⛩️' };

function checksCategoryMeta(key) {
  if (key === 'vehicle') return { label: 'Vehicle Checks', icon: '🚗' };
  var cfg = CHECK_CATEGORIES[key];
  if (cfg) return { label: cfg.label, icon: cfg.icon };
  if (CHECK_GROUPS[key]) return { label: CHECK_GROUPS[key].label, icon: CHECK_GROUP_ICONS[key] || '🔧' };
  return { label: key, icon: '❓' };
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

// cat can also be a group (e.g. 'climbingkit' for the weekly "Climbing Kits"
// check) — that opens the group's picker so the right kit can be chosen.
function startScheduledCheck(cat, id, machine) {
  closeScheduleModal();
  switchChecksTab(cat);
  if (CHECK_GROUPS[cat]) return;
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

// A saved check ticks off every matching outstanding booking from this week
// up to today — same category, and the same machine unless the category has
// only one asset (hideMachine kits, whose scheduled name may predate a
// rename). Bookings from earlier weeks stay missed (see _bookingMissed).
function _completeMatchingScheduled(category, machine) {
  var cfg = CHECK_CATEGORIES[category];
  var q = 'todays_checks?category=eq.' + encodeURIComponent(category)
    + '&completed=not.is.true&scheduled_date=lte.' + _isoDate(new Date())
    + '&scheduled_date=gte.' + _isoDate(_mondayOf(new Date()));
  if (!(cfg && cfg.hideMachine)) {
    if (!machine) return;
    q += '&machine=eq.' + encodeURIComponent(machine);
  }
  fetch(SUPA_URL + '/rest/v1/' + q, {
    method: 'PATCH',
    headers: {'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken(),'Prefer':'return=minimal'},
    body: JSON.stringify({ completed: true })
  }).catch(function(){});
}

// After a check is submitted: the booking it was started from (if any), plus
// any other outstanding booking for the same machine
function _completeScheduledFor(category, machine) {
  if (_activeScheduledCheckId) { _markScheduledComplete(_activeScheduledCheckId); _activeScheduledCheckId = null; }
  _completeMatchingScheduled(category, machine);
}

// ── DAILY CHECKS — the five plant machines need a pre-use check every
// weekday (Mon–Fri) without anyone booking it. They aren't stored as
// todays_checks rows: a day's daily check counts as done when a finished
// check (one with an overall rating) was saved for that machine that day, or
// it was marked not in use that day. One not done by the end of its day is
// missed — it doesn't carry over. A manager booking for the same machine on
// the same day takes its place. ──
var DAILY_CHECKS = [
  { category: 'digger',  machine: 'KX027-4' },
  { category: 'digger',  machine: 'Volvo ECR145E' },
  { category: 'climber', machine: 'MDB LV 800 Green Climber' },
  { category: 'stump',   machine: 'FSI D74' },
  { category: 'mewp',    machine: 'Hinowa MEWP' }
];
var DAILY_CHECKS_FROM = '2026-10-23'; // first day they were due — nothing missed before it

// ── WEEKLY SCHEDULE — from the Vehicle & Equipment Check Schedule
// spreadsheet. Each item is due once in its week (Mon–Fri) and counts as done
// when a finished check for a matching machine is saved that week (any day
// Mon–Sun), or it's marked not in use that week. Not done by the end of
// Friday it's missed, and it doesn't carry over into the next week.
// Weeks are numbered by the date of their Monday: 1st–7th is week 1, 8th–14th
// week 2, 15th–21st week 3, 22nd–28th week 4, 29th–31st week 5 (weekly
// items only). Plant & machinery aren't listed — their daily pre-use checks
// (DAILY_CHECKS) cover the weekly check.
//   cat     — category the check is started / marked not in use under (a
//             group key such as 'climbingkit' opens that group's picker)
//   machine — pre-filled on the form ('' = the inspector picks one)
//   sources — [{cat, match}] a finished check in that category whose machine
//             contains any match text (case-insensitive; '' = any) counts,
//             or [{cat, exact}] only a check of exactly that machine counts.
// Small tools and kits are listed one per saw / kit / blower, so each
// person's has to be checked. ──
var WEEKLY_CHECKS_FROM = '2026-11-30'; // first week scheduled — nothing missed before it
var _EVERY_WEEK = [1, 2, 3, 4, 5], _WEEKS_1_3 = [1, 3], _WEEKS_2_4 = [2, 4];
function _weekly(section, label, weeks, cat, machine, sources) {
  return { section: section, label: label, weeks: weeks, cat: cat, machine: machine, sources: sources,
           freq: weeks === _EVERY_WEEK ? 'Every week' : weeks === _WEEKS_1_3 ? 'Weeks 1 & 3' : 'Weeks 2 & 4' };
}
function _veh(label, option, matches) { return _weekly('Vehicles', label, _EVERY_WEEK, 'vehicle', option, [{ cat: 'vehicle', match: matches }]); }
function _trl(label) { return _weekly('Trailers', label, _WEEKS_1_3, 'trailer', label, [{ cat: 'trailer', match: [label] }]); }
// One item per machine in cat — ticked off only by a check of that exact one
function _each(section, cat, machines, labelOf) {
  return machines.map(function(m) {
    return _weekly(section, labelOf ? labelOf(m) : m, _WEEKS_2_4, cat, m, [{ cat: cat, exact: m }]);
  });
}
// Every chainsaw as its own item, taken from the chainsaw list so new saws
// join automatically
function _saws() {
  return _each('Chainsaws', 'chainsaw', CHECK_CATEGORIES.chainsaw.machines);
}
// Every kit in a group (each climber's climbing kit, each rigging kit)
function _kits(section, group) {
  return [].concat.apply([], Object.keys(CHECK_CATEGORIES).filter(function(k) { return CHECK_CATEGORIES[k].group === group; })
    .map(function(k) { return _each(section, k, CHECK_CATEGORIES[k].machines); }));
}
var WEEKLY_CHECKS = [
  _veh('Maxus RV25 MJU', 'Maxus — Utility Pickup (Joe)', ['RV25 MJU', 'Maxus — Utility']),
  _veh('Maxus NU73 ZYU', 'NU73 ZYU — Electric', ['NU73 ZYU']),
  _veh('Transit MW26 OBZ', 'MW26 0BZ — Transit (New)', ['MW26 0BZ', 'MW26 OBZ']),
  _veh('Transit MT74 KNK', 'MT74 KNK — Transit (Luke)', ['MT74 KNK']),
  _veh('Transit MV72 CEA', 'MV72 CEA — Transit (Jack)', ['MV72 CEA']),
  _veh('Isuzu D-Max YK69 PNO', 'YK69 PNO — Dmax (Liam)', ['YK69 PNO']),
  _veh('Toyota Hilux YR71 LLO', 'YR71 LLO — Hilux (Dave)', ['YR71 LLO']),
  _weekly('Woodchippers', 'Först TR8 (New)', _EVERY_WEEK, 'chipper', 'Forst - TR8 (New)', [{ cat: 'chipper', match: ['TR8 (New)'] }]),
  _weekly('Woodchippers', 'Först TR8 (Old)', _EVERY_WEEK, 'chipper', 'Forst - TR8 (Old)', [{ cat: 'chipper', match: ['TR8 (Old)'] }]),
  _weekly('Woodchippers', 'Först ST6P', _EVERY_WEEK, 'chipper', 'Forst - ST6P', [{ cat: 'chipper', match: ['ST6P'] }]),
  _trl('Ifor Williams GH94 – Stump Grinder Trailer'),
  _trl('Ifor Williams GH94 – New TR8 Trailer'),
  _trl('Ifor Williams GH94 – Old TR8 Trailer'),
  _trl('Towmate MEWP Trailer'),
  _trl('Brian James – Digger Trailer'),
  _trl('Ifor Williams – Cage Trailer'),
  _trl('Ifor Williams – LV800 Trailer'),
].concat(
  _saws(),
  _each('Hand Held Tools', 'handheld', ['Hedgetrimmer', 'Brushcutter', 'Blower']),
  _each('Hand Held Tools', 'backpackblower', CHECK_CATEGORIES.backpackblower.machines),
  _each('Hand Held Tools', 'polesaw', CHECK_CATEGORIES.polesaw.machines),
  _kits('Climbing Kits', 'climbingkit'),
  _kits('Rigging Kits', 'riggingkit')
);

function _addDaysIso(iso, n) {
  var d = new Date(iso + 'T00:00:00');
  return _isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

function _isWeekendIso(iso) {
  var dow = new Date(iso + 'T00:00:00').getDay();
  return dow === 0 || dow === 6;
}

function _mondayIsoOf(iso) { return _isoDate(_mondayOf(new Date(iso + 'T00:00:00'))); }

function _weekOfMonth(mondayIso) { return Math.ceil(new Date(mondayIso + 'T00:00:00').getDate() / 7); }

// A booking not done by the Friday of its week (or by its own day, if it was
// booked for a weekend) is missed, and stops counting as outstanding.
function _bookingMissed(scheduledIso, today) {
  var fri = _addDaysIso(_mondayIsoOf(scheduledIso), 4);
  return (scheduledIso > fri ? scheduledIso : fri) < today;
}

// A daily or weekly check marked not in use is stored as a todays_checks row
// (a weekly one named after the schedule item) — it's shown on the daily or
// weekly item itself, not as a booking of its own.
function _isAutoNotInUseRow(r) {
  if (!r.not_in_use) return false;
  return WEEKLY_CHECKS.some(function(w) { return w.cat === r.category && w.label === r.machine; })
    || DAILY_CHECKS.some(function(d) { return d.category === r.category && d.machine === r.machine; });
}

function _checkSource(cat) {
  if (cat === 'vehicle') return { table: 'vehicle_checks', field: 'vehicle' };
  return { table: CHECK_CATEGORIES[cat].table, field: 'machine' };
}

// Every category the daily and weekly schedules look at
function _scheduleCats() {
  var cats = {};
  DAILY_CHECKS.forEach(function(d) { cats[d.category] = 1; });
  WEEKLY_CHECKS.forEach(function(w) { w.sources.forEach(function(s) { cats[s.cat] = 1; }); });
  return Object.keys(cats);
}

// Resolves to { rows, niu, done } for startIso..endIso (inclusive):
//   rows — every finished check saved: { cat, machine, iso }
//   niu  — every todays_checks row marked not in use
//   done — { 'YYYY-MM-DD|category|machine': true } for both, used by the
//          daily checks (a machine not used that day didn't need its check)
function _fetchCheckHistory(startIso, endIso) {
  var from = new Date(startIso + 'T00:00:00').toISOString();
  var e = new Date(endIso + 'T00:00:00');
  var to = new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1).toISOString();
  var hdrs = { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() } };
  var finished = Promise.all(_scheduleCats().map(function(cat) {
    var src = _checkSource(cat);
    return fetch(SUPA_URL + '/rest/v1/' + src.table + '?select=' + src.field + ',created_at&overall_rating=not.is.null'
      + '&created_at=gte.' + encodeURIComponent(from) + '&created_at=lt.' + encodeURIComponent(to), hdrs)
    .then(function(r){ return r.json(); })
    .then(function(rows) {
      return (Array.isArray(rows) ? rows : []).map(function(r) {
        return { cat: cat, machine: r[src.field] || '', iso: _isoDate(new Date(r.created_at)) };
      });
    })
    .catch(function() { return []; });
  }));
  var niu = fetch(SUPA_URL + '/rest/v1/todays_checks?select=category,machine,scheduled_date&not_in_use=is.true'
    + '&scheduled_date=gte.' + startIso + '&scheduled_date=lte.' + endIso, hdrs)
    .then(function(r){ return r.json(); })
    .then(function(rows) { return Array.isArray(rows) ? rows : []; })
    .catch(function() { return []; });
  return Promise.all([finished, niu]).then(function(res) {
    var rows = [].concat.apply([], res[0]), niuRows = res[1], done = {}, niuMap = {};
    rows.forEach(function(r) { done[r.iso + '|' + r.cat + '|' + r.machine] = true; });
    niuRows.forEach(function(r) {
      var k = r.scheduled_date + '|' + r.category + '|' + r.machine;
      done[k] = true; niuMap[k] = true;
    });
    return { rows: rows, niu: niuRows, done: done, niuMap: niuMap };
  });
}

// The daily checks due on iso, shaped like todays_checks rows (id '' — Start
// falls back to ticking off any matching booking). bookedMap holds
// 'category|machine' for that day's manager bookings; hist is from
// _fetchCheckHistory.
function _dailyFor(iso, bookedMap, hist) {
  if (iso < DAILY_CHECKS_FROM || _isWeekendIso(iso)) return [];
  return DAILY_CHECKS.filter(function(d) { return !bookedMap[d.category + '|' + d.machine]; })
    .map(function(d) {
      var k = iso + '|' + d.category + '|' + d.machine;
      return { id: '', daily: true, category: d.category, machine: d.machine, scheduled_date: iso,
               completed: !!hist.done[k], not_in_use: !!(hist.niuMap && hist.niuMap[k]) };
    });
}

// The weekly schedule items due in the week starting mondayIso, each with
// completed / not_in_use / missed worked out from hist (_fetchCheckHistory,
// which must cover that whole week).
function _weeklyFor(mondayIso, hist, today) {
  if (mondayIso < WEEKLY_CHECKS_FROM) return [];
  var wk = _weekOfMonth(mondayIso);
  var sunday = _addDaysIso(mondayIso, 6), friday = _addDaysIso(mondayIso, 4);
  return WEEKLY_CHECKS.filter(function(w) { return w.weeks.indexOf(wk) !== -1; }).map(function(w) {
    var done = hist.rows.some(function(r) {
      if (r.iso < mondayIso || r.iso > sunday) return false;
      var name = r.machine.toLowerCase();
      return w.sources.some(function(s) {
        if (s.cat !== r.cat) return false;
        if (s.exact) return name === s.exact.toLowerCase();
        return s.match.some(function(m) { return !m || name.indexOf(m.toLowerCase()) !== -1; });
      });
    });
    var niu = !done && hist.niu.some(function(n) {
      return n.scheduled_date >= mondayIso && n.scheduled_date <= sunday && n.category === w.cat && n.machine === w.label;
    });
    return { id: '', weekly: true, category: w.cat, machine: w.label, startMachine: w.machine, freq: w.freq, section: w.section,
             scheduled_date: mondayIso, completed: done || niu, not_in_use: niu, missed: !done && !niu && friday < today, weekNo: wk };
  });
}

// Weekly items are listed on their Monday, and on today while it's a weekday
function _showsWeeklyOn(iso, today) {
  if (_isWeekendIso(iso)) return false;
  return iso === _mondayIsoOf(iso) || iso === today;
}

// Everything missed in the week starting mondayIso: daily checks not done on
// their day, weekly items not done by Friday, bookings not done by Friday.
// bookings: that week's todays_checks rows. Used by the Weekly Report.
function _missedForWeek(mondayIso, hist, bookings, today) {
  var out = [];
  bookings = bookings.filter(function(r) { return !_isAutoNotInUseRow(r); });
  for (var i = 0; i < 5; i++) {
    var iso = _addDaysIso(mondayIso, i);
    if (iso >= today) break;
    var booked = {};
    bookings.forEach(function(r) { if (r.scheduled_date === iso) booked[r.category + '|' + r.machine] = 1; });
    _dailyFor(iso, booked, hist).forEach(function(it) {
      if (!it.completed) out.push({ kind: 'Daily pre-use', category: it.category, machine: it.machine, date: iso });
    });
  }
  _weeklyFor(mondayIso, hist, today).forEach(function(it) {
    if (it.missed) out.push({ kind: 'Weekly (' + it.freq + ')', category: it.category, machine: it.machine, date: mondayIso });
  });
  bookings.forEach(function(r) {
    if (!r.completed && _bookingMissed(r.scheduled_date, today)) out.push({ kind: 'Booked', category: r.category, machine: r.machine, date: r.scheduled_date });
  });
  return out;
}

// ── CHECKS NOTIFICATION BADGE — shown on the Checks row on the Welcome
// screen so employees see at a glance how many checks are outstanding,
// without having to open the calendar first. Counts today's daily checks,
// this week's weekly items and bookings not yet done — nothing from an
// earlier week, which is missed rather than outstanding. ──
function refreshChecksBadge() {
  var badge = document.getElementById('checksTileBadge');
  if (!badge) return;
  var today = _isoDate(new Date());
  var monday = _isoDate(_mondayOf(new Date()));
  var hdrs = { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() } };
  Promise.all([
    fetch(SUPA_URL + '/rest/v1/todays_checks?select=id,category,machine,scheduled_date,completed,not_in_use'
      + '&scheduled_date=gte.' + monday + '&scheduled_date=lte.' + today, hdrs).then(function(r){ return r.json(); }),
    _fetchCheckHistory(monday, today)
  ])
  .then(function(res) {
    var rows = (Array.isArray(res[0]) ? res[0] : []).filter(function(r) { return !_isAutoNotInUseRow(r); });
    var hist = res[1], booked = {};
    rows.forEach(function(r) { if (r.scheduled_date === today) booked[r.category + '|' + r.machine] = 1; });
    var outstanding = rows.filter(function(r) { return !r.completed && !_bookingMissed(r.scheduled_date, today); }).length
      + _dailyFor(today, booked, hist).filter(function(it) { return !it.completed; }).length
      + _weeklyFor(monday, hist, today).filter(function(it) { return !it.completed && !it.missed; }).length;
    if (outstanding > 0) {
      badge.textContent = outstanding + (outstanding === 1 ? ' check' : ' checks') + ' to do';
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  })
  .catch(function() { badge.style.display = 'none'; });
}

// ── SCHEDULING CALENDAR — the landing view for the Checks tab. Shows the
// daily and weekly schedule automatically; managers can also book extra
// checks up to 4 weeks ahead (any number of items per day). Every user can
// browse it and tap a day to start whatever's due on it. ──
var _scheduleWeekStart = null; // Date — Monday of the first visible week
var _scheduleData = {};        // 'YYYY-MM-DD' -> array of todays_checks rows (bookings)
var _scheduleModalDate = null;
var _scheduleHist = { rows: [], niu: [], done: {}, niuMap: {} }; // see _fetchCheckHistory

// That day's daily checks
function _scheduleDailyFor(iso) {
  var booked = {};
  (_scheduleData[iso] || []).forEach(function(r) { booked[r.category + '|' + r.machine] = 1; });
  return _dailyFor(iso, booked, _scheduleHist);
}

// The weekly items listed on that day (see _showsWeeklyOn)
function _scheduleWeeklyFor(iso) {
  var today = _isoDate(new Date());
  return _showsWeeklyOn(iso, today) ? _weeklyFor(_mondayIsoOf(iso), _scheduleHist, today) : [];
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

// A booking not done yet also shows on today, while it's still the same week
// — from the next week on it's missed instead (see _bookingMissed).
function _carriedOverFor(iso) {
  var today = _isoDate(new Date());
  if (iso !== today || _isWeekendIso(iso)) return [];
  var monday = _mondayIsoOf(iso);
  var out = [];
  Object.keys(_scheduleData).forEach(function(k) {
    if (k < monday || k >= iso) return;
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
  // History covers the visible 4 weeks plus this week, so today's checks
  // are right even when a manager has paged away from it
  var today = _isoDate(new Date());
  var monday = _isoDate(_mondayOf(new Date()));
  Promise.all([
    fetch(SUPA_URL + '/rest/v1/todays_checks?scheduled_date=gte.' + start + '&scheduled_date=lte.' + end + '&order=scheduled_date.asc', {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
    }).then(function(r){ return r.json(); }),
    _fetchCheckHistory(start < monday ? start : monday, end > today ? end : today)
  ])
  .then(function(res) {
    var rows = res[0];
    _scheduleHist = res[1];
    _scheduleData = {};
    (Array.isArray(rows) ? rows : []).forEach(function(r) {
      if (_isAutoNotInUseRow(r)) return;
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

// Status of a calendar item as shown on day iso — always spelt out in words
// on the calendar and in the day list, not just a symbol.
var SCHEDULE_STATUS = {
  done:    { text: 'Completed',  mark: '&#10003; ', bg: '#d7ecc9', fg: '#2d5a1b' },
  niu:     { text: 'Not in use', mark: '',          bg: '#ececea', fg: '#55554d' },
  missed:  { text: 'Missed',     mark: '&#10007; ', bg: '#f6dede', fg: '#8a1c1c' },
  overdue: { text: 'Overdue',    mark: '&#8635; ',  bg: '#fdf0d5', fg: '#7a4d00' },
  due:     { text: 'Scheduled',  mark: '',          bg: '#e8f2e3', fg: '#2d5a1b' }
};
function _scheduleStatus(it, iso, today) {
  if (it.not_in_use) return 'niu';
  if (it.completed) return 'done';
  if (it.weekly) return it.missed ? 'missed' : 'due';
  if (it.daily) return iso < today ? 'missed' : 'due';
  if (_bookingMissed(it.scheduled_date, today)) return 'missed';
  return it.scheduled_date !== iso ? 'overdue' : 'due';
}

function _schedulePill(statusKey, statusText, icon, name) {
  var s = SCHEDULE_STATUS[statusKey];
  return '<div style="font-size:11px;font-weight:700;padding:4px 6px;border-radius:3px;background:' + s.bg + ';color:' + s.fg + ';line-height:1.2;overflow:hidden;">'
    + '<div style="font-size:9px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + s.mark + statusText + '</div>'
    + '<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + icon + ' ' + _esc(name) + '</div>'
    + '</div>';
}

// One pill summing up the week's weekly items, rather than one each
function _weeklySummaryPill(weekly) {
  var done = weekly.filter(function(it) { return it.completed; }).length;
  var missed = weekly.filter(function(it) { return it.missed; }).length;
  var key = done === weekly.length ? 'done' : missed ? 'missed' : 'due';
  var text = done === weekly.length ? 'Completed' : missed ? missed + ' missed' : 'Scheduled';
  return _schedulePill(key, 'Weekly · ' + text, '&#128197;', done + ' of ' + weekly.length + ' done');
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
    var items = (_scheduleData[iso] || []).concat(_carriedOverFor(iso), _scheduleDailyFor(iso));
    var weekly = _scheduleWeeklyFor(iso);
    var total = items.length + weekly.length;
    var isToday = iso === today;
    var weekdayShort = d.toLocaleDateString('en-GB',{weekday:'short'});
    var pills = (weekly.length ? [_weeklySummaryPill(weekly)] : []).concat(items.slice(0, weekly.length ? 5 : 6).map(function(it) {
      var key = _scheduleStatus(it, iso, today);
      return _schedulePill(key, (it.daily ? 'Daily · ' : '') + SCHEDULE_STATUS[key].text, checksCategoryMeta(it.category).icon, it.machine);
    }));
    html += '<div class="sched-day-cell" style="background:' + (isToday ? '#eef7e2' : '#fafaf8') + ';border-radius:6px;min-height:120px;padding:8px;display:flex;flex-direction:column;gap:6px;' + (isToday ? 'box-shadow:0 0 0 2px var(--green) inset;' : '') + '">'
      + '<div class="sched-day-date" style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:14px;color:var(--mid);"><span class="sched-day-weekday" style="display:none;">' + weekdayShort + ' </span>' + d.getDate() + '</div>'
      + '<div class="sched-day-pills" style="display:flex;flex-direction:column;gap:4px;flex:1;">' + pills.join('') + '</div>'
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

var _SCHED_BTN = 'padding:6px 12px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;white-space:nowrap;';

function _scheduleBadge(key) {
  var s = SCHEDULE_STATUS[key];
  return '<span style="font-size:10.5px;font-weight:800;color:' + s.fg + ';background:' + s.bg + ';padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;">' + s.mark + s.text + '</span>';
}

function _scheduleModalRow(it, actionHtml, note) {
  var meta = checksCategoryMeta(it.category);
  var title = it.weekly ? _esc(it.machine) : _esc(meta.label) + ' — ' + _esc(it.machine);
  return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e0e0d8;font-size:12.5px;">'
    + '<span style="font-size:16px;">' + meta.icon + '</span>'
    + '<span style="flex:1;min-width:0;">' + title + '<div style="font-size:10.5px;font-weight:700;color:' + (note.colour || '#8a8a7a') + ';margin-top:2px;">' + note.text + '</div></span>'
    + '<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">' + actionHtml + '</span>'
    + '</div>';
}

function _scheduleSectionHdr(text) {
  return '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:11.5px;font-weight:800;color:#2d5218;text-transform:uppercase;letter-spacing:1px;padding:12px 0 2px;">' + text + '</div>';
}

function renderScheduleModalList() {
  var wrap = document.getElementById('scheduleModalList');
  var iso = _scheduleModalDate;
  var today = _isoDate(new Date());
  var bookings = (_scheduleData[iso] || []).concat(_carriedOverFor(iso));
  var daily = _scheduleDailyFor(iso);
  var weekly = _scheduleWeeklyFor(iso);
  if (!bookings.length && !daily.length && !weekly.length) {
    wrap.innerHTML = '<div style="color:#9a9a90;font-size:12.5px;padding:14px 0;text-align:center;">Nothing scheduled for this day.</div>';
    return;
  }
  // Only employees start checks or mark them not in use from here
  function actionsFor(it, canAct) {
    var key = _scheduleStatus(it, iso, today);
    if (key !== 'due' && key !== 'overdue') return _scheduleBadge(key);
    if (managerUnlocked || !canAct) return _scheduleBadge(key);
    var cat = it.category, machine = it.weekly ? it.startMachine : it.machine;
    return '<button onclick="markNotInUse(\'' + cat + '\',\'' + (it.id || '') + '\',\'' + _escJs(it.machine) + '\',' + (it.weekly ? 'true' : 'false') + ')" style="background:none;border:1.5px solid #b8b8ae;color:#55554d;' + _SCHED_BTN + 'padding:5px 9px;">Not in use</button>'
      + '<button onclick="startScheduledCheck(\'' + cat + '\',\'' + (it.id || '') + '\',\'' + _escJs(machine) + '\')" style="background:var(--lime);border:none;color:#1a3210;' + _SCHED_BTN + '">Start &#8594;</button>';
  }
  var html = '';
  if (daily.length) {
    html += _scheduleSectionHdr('Daily pre-use checks');
    html += daily.map(function(it) {
      return _scheduleModalRow(it, actionsFor(it, iso === today), { text: 'Daily check (Mon–Fri) — complete it or mark it not in use' });
    }).join('');
  }
  if (weekly.length) {
    var monday = _mondayIsoOf(iso);
    var thisWeek = monday === _mondayIsoOf(today);
    var left = weekly.filter(function(it) { return !it.completed; }).length;
    html += _scheduleSectionHdr('Weekly checks — week ' + weekly[0].weekNo + ' of the month'
      + (thisWeek && left ? ' · ' + left + ' to do by Fri' : ''));
    var lastSection = '';
    weekly.forEach(function(it) {
      if (it.section !== lastSection) {
        lastSection = it.section;
        html += '<div style="font-size:10.5px;font-weight:700;color:#8a8a7a;text-transform:uppercase;letter-spacing:.5px;padding-top:6px;">' + _esc(it.section) + '</div>';
      }
      html += _scheduleModalRow(it, actionsFor(it, thisWeek && iso <= today), { text: it.freq + (it.missed ? ' — not done by Friday' : '') });
    });
  }
  if (bookings.length) {
    html += _scheduleSectionHdr('Booked by the office');
    html += bookings.map(function(it) {
      var key = _scheduleStatus(it, iso, today);
      var carried = it.scheduled_date !== iso;
      var note = carried
        ? { text: '&#8635; Not done yet — booked ' + _overdueFromLabel(it.scheduled_date), colour: '#7a4d00' }
        : { text: key === 'missed' ? 'Not done by Friday' : 'Booked check' };
      var actionHtml;
      if (managerUnlocked && carried) {
        // Remove it from the day it was booked on, not from a carried-over copy
        actionHtml = _scheduleBadge(key);
      } else if (managerUnlocked) {
        actionHtml = _scheduleBadge(key)
          + '<button onclick="removeScheduledCheck(\'' + it.id + '\')" style="background:none;border:none;color:#a02020;font-size:16px;cursor:pointer;padding:2px 8px;" aria-label="Remove">&#10005;</button>';
      } else {
        actionHtml = actionsFor(it, iso <= today);
      }
      return _scheduleModalRow(it, actionHtml, note);
    }).join('');
  }
  wrap.innerHTML = html;
}

// ── NOT IN USE — tapped instead of Start when a machine isn't being used.
// A booking is flagged in place; a daily or weekly check gets a row of its
// own for today (a weekly one named after the schedule item), which covers
// it like a finished check would. Either way it's a completed todays_checks
// row with not_in_use set, so it drops off the list and the badge, and is
// listed for managers in the Weekly Report. ──
function markNotInUse(cat, id, machine, weekly) {
  var meta = checksCategoryMeta(cat);
  if (!confirm(meta.label + ' — ' + machine + '\n\nMark as not in use ' + (weekly ? 'this week' : 'today') + '? It will come off the list and the office will see it wasn\'t used.')) return;
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
  tables.forEach(function(t) {
    cats[t.cat || t.kind] = 1;
    if (t.cat && CHECK_CATEGORIES[t.cat].group) cats[CHECK_CATEGORIES[t.cat].group] = 1;
  });
  // A weekly item can count checks from more than one category (Blowers:
  // hand held or backpack) — keep it when any of them is in the report
  function inReport(category) {
    if (cats[category]) return true;
    var w = WEEKLY_CHECKS.filter(function(x) { return x.cat === category; })[0];
    return !!(w && w.sources.some(function(s) { return cats[s.cat]; }));
  }
  var notInUseReq = fetch(SUPA_URL + '/rest/v1/todays_checks?select=category,machine,scheduled_date,not_in_use_at&not_in_use=is.true'
    + '&not_in_use_at=gte.' + startIso + '&not_in_use_at=lt.' + endIso + '&order=not_in_use_at.desc', {
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
  })
  .then(function(r){ return r.json(); })
  .then(function(rows) { return (Array.isArray(rows) ? rows : []).filter(function(r) { return inReport(r.category); }); })
  .catch(function() { return []; });

  // Daily, weekly and booked checks missed that week (see _missedForWeek)
  var mondayIso = _isoDate(weekStart), sundayIso = _isoDate(weekEndDisplay);
  var missedReq = Promise.all([
    fetch(SUPA_URL + '/rest/v1/todays_checks?select=category,machine,scheduled_date,completed,not_in_use'
      + '&scheduled_date=gte.' + mondayIso + '&scheduled_date=lte.' + sundayIso, {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
    }).then(function(r){ return r.json(); }),
    _fetchCheckHistory(mondayIso, sundayIso)
  ])
  .then(function(res) {
    return _missedForWeek(mondayIso, res[1], Array.isArray(res[0]) ? res[0] : [], _isoDate(new Date()))
      .filter(function(m) { return inReport(m.category); });
  })
  .catch(function() { return null; });

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
  }).concat([notInUseReq, missedReq])).then(function(results) {
    var missed = results.pop();
    var notInUse = results.pop();
    var all = [].concat.apply([], results);
    all.sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); });
    renderWeeklyReport(all, tables, notInUse, missed);
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

function renderWeeklyReport(entries, tables, notInUse, missed) {
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
        + unfinished.map(function(e) { return _esc(e.label) + ' — ' + _esc(e.name || 'Unknown') + (e.inspector ? ' (' + _esc(e.inspector) + ')' : ''); }).join(', ') + '</div>'
      : '');

  var barsHtml = bars.map(function(b) {
    var c = b.count;
    if (!c) return '';
    var pct = Math.round((c / maxCatCount) * 100);
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;font-size:12.5px;">'
      + '<div style="width:120px;flex-shrink:0;color:var(--mid);">' + _esc(b.label) + '</div>'
      + '<div style="flex:1;height:16px;background:#eee;border-radius:3px;overflow:hidden;"><div style="height:100%;border-radius:3px;background:var(--green);width:' + pct + '%;"></div></div>'
      + '<div style="width:28px;text-align:right;color:#8a8a7a;">' + c + '</div>'
      + '</div>';
  }).join('');

  var reportListHtml = entries.length
    ? '<ul style="list-style:none;margin:0;padding:0;">' + entries.map(function(e) {
        var dateStr = e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '';
        return '<li style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;">'
          + '<a href="#" onclick="openDefectRecord(\'' + e.kind + '\',\'' + (e.cat || '') + '\',\'' + e.id + '\');return false;" style="color:var(--green);text-decoration:none;font-weight:600;flex:1;min-width:0;">' + _esc(e.label) + (e.name ? ' — ' + _esc(e.name) : '') + '</a>'
          + '<span style="color:#8a8a7a;font-size:11.5px;white-space:nowrap;">' + (e.inspector ? _esc(e.inspector) + ' · ' : '') + dateStr + '</span>'
          + '<button onclick="downloadCheckPdf(\'' + e.kind + '\',\'' + (e.cat || '') + '\',\'' + e.id + '\',this)" title="Download PDF" style="background:var(--lime);border:none;color:#1a3210;padding:5px 9px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;white-space:nowrap;">&#11015; PDF</button>'
          + '</li>';
      }).join('') + '</ul>'
    : '<div style="color:#9a9a90;font-size:12.5px;padding:14px 0;text-align:center;">No checks completed this week.</div>';

  var notInUseHtml = notInUse.length
    ? '<ul style="list-style:none;margin:0;padding:0;">' + notInUse.map(function(n) {
        var dateStr = new Date(n.not_in_use_at).toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'});
        return '<li style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;">'
          + '<span style="font-weight:600;color:#333;">' + checksCategoryMeta(n.category).icon + ' ' + checksCategoryMeta(n.category).label + ' — ' + _esc(n.machine) + '</span>'
          + '<span style="color:#8a8a7a;font-size:11.5px;white-space:nowrap;">' + dateStr + '</span>'
          + '</li>';
      }).join('') + '</ul>'
    : '<div style="color:#9a9a90;font-size:12.5px;padding:14px 0;text-align:center;">No machines marked not in use this week.</div>';

  var missedHtml = missed === null
    ? '<div style="color:#c62828;font-size:12.5px;padding:14px 0;text-align:center;">Could not work out missed checks — check connection and try again.</div>'
    : missed.length
    ? '<ul style="list-style:none;margin:0;padding:0;">' + missed.map(function(m) {
        var meta = checksCategoryMeta(m.category);
        var dateStr = new Date(m.date + 'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'});
        return '<li style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;">'
          + '<span style="font-weight:600;color:#8a1c1c;">' + meta.icon + ' ' + _esc(m.machine) + '<span style="display:block;font-weight:400;font-size:11.5px;color:#8a8a7a;">' + _esc(m.kind) + ' · ' + _esc(meta.label) + '</span></span>'
          + '<span style="color:#8a8a7a;font-size:11.5px;white-space:nowrap;">' + (m.kind.indexOf('Weekly') === 0 ? 'Week of ' : '') + dateStr + '</span>'
          + '</li>';
      }).join('') + '</ul>'
    : '<div style="color:#9a9a90;font-size:12.5px;padding:14px 0;text-align:center;">No missed checks this week.</div>';

  _weeklyReportLast = { entries: entries, unfinished: unfinished, counts: counts, bars: bars, notInUse: notInUse, missed: missed || [] };

  var btn = 'border:none;padding:7px 14px;border-radius:4px;font-family:\'Barlow Condensed\',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;';
  var monthLabel = (_weeklyReportWeekStart || _mondayOf(new Date())).toLocaleDateString('en-GB', {month:'short', year:'numeric'});
  bodyEl.innerHTML = '<div style="display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin-bottom:12px;">'
    + '<button onclick="downloadReportsZip(\'week\',this)" style="background:var(--lime);color:#1a3210;' + btn + '">&#128230; All reports this week (ZIP)</button>'
    + '<button onclick="downloadReportsZip(\'month\',this)" style="background:var(--lime);color:#1a3210;' + btn + '">&#128230; All reports ' + monthLabel + ' (ZIP)</button>'
    + '<button onclick="downloadWeeklyReportExcel()" style="background:#1d6f42;color:white;' + btn + '">&#128202; Download Excel</button>'
    + '</div>'
    + statHtml
    + '<div style="background:white;border-radius:8px;padding:16px;margin-bottom:16px;">' + (barsHtml || '<div style="color:#9a9a90;font-size:12.5px;text-align:center;padding:10px 0;">Nothing to break down yet.</div>') + '</div>'
    + '<div style="background:#1a3210;padding:10px 16px;border-radius:8px 8px 0 0;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:var(--lime);text-transform:uppercase;letter-spacing:1px;">Individual Reports</div>'
    + '<div style="background:white;border-radius:0 0 8px 8px;padding:6px 16px 16px;">' + reportListHtml + '</div>'
    + '<div style="background:#1a3210;padding:10px 16px;border-radius:8px 8px 0 0;margin-top:16px;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:#ff8a80;text-transform:uppercase;letter-spacing:1px;">&#10007; Missed Checks' + (missed && missed.length ? ' (' + missed.length + ')' : '') + '</div>'
    + '<div style="background:white;border-radius:0 0 8px 8px;padding:6px 16px 16px;">' + missedHtml + '</div>'
    + '<div style="background:#1a3210;padding:10px 16px;border-radius:8px 8px 0 0;margin-top:16px;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:var(--lime);text-transform:uppercase;letter-spacing:1px;">Machines Not In Use</div>'
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
    ['Missed checks', r.missed.length],
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
  var missedRows = [['Date', 'Type', 'Category', 'Machine / vehicle']];
  r.missed.forEach(function(m) {
    missedRows.push([new Date(m.date + 'T00:00:00').toLocaleDateString('en-GB'), m.kind, checksCategoryMeta(m.category).label, m.machine || '']);
  });
  var ws4 = XLSX.utils.aoa_to_sheet(missedRows);
  ws4['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 32 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'Missed');
  var weekOf = _weeklyReportWeekStart ? _isoDate(_weeklyReportWeekStart) : '';
  XLSX.writeFile(wb, 'Weekly_Report_' + safeFileSegment(catLabel) + '_' + weekOf + '.xlsx');
}

