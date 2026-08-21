// ── STAFF PORTAL — clock in/out, leave requests, team calendar ──
// Reached only from the main lock screen ("Staff Portal" link) or, for
// managers, the Staff Dashboards tile inside Office — there is no separate
// URL. Session is per-employee (password-per-person, set on first login),
// completely independent of the shared team/manager login used everywhere
// else in the app — which means these requests run as Supabase's `anon`
// role. Every table access here goes through the RPC functions in
// supabase_staff_portal.sql instead of direct REST table calls, and every
// mutating one requires the session token issued at login (spSessionToken)
// — see that file's RLS section for why a plain table policy wasn't safe.

var SP_SESSION_TIMEOUT_MS = 300000; // 5 minutes idle (server-side token lasts 30 min — see sp_staff_from_token)
var spSessionToken = null, spSessionStaffId = null, spSessionName = null, spSessionIsManager = false;
var spSessionExpiresAt = 0, spTickHandle = null;
var SP_PORTAL_VIEWS = ['spPortalHome', 'spClock', 'spLeave', 'spCalendar'];

function spHeaders() {
  return { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() };
}

function spRpc(fn, body) {
  return fetch(SUPA_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: spHeaders(), body: JSON.stringify(body || {}) })
    .then(function(r) { return r.json().then(function(data) { return { ok: r.ok, data: data }; }); });
}

// ── VIEW SWITCHING ──
function spOpen(id) {
  var root = document.getElementById('spRoot');
  if (!root) return;
  root.style.display = 'block';
  var views = root.querySelectorAll('.sp-view');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  if (id === 'spClose') { root.style.display = 'none'; return; }
  if (SP_PORTAL_VIEWS.indexOf(id) !== -1 && !spSessionToken) id = 'spPortalLogin';
  var target = document.getElementById(id);
  if (!target) return;
  target.classList.add('active');
  window.scrollTo(0, 0);
  if (SP_PORTAL_VIEWS.indexOf(id) !== -1) spTouchSession();
  if (id === 'spPortalLogin') spLoadStaffList();
  if (id === 'spClock') { document.getElementById('spClockWho').textContent = spSessionName; spAttemptGPS(); spRenderOnsite(); }
  if (id === 'spLeave') spRenderLeave();
  if (id === 'spCalendar') { spCalMonth = new Date(); spCalMonth.setDate(1); spRenderCalendar(); }
  if (id === 'spManagerDash') spRenderMgr();
}
function spOpenManagerDash() { spOpen('spManagerDash'); }

// ── STAFF PICKER ──
function spLoadStaffList() {
  var sel = document.getElementById('spName');
  if (!sel || sel.dataset.loaded) return;
  spRpc('sp_list_staff_names', {}).then(function(res) {
    if (!res.ok) { spShowErr('spLoginErr', 'Could not load staff list — check your connection.'); return; }
    sel.dataset.loaded = '1';
    (res.data || []).forEach(function(row) {
      var opt = document.createElement('option');
      opt.textContent = row.name;
      sel.appendChild(opt);
    });
  }).catch(function() { spShowErr('spLoginErr', 'Could not load staff list — check your connection.'); });
}

// When a name is picked, ask the server whether they have a password yet,
// and switch the form between "enter password" and "create password" modes.
function spOnNameChange() {
  var name = document.getElementById('spName').value;
  var passWrap = document.getElementById('spPassWrap');
  var setupWrap = document.getElementById('spSetupWrap');
  var btn = document.getElementById('spLoginBtn');
  spShowErr('spLoginErr', '');
  if (!name) { passWrap.style.display = 'none'; setupWrap.style.display = 'none'; btn.disabled = true; return; }
  btn.disabled = false;
  spRpc('staff_needs_password_setup', { p_name: name }).then(function(res) {
    if (res.data === true) {
      passWrap.style.display = 'none';
      setupWrap.style.display = 'block';
      btn.textContent = 'Create Password';
    } else {
      passWrap.style.display = 'block';
      setupWrap.style.display = 'none';
      btn.textContent = 'Sign In';
    }
  });
}

function spSubmitLogin() {
  var name = document.getElementById('spName').value;
  var btn = document.getElementById('spLoginBtn');
  spShowErr('spLoginErr', '');
  if (!name) { spShowErr('spLoginErr', 'Select your name first.'); return; }
  var isSetup = document.getElementById('spSetupWrap').style.display === 'block';
  btn.disabled = true;
  if (isSetup) {
    var p1 = document.getElementById('spNewPass').value;
    var p2 = document.getElementById('spNewPass2').value;
    if (!p1 || p1.length < 4) { spShowErr('spLoginErr', 'Choose a password at least 4 characters long.'); btn.disabled = false; return; }
    if (p1 !== p2) { spShowErr('spLoginErr', 'Passwords don\'t match.'); btn.disabled = false; return; }
    spRpc('set_staff_password', { p_name: name, p_new_password: p1, p_current_password: null }).then(function(res) {
      btn.disabled = false;
      if (!res.ok || !Array.isArray(res.data) || !res.data.length) { spShowErr('spLoginErr', (res.data && res.data.message) || 'Could not set password.'); return; }
      spCompleteLogin(name, res.data[0]);
    }).catch(function() { btn.disabled = false; spShowErr('spLoginErr', 'Connection error — try again.'); });
  } else {
    var pass = document.getElementById('spPass').value;
    if (!pass) { spShowErr('spLoginErr', 'Enter your password.'); btn.disabled = false; return; }
    spRpc('verify_staff_login', { p_name: name, p_password: pass }).then(function(res) {
      btn.disabled = false;
      if (!res.ok || !Array.isArray(res.data) || !res.data.length) {
        spShowErr('spLoginErr', 'Incorrect password — try again.');
        document.getElementById('spPass').value = '';
        return;
      }
      spCompleteLogin(name, res.data[0]);
    }).catch(function() { btn.disabled = false; spShowErr('spLoginErr', 'Connection error — try again.'); });
  }
}

function spCompleteLogin(name, row) {
  spSessionName = name;
  spSessionToken = row.session_token;
  spSessionStaffId = row.staff_id;
  spSessionIsManager = !!row.is_manager;
  document.getElementById('spPass').value = '';
  document.getElementById('spNewPass').value = '';
  document.getElementById('spNewPass2').value = '';
  spTouchSession();
  spStartWatch();
  spOpen('spPortalHome');
}

function spShowErr(id, msg) { var el = document.getElementById(id); if (el) el.textContent = msg; }

// ── SESSION (single sign-in for the whole portal, auto-expires on inactivity) ──
function spTouchSession() {
  if (!spSessionToken) return;
  spSessionExpiresAt = Date.now() + SP_SESSION_TIMEOUT_MS;
  ['spSessName1', 'spSessName2', 'spSessName3', 'spSessName4'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.textContent = spSessionName;
  });
}

function spCurrentViewId() {
  var root = document.getElementById('spRoot');
  var active = root && root.querySelector('.sp-view.active');
  return active ? active.id : null;
}

function spStartWatch() {
  ['click', 'keydown', 'touchstart'].forEach(function(evt) {
    document.addEventListener(evt, function() {
      if (spSessionToken && SP_PORTAL_VIEWS.indexOf(spCurrentViewId()) !== -1) spTouchSession();
    });
  });
  if (spTickHandle) clearInterval(spTickHandle);
  spTickHandle = setInterval(function() {
    if (!spSessionToken) return;
    var msLeft = spSessionExpiresAt - Date.now();
    if (msLeft <= 0) { spLogout('Session expired after a period of inactivity — please sign in again.'); return; }
    var secs = Math.ceil(msLeft / 1000);
    ['spTimer1', 'spTimer2', 'spTimer3', 'spTimer4'].forEach(function(id) {
      var el = document.getElementById(id); if (!el) return;
      el.textContent = 'expires in ' + secs + 's';
      el.className = 'sp-timer' + (secs <= 20 ? ' low' : '');
    });
  }, 1000);
}

function spLogout(message) {
  spSessionToken = null; spSessionStaffId = null; spSessionName = null; spSessionIsManager = false; spSessionExpiresAt = 0;
  var nameEl = document.getElementById('spName'); if (nameEl) nameEl.value = '';
  var passEl = document.getElementById('spPass'); if (passEl) passEl.value = '';
  document.getElementById('spPassWrap').style.display = 'none';
  document.getElementById('spSetupWrap').style.display = 'none';
  document.getElementById('spLoginBtn').disabled = true;
  spOpen('spPortalLogin');
  if (message) spToast(message);
}

function spToast(msg) {
  var t = document.getElementById('spToast');
  if (!t) return;
  t.textContent = msg; t.style.display = 'block';
  setTimeout(function() { t.style.display = 'none'; }, 3500);
}

// ── CLOCK IN/OUT ──
// GPS is fetched FRESH at the moment Clock In/Out is pressed (not reused from
// whenever the screen happened to open) — a stale/never-resolved reading was
// why location wasn't showing up. spAttemptGPS on screen-open is just an
// early preview so the permission prompt appears sooner; spGetFreshGPS is
// what's actually used for the clock event.
function spAttemptGPS() {
  var note = document.getElementById('spGpsNote');
  if (!navigator.geolocation) {
    note.className = 'sp-gps-note err';
    note.textContent = '📍 Location not available on this device — clocking in/out will still work fine.';
    return;
  }
  navigator.geolocation.getCurrentPosition(function(pos) {
    note.className = 'sp-gps-note';
    note.textContent = '📍 Location ready (±' + Math.round(pos.coords.accuracy) + 'm) — captured fresh each time you clock in/out.';
  }, function(err) {
    note.className = 'sp-gps-note err';
    // err.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT.
    // All three used to show "permission not granted", which was misleading —
    // a slow GPS fix (very common indoors/on first load) reads identically to
    // an actual blocked permission unless we check the code.
    if (err && err.code === 1) {
      note.textContent = '📍 Location permission not granted — check your browser/phone location settings. Clocking in/out still works without it.';
    } else if (err && err.code === 3) {
      note.textContent = '📍 Location is taking a while to lock on — it\'ll keep trying when you clock in/out.';
    } else {
      note.textContent = '📍 Could not determine location right now — clocking in/out still works without it.';
    }
  }, { timeout: 4000, maximumAge: 0 });
}

function spGetFreshGPS(cb) {
  if (!navigator.geolocation) { cb(null, null); return; }
  var done = false;
  var timer = setTimeout(function() { if (!done) { done = true; cb(null, {code:3}); } }, 6000);
  navigator.geolocation.getCurrentPosition(function(pos) {
    if (done) return; done = true; clearTimeout(timer);
    cb({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: pos.coords.accuracy }, null);
  }, function(err) {
    if (done) return; done = true; clearTimeout(timer);
    cb(null, err);
  }, { timeout: 6000, maximumAge: 0, enableHighAccuracy: true });
}

function spDoClock(action) {
  var btn1 = document.querySelector('#spClock .sp-btn-lime'), btn2 = document.querySelector('#spClock .sp-btn-out');
  var note = document.getElementById('spGpsNote');
  btn1.disabled = true; btn2.disabled = true;
  note.className = 'sp-gps-note';
  note.textContent = '📍 Getting your location…';
  spGetFreshGPS(function(gps, gpsErr) {
    var body = { p_token: spSessionToken, p_action: action };
    if (gps) {
      body.p_lat = gps.lat; body.p_lng = gps.lng; body.p_accuracy_m = gps.accuracy_m;
    }
    spRpc('sp_clock_event', body).then(function(res) {
      btn1.disabled = false; btn2.disabled = false;
      if (!res.ok) {
        var msg = (res.data && res.data.message) || ('Could not clock ' + action + ' — check your connection and try again.');
        if (/session expired/i.test(msg)) { spLogout(msg); return; }
        spToast(msg);
        return;
      }
      if (gps) {
        note.className = 'sp-gps-note';
        note.textContent = '📍 Location captured (±' + Math.round(gps.accuracy_m) + 'm) for this ' + (action === 'in' ? 'clock-in' : 'clock-out') + '.';
      } else {
        note.className = 'sp-gps-note err';
        var reason = gpsErr && gpsErr.code === 1 ? 'permission wasn\'t granted' : gpsErr && gpsErr.code === 3 ? 'it took too long to lock on' : 'it wasn\'t available';
        note.textContent = '📍 Clocked ' + (action === 'in' ? 'in' : 'out') + ' without a location — ' + reason + '.';
      }
      spRenderClockStatus(action === 'in');
      spRenderOnsite();
    }).catch(function() { btn1.disabled = false; btn2.disabled = false; spToast('Connection error — try again.'); });
  });
}

function spRenderClockStatus(isOn) {
  var pill = document.getElementById('spClockPill');
  pill.className = 'sp-pill ' + (isOn ? 'on' : 'off');
  pill.textContent = isOn ? 'On site' : 'Clocked out';
}

// "On site now": read-only, no token needed — visible to anyone on the
// Clock In/Out screen or Staff Dashboards, not just the person asking.
function spRenderOnsite() {
  var elList = [document.getElementById('spOnsiteList'), document.getElementById('spMgrOnsite')].filter(Boolean);
  if (!elList.length) return;
  spRpc('sp_onsite_now', {}).then(function(res) {
    var onsite = res.ok && Array.isArray(res.data) ? res.data : [];
    var html = onsite.length
      ? onsite.map(function(o) {
          var t = new Date(o.since);
          var hh = String(t.getHours()).padStart(2, '0'), mm = String(t.getMinutes()).padStart(2, '0');
          return '<div class="sp-onsite-row"><span>' + o.name + '</span><span class="sp-onsite-time">since ' + hh + ':' + mm + '</span></div>';
        }).join('')
      : '<div style="color:var(--mid);font-size:12px;">Nobody currently clocked in.</div>';
    elList.forEach(function(el) { el.innerHTML = html; });
    if (document.getElementById('spClockPill')) {
      spRenderClockStatus(onsite.some(function(o) { return o.name === spSessionName; }));
    }
  }).catch(function() {});
}

// ── MY LEAVE ──
function spRenderLeave() {
  spRpc('sp_my_leave_balance', { p_token: spSessionToken }).then(function(res) {
    if (!res.ok || !Array.isArray(res.data) || !res.data.length) { spLogout('Session expired — please sign in again.'); return; }
    var b = res.data[0];
    document.getElementById('spBalWho').textContent = 'Holiday balance — ' + spSessionName;
    document.getElementById('spBalTotal').textContent = b.entitlement;
    document.getElementById('spBalUsed').textContent = b.days_used;
    document.getElementById('spBalRemaining').textContent = b.days_remaining;
    document.getElementById('spBalSick').textContent = b.sick_days;
  });
  spRenderMyRequests();
}

function spRenderMyRequests() {
  var el = document.getElementById('spMyRequests');
  spRpc('sp_my_leave_requests', { p_token: spSessionToken }).then(function(res) {
    var list = res.ok && Array.isArray(res.data) ? res.data : [];
    if (!list.length) { el.innerHTML = '<div style="color:var(--mid);font-size:12px;">No requests yet.</div>'; return; }
    el.innerHTML = list.map(function(r) {
      return '<div class="sp-req-item"><div class="sp-req-top"><span class="sp-req-dates">' + spFmtDateRange(r.start_date, r.end_date) + ' (' + r.days + (r.days == 1 ? ' day' : ' days') + ')</span><span class="sp-pill ' + r.status + '">' + r.status + '</span></div>'
        + (r.note ? '<div class="sp-req-note">' + spEsc(r.note) + '</div>' : '') + '</div>';
    }).join('');
  });
}

// Business days (Mon-Fri) between two dates inclusive — a reasonable default
// that covers the common case; doesn't currently subtract a bank holiday
// that happens to fall inside the range, so the employee or manager can
// adjust the day count by hand for that edge case rather than the app
// silently guessing wrong.
function spBusinessDays(startStr, endStr) {
  var start = new Date(startStr + 'T00:00:00'), end = new Date(endStr + 'T00:00:00');
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  var days = 0;
  for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    var dow = d.getDay();
    if (dow !== 0 && dow !== 6) days++;
  }
  return days;
}

function spRecalcReqDays() {
  var start = document.getElementById('spReqStart').value, end = document.getElementById('spReqEnd').value;
  var daysEl = document.getElementById('spReqDays');
  if (start && end) daysEl.value = spBusinessDays(start, end);
}

function spSubmitRequest() {
  var start = document.getElementById('spReqStart').value, end = document.getElementById('spReqEnd').value;
  var days = parseFloat(document.getElementById('spReqDays').value);
  var type = document.getElementById('spReqType').value;
  var note = document.getElementById('spReqNote').value;
  var err = document.getElementById('spReqErr'); err.textContent = '';
  if (!start || !end) { err.textContent = 'Pick a start and end date.'; return; }
  if (!days || days <= 0) { err.textContent = 'Enter how many days this covers.'; return; }
  spRpc('sp_submit_leave_request', { p_token: spSessionToken, p_start_date: start, p_end_date: end, p_days: days, p_type: type, p_note: note || null }).then(function(res) {
    if (!res.ok) {
      var msg = (res.data && res.data.message) || 'Could not submit request.';
      if (/session expired/i.test(msg)) { spLogout(msg); return; }
      err.textContent = msg;
      return;
    }
    document.getElementById('spReqStart').value = '';
    document.getElementById('spReqEnd').value = '';
    document.getElementById('spReqDays').value = '';
    document.getElementById('spReqNote').value = '';
    spRenderMyRequests();
    spToast('Request submitted.');
  }).catch(function() { err.textContent = 'Connection error — try again.'; });
}

function spFmtDateRange(a, b) {
  var fmt = function(s) { var d = new Date(s + 'T00:00:00'); return d.getDate() + ' ' + d.toLocaleString('en-GB', { month: 'short' }); };
  return a === b ? fmt(a) : (fmt(a) + ' – ' + fmt(b));
}
function spEsc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ── TEAM CALENDAR ──
var spCalMonth = new Date();

function spShiftMonth(delta) {
  spCalMonth = new Date(spCalMonth.getFullYear(), spCalMonth.getMonth() + delta, 1);
  spRenderCalendar();
}

function spFirstName(fullName) { return (fullName || '').split(' ')[0]; }

// Shared by the staff-facing Team Calendar and the manager's read-only copy
// of it in Staff Dashboards — same month grid, same day-marking rules, just
// fed different rows (a signed-in staff token also includes that person's
// own pending entries; the manager view always passes p_token: null, so it
// only ever sees what's public — see sp_calendar_days for the actual rule).
function spBuildCalGridHtml(rows, y, m) {
  var marks = {}; // day-of-month -> {names:[{text,pending}], bh:true, shutdown:true}
  rows.forEach(function(r) {
    var s = new Date(r.start_date + 'T00:00:00'), e = new Date(r.end_date + 'T00:00:00');
    for (var d = new Date(Math.max(s, new Date(y, m, 1))); d <= e && d <= new Date(y, m + 1, 0); d.setDate(d.getDate() + 1)) {
      var day = d.getDate();
      if (!marks[day]) marks[day] = { names: [] };
      // Bank holidays and the company shutdown both apply to everyone, so
      // neither lists all 15 names — but they're tagged differently: a real
      // bank holiday doesn't touch anyone's allowance, while the shutdown
      // (Christmas closure) is counted as staff holiday and does use a day
      // of it, so labelling it "BH" was actively misleading. Every other
      // row here is either someone's approved holiday (public, per the
      // SQL — the whole point of a shared calendar) or the signed-in
      // user's own entry of any type/status (sick, other, or a still-
      // pending request) — the SQL never sends anyone else's sick/other/
      // pending rows, so whatever shows up beyond "holiday" can only ever
      // be describing yourself.
      if (r.type === 'bank_holiday') { marks[day].bh = true; continue; }
      if (r.type === 'shutdown') { marks[day].shutdown = true; continue; }
      var label = spFirstName(r.staff_name) + (r.type === 'holiday' ? '' : ' (' + r.type + ')') + (r.status === 'pending' ? ' — pending' : '');
      marks[day].names.push({ text: label, pending: r.status === 'pending' });
    }
  });
  var first = new Date(y, m, 1);
  var startOffset = (first.getDay() + 6) % 7;
  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var dows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var html = dows.map(function(d) { return '<div class="sp-cal-dow">' + d + '</div>'; }).join('');
  for (var i = 0; i < startOffset; i++) html += '<div class="sp-cal-day sp-blank"></div>';
  for (var d2 = 1; d2 <= daysInMonth; d2++) {
    var mk = marks[d2] || { names: [] };
    html += '<div class="sp-cal-day' + (mk.bh || mk.shutdown ? ' sp-is-bh' : '') + '"><span class="sp-dnum">' + d2 + '</span>'
      + (mk.bh ? '<span class="sp-bh-tag">BH</span>' : '')
      + (mk.shutdown ? '<span class="sp-bh-tag sp-shutdown-tag">Shutdown</span>' : '')
      + (mk.names.length ? '<div class="sp-cal-names">' + mk.names.map(function(n) { return '<span class="sp-cal-name' + (n.pending ? ' sp-cal-name-pending' : '') + '">' + spEsc(n.text) + '</span>'; }).join('') + '</div>' : '')
      + '</div>';
  }
  return html;
}

function spRenderCalendar() {
  var y = spCalMonth.getFullYear(), m = spCalMonth.getMonth(); // JS month is 0-based
  document.getElementById('spCalTitle').textContent = spCalMonth.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  // p_token lets the RPC also include the signed-in staff member's own
  // pending requests (everyone else's pending stays hidden — see the SQL).
  spRpc('sp_calendar_days', { p_year: y, p_month: m + 1, p_token: spSessionToken }).then(function(res) {
    var rows = res.ok && Array.isArray(res.data) ? res.data : [];
    document.getElementById('spCalGrid').innerHTML = spBuildCalGridHtml(rows, y, m);
  });
}

// ── MANAGER: TEAM CALENDAR (read-only overview inside Staff Dashboards) ──
var spMgrCalMonth = new Date();

function spShiftMgrCalMonth(delta) {
  spMgrCalMonth = new Date(spMgrCalMonth.getFullYear(), spMgrCalMonth.getMonth() + delta, 1);
  spRenderMgrCalendar();
}

function spRenderMgrCalendar() {
  var el = document.getElementById('spMgrCalGrid');
  if (!el) return;
  var y = spMgrCalMonth.getFullYear(), m = spMgrCalMonth.getMonth();
  document.getElementById('spMgrCalTitle').textContent = spMgrCalMonth.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  // The manager is signed in via the separate Office/Supabase Auth login,
  // not a staff session, so p_token is null — this shows exactly what
  // everyone's shared calendar shows (approved holiday, bank holidays,
  // shutdown). Pending requests and sick days already have their own cards
  // above (Pending requests / Edit staff records), so they're deliberately
  // not duplicated here.
  spRpc('sp_calendar_days', { p_year: y, p_month: m + 1, p_token: null }).then(function(res) {
    var rows = res.ok && Array.isArray(res.data) ? res.data : [];
    el.innerHTML = spBuildCalGridHtml(rows, y, m);
  });
}

// ── MANAGER: STAFF DASHBOARDS ──
function spRenderMgr() {
  spRenderOnsite();
  spRenderMgrCalendar();
  spSyncBankHolidaysAndShutdowns();
  spRenderTeamSummary();
  spRenderPendingRequests();
  spRenderClockActivity();
  spRenderClockReport();
  spLoadEditStaffList();
}

// ── MANAGER: MONTHLY CLOCK REPORT ──
var spReportMonth = new Date();

function spShiftReportMonth(delta) {
  spReportMonth = new Date(spReportMonth.getFullYear(), spReportMonth.getMonth() + delta, 1);
  spRenderClockReport();
}

function spRenderClockReport() {
  var el = document.getElementById('spClockReport');
  if (!el) return;
  var y = spReportMonth.getFullYear(), m = spReportMonth.getMonth();
  document.getElementById('spReportTitle').textContent = spReportMonth.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  spRpc('sp_clock_report', { p_year: y, p_month: m + 1 }).then(function(res) {
    var rows = res.ok && Array.isArray(res.data) ? res.data : [];
    if (!rows.length) { el.innerHTML = '<div style="color:var(--mid);font-size:12px;">No clock activity this month.</div>'; return; }
    var body = rows.map(function(r) {
      var dateStr = new Date(r.work_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return '<tr><td>' + spEsc(r.name) + '</td><td>' + dateStr + '</td><td>' + (r.clock_in ? r.clock_in.slice(0, 5) : '—') + '</td><td>' + (r.clock_out ? r.clock_out.slice(0, 5) : '—') + '</td><td>' + (r.hours != null ? r.hours : '—') + '</td></tr>';
    }).join('');
    el.innerHTML = '<table class="sp-dash-table"><tr><th>Name</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Hours</th></tr>' + body + '</table>';
  });
}

function spMapLink(lat, lng) {
  if (lat == null || lng == null) return '';
  return ' &middot; <a href="https://maps.google.com/?q=' + lat + ',' + lng + '" target="_blank" rel="noopener" style="color:var(--green);text-decoration:underline;">view on map</a>';
}

// Manager-only: every recent clock in/out event with location — separate from
// the quick "who's on site now" summary above, since that one (shared with
// the employee-facing Clock screen) deliberately never shows location.
function spRenderClockActivity() {
  var el = document.getElementById('spClockActivity');
  if (!el) return;
  spRpc('sp_clock_activity', { p_limit: 100 }).then(function(res) {
    var rows = res.ok && Array.isArray(res.data) ? res.data : [];
    if (!rows.length) { el.innerHTML = '<div style="color:var(--mid);font-size:12px;">No clock activity yet.</div>'; return; }
    el.innerHTML = rows.map(function(r) {
      var t = new Date(r.ts);
      var when = t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
      var label = r.action === 'in' ? 'Clocked in' : 'Clocked out';
      return '<div class="sp-onsite-row"><span>' + spEsc(r.name) + ' — ' + label
        + '<br><span class="sp-onsite-time">' + when + (r.lat != null ? spMapLink(r.lat, r.lng) : ' &middot; no location') + '</span></span>'
        + '<button class="sp-clock-del-btn" title="Delete this entry" onclick="spDeleteClockEvent(\'' + r.id + '\')">&times;</button></div>';
    }).join('');
  });
}

// Manager-only: removes a mis-tap or duplicate clock event outright — there's
// no "pending/decide" state for a clock event like there is for leave, so
// this is a straight delete, not an approve/decline.
function spDeleteClockEvent(id) {
  if (!confirm('Delete this clock event? This cannot be undone.')) return;
  spRpc('sp_manager_delete_clock_event', { p_id: id }).then(function(res) {
    if (!res.ok || !res.data) { spToast('Could not delete.'); return; }
    spToast('Deleted.');
    spRenderClockActivity();
    spRenderOnsite();
  }).catch(function() { spToast('Connection error — try again.'); });
}

// Fetches the UK bank holiday list client-side (Postgres has no outbound
// internet access) and syncs both that and the manually-maintained shutdown
// dates to everyone's leave record. Runs every time Staff Dashboards opens —
// cheap no-op on repeat calls since the sync RPCs use ON CONFLICT DO NOTHING.
// The gov.uk feed spans 2019-2028 — only the CURRENT leave year's dates
// should ever be applied, or every employee gets charged for a decade of
// bank holidays that don't belong to this year's allowance.
function spCurrentLeaveYearRange() {
  var now = new Date();
  var y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; // leave year starts April (month index 3)
  return { start: y + '-04-01', end: (y + 1) + '-03-31' };
}

function spSyncBankHolidaysAndShutdowns() {
  var range = spCurrentLeaveYearRange();
  fetch('https://www.gov.uk/bank-holidays.json').then(function(r) { return r.json(); }).then(function(data) {
    var events = (data && data['england-and-wales'] && data['england-and-wales'].events) || [];
    var dates = events.map(function(e) { return e.date; }).filter(function(d) { return d >= range.start && d <= range.end; });
    if (!dates.length) return;
    return spRpc('sp_sync_bank_holidays', { p_dates: dates });
  }).catch(function() { /* best-effort — Staff Dashboards still works without it */ });
  spRpc('sp_sync_shutdown_days', {}).catch(function() {});
}

// ── MANAGER: EDIT STAFF RECORDS (full edit/delete access to any entry) ──
var spHistoryRows = {}; // id -> row data, so Edit can pre-fill without a re-fetch
var spCurrentEditStaff = null;

function spLoadEditStaffList() {
  var sel = document.getElementById('spEditStaffSelect');
  if (!sel || sel.dataset.loaded) return;
  spRpc('sp_list_staff_names', {}).then(function(res) {
    sel.dataset.loaded = '1';
    (res.data || []).forEach(function(row) {
      var opt = document.createElement('option');
      opt.textContent = row.name;
      sel.appendChild(opt);
    });
  });
}

function spOnEditStaffChange() {
  spCurrentEditStaff = document.getElementById('spEditStaffSelect').value;
  document.getElementById('spEditStaffHistory').style.display = spCurrentEditStaff ? 'block' : 'none';
  if (spCurrentEditStaff) spRenderStaffHistory();
}

// Clears one person's password so they land back on "create your password"
// next time they sign in — the RPC itself already exists (reset_staff_password
// in supabase_staff_portal.sql) but nothing in the UI called it until now.
function spResetOneStaffPassword() {
  if (!spCurrentEditStaff) return;
  if (!confirm('Reset the password for ' + spCurrentEditStaff + '? They\'ll need to set a new one next time they sign in.')) return;
  spRpc('reset_staff_password', { p_name: spCurrentEditStaff }).then(function(res) {
    if (!res.ok || !res.data) { spToast('Could not reset password.'); return; }
    spToast(spCurrentEditStaff + '’s password has been reset.');
  }).catch(function() { spToast('Connection error — try again.'); });
}

// Bulk version — resets every active staff member's password in one go, one
// RPC call per person (reset_staff_password only takes a single name).
function spResetAllStaffPasswords() {
  if (!confirm('Reset EVERY staff member’s password? Everyone will need to create a new password next time they sign in. This cannot be undone.')) return;
  spRpc('sp_list_staff_names', {}).then(function(res) {
    var names = (res.ok && Array.isArray(res.data)) ? res.data.map(function(r) { return r.name; }) : [];
    if (!names.length) { spToast('Could not load staff list.'); return; }
    var done = 0, failed = [];
    names.forEach(function(name) {
      spRpc('reset_staff_password', { p_name: name }).then(function(r) {
        if (!r.ok || !r.data) failed.push(name);
      }).catch(function() { failed.push(name); }).then(function() {
        done++;
        if (done === names.length) {
          spToast(failed.length ? ('Reset ' + (names.length - failed.length) + ' of ' + names.length + ' — failed: ' + failed.join(', ')) : ('Reset all ' + names.length + ' staff passwords.'));
        }
      });
    });
  }).catch(function() { spToast('Connection error — try again.'); });
}

function spRenderStaffHistory() {
  var el = document.getElementById('spEditHistoryList');
  if (!spCurrentEditStaff) return;
  spRpc('sp_staff_leave_history', { p_staff_name: spCurrentEditStaff }).then(function(res) {
    var rows = res.ok && Array.isArray(res.data) ? res.data : [];
    spHistoryRows = {};
    rows.forEach(function(r) { spHistoryRows[r.id] = r; });
    if (!rows.length) { el.innerHTML = '<div style="color:var(--mid);font-size:12px;">No entries yet.</div>'; return; }
    el.innerHTML = rows.map(spHistoryRowHtml).join('');
  });
}

function spHistoryRowHtml(r) {
  return '<div class="sp-req-item" id="sp-hist-' + r.id + '">'
    + '<div class="sp-req-top"><span class="sp-req-dates">' + spFmtDateRange(r.start_date, r.end_date) + ' &mdash; ' + r.days + ' ' + spEsc(r.type) + '</span><span class="sp-pill ' + r.status + '">' + r.status + '</span></div>'
    + (r.note ? '<div class="sp-req-note">' + spEsc(r.note) + '</div>' : '')
    + '<div class="sp-req-actions"><button class="sp-btn-approve" onclick="spStartEditRow(\'' + r.id + '\')">Edit</button><button class="sp-btn-decline" onclick="spDeleteHistoryRow(\'' + r.id + '\')">Delete</button></div>'
    + '</div>';
}

var SP_LEAVE_TYPES = ['holiday', 'sick', 'other', 'bank_holiday', 'shutdown'];
var SP_LEAVE_STATUSES = ['pending', 'approved', 'declined'];

function spOptions(values, selected) {
  return values.map(function(v) { return '<option value="' + v + '"' + (v === selected ? ' selected' : '') + '>' + v + '</option>'; }).join('');
}

function spStartEditRow(id) {
  var r = spHistoryRows[id];
  var el = document.getElementById('sp-hist-' + id);
  el.innerHTML = ''
    + '<div class="sp-row2"><div class="sp-field"><label>Start</label><input type="date" id="sp-edit-start-' + id + '" value="' + r.start_date + '"></div><div class="sp-field"><label>End</label><input type="date" id="sp-edit-end-' + id + '" value="' + r.end_date + '"></div></div>'
    + '<div class="sp-row2"><div class="sp-field"><label>Days</label><input type="number" step="0.5" id="sp-edit-days-' + id + '" value="' + r.days + '"></div><div class="sp-field"><label>Type</label><select id="sp-edit-type-' + id + '">' + spOptions(SP_LEAVE_TYPES, r.type) + '</select></div></div>'
    + '<div class="sp-field"><label>Status</label><select id="sp-edit-status-' + id + '">' + spOptions(SP_LEAVE_STATUSES, r.status) + '</select></div>'
    + '<div class="sp-field"><label>Note</label><input type="text" id="sp-edit-note-' + id + '" value="' + spEsc(r.note || '') + '"></div>'
    + '<div class="sp-req-actions"><button class="sp-btn-approve" onclick="spSaveEditRow(\'' + id + '\')">Save</button><button class="sp-btn-decline" onclick="spRenderStaffHistory()">Cancel</button></div>';
}

function spSaveEditRow(id) {
  var body = {
    p_id: id,
    p_start_date: document.getElementById('sp-edit-start-' + id).value,
    p_end_date: document.getElementById('sp-edit-end-' + id).value,
    p_days: parseFloat(document.getElementById('sp-edit-days-' + id).value),
    p_type: document.getElementById('sp-edit-type-' + id).value,
    p_note: document.getElementById('sp-edit-note-' + id).value || null,
    p_status: document.getElementById('sp-edit-status-' + id).value
  };
  spRpc('sp_manager_edit_leave_entry', body).then(function(res) {
    if (!res.ok) { spToast((res.data && res.data.message) || 'Could not save.'); return; }
    spToast('Saved.');
    spRenderStaffHistory();
    spRenderTeamSummary();
  });
}

function spDeleteHistoryRow(id) {
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  spRpc('sp_manager_delete_leave_entry', { p_id: id }).then(function(res) {
    if (!res.ok) { spToast((res.data && res.data.message) || 'Could not delete.'); return; }
    spToast('Deleted.');
    spRenderStaffHistory();
    spRenderTeamSummary();
  });
}

function spSubmitManagerAddEntry() {
  var err = document.getElementById('spAddEntryErr'); err.textContent = '';
  var start = document.getElementById('spAddStart').value;
  var end = document.getElementById('spAddEnd').value;
  var days = parseFloat(document.getElementById('spAddDays').value);
  var type = document.getElementById('spAddType').value;
  var note = document.getElementById('spAddNote').value;
  if (!spCurrentEditStaff) { err.textContent = 'Select a staff member first.'; return; }
  if (!start || !end) { err.textContent = 'Pick a start and end date.'; return; }
  if (!days) { err.textContent = 'Enter number of days.'; return; }
  spRpc('sp_manager_add_leave_entry', { p_staff_name: spCurrentEditStaff, p_start_date: start, p_end_date: end, p_days: days, p_type: type, p_note: note || null }).then(function(res) {
    if (!res.ok) { err.textContent = (res.data && res.data.message) || 'Could not add entry.'; return; }
    document.getElementById('spAddStart').value = '';
    document.getElementById('spAddEnd').value = '';
    document.getElementById('spAddDays').value = '';
    document.getElementById('spAddNote').value = '';
    spRenderStaffHistory();
    spRenderTeamSummary();
    spToast('Entry added.');
  });
}

function spRenderTeamSummary() {
  var el = document.getElementById('spTeamSummary');
  if (!el) return;
  spRpc('sp_team_summary', {}).then(function(res) {
    var rows = res.ok && Array.isArray(res.data) ? res.data : [];
    var body = rows.map(function(r) {
      return '<tr><td>' + spEsc(r.name) + '</td><td>' + r.days_used + '</td><td>' + r.days_remaining + '</td><td>' + r.sick_days + '</td></tr>';
    }).join('');
    el.innerHTML = '<table class="sp-dash-table"><tr><th>Name</th><th>Holiday used</th><th>Remaining</th><th>Sick days</th></tr>' + body + '</table>';
  });
}

function spRenderPendingRequests() {
  var el = document.getElementById('spMgrPending');
  if (!el) return;
  spRpc('sp_pending_requests', {}).then(function(res) {
    var rows = res.ok && Array.isArray(res.data) ? res.data : [];
    if (!rows.length) { el.innerHTML = '<div style="color:var(--mid);font-size:12px;">No pending requests.</div>'; return; }
    el.innerHTML = rows.map(function(r) {
      return '<div class="sp-req-item"><div class="sp-req-top"><span class="sp-req-dates">' + spEsc(r.name) + ' — ' + spFmtDateRange(r.start_date, r.end_date) + ' (' + r.days + (r.days == 1 ? ' day' : ' days') + ')</span><span class="sp-pill pending">pending</span></div>'
        + (r.note ? '<div class="sp-req-note">' + spEsc(r.note) + '</div>' : '')
        + '<div class="sp-req-actions"><button class="sp-btn-approve" onclick="spDecideRequest(\'' + r.id + '\',\'approved\')">✔ Approve</button><button class="sp-btn-decline" onclick="spDecideRequest(\'' + r.id + '\',\'declined\')">✕ Decline</button></div></div>';
    }).join('');
  });
}

function spDecideRequest(id, status) {
  spRpc('sp_decide_leave_request', { p_request_id: id, p_status: status }).then(function(res) {
    if (!res.ok) { spToast((res.data && res.data.message) || 'Could not update request.'); return; }
    spRenderPendingRequests();
    spRenderTeamSummary();
  });
}
