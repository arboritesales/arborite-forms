// ── JOB SHARE LINKS ──
// Lets the team turn a job into a link a subcontractor can open with no
// login, landing straight on that one job's forms and nothing else. Backed
// by supabase_job_share_links.sql — a token-checked RPC pattern, same idea
// as Staff Portal's session tokens (staff-portal.js), not the shared team
// login used everywhere else in the app.

// ── SUBCONTRACTOR SIDE: bootstrapped from core-shared.js when ?jobLink=... is present ──
function bootstrapJobLink() {
  var ls = document.getElementById('lockScreen');
  if (ls) ls.style.display = 'none';
  fetch(SUPA_URL + '/rest/v1/rpc/job_share_link_load', {
    method: 'POST',
    headers: {'Content-Type':'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY},
    body: JSON.stringify({p_token: JOB_LINK_TOKEN}),
    credentials: 'omit', mode: 'cors'
  })
    .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, data:d}; }); })
    .then(function(res){
      if (!res.ok || !res.data || !res.data.length) { _showJobLinkError(); return; }
      _applyLoadedJobData(res.data[0].quote_ref, res.data[0].form_data);
      showDashboard();
      _applyJobLinkUiRestrictions();
    })
    .catch(function(){ _showJobLinkError(); });
}

function _showJobLinkError() {
  document.body.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'background:#2d5218;color:white;font-family:\'Barlow Condensed\',sans-serif;text-align:center;padding:40px;">' +
    '<div><div style="font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Link no longer active</div>' +
    '<div style="font-size:14px;opacity:.8;font-family:\'Barlow\',sans-serif;">Contact Arborite Tree Services for a new link.</div></div></div>';
}

function _applyJobLinkUiRestrictions() {
  var bar = document.querySelector('.dash-job-bar');
  if (bar) {
    var newBtn = bar.querySelector('.btn-new');
    var loadBtn = bar.querySelector('.btn-load');
    if (newBtn) newBtn.style.display = 'none';
    if (loadBtn) loadBtn.style.display = 'none';
  }
  var saveBtn = document.getElementById('dashSaveBtn');
  if (saveBtn) {
    saveBtn.textContent = '💾 Save';
    saveBtn.setAttribute('onclick', 'saveJob()');
  }
}

// ── TEAM SIDE: "Get link" button on each row of the Load Job list (jobs-storage.js renderJobList) ──
var _jobLinkManagerRef = null;

function openJobLinkManager(quoteRef) {
  _jobLinkManagerRef = quoteRef;
  document.getElementById('jobLinkModalRef').textContent = quoteRef;
  document.getElementById('jobLinkModalNewUrl').style.display = 'none';
  document.getElementById('jobLinkLabelInput').value = '';
  document.getElementById('jobLinkModal').className = 'modal-bg show';
  _refreshJobLinkList();
}

function closeJobLinkManager() {
  document.getElementById('jobLinkModal').className = 'modal-bg';
}

function _refreshJobLinkList() {
  var listEl = document.getElementById('jobLinkList');
  listEl.innerHTML = '<div class="job-empty">Loading…</div>';
  supaFetch('POST', 'rpc/list_job_share_links', {p_quote_ref: _jobLinkManagerRef})
    .then(function(r){ return r.json(); })
    .then(function(rows){
      if (!rows || !rows.length) { listEl.innerHTML = '<div class="job-empty">No links yet for this job.</div>'; return; }
      listEl.innerHTML = '';
      rows.forEach(function(row) {
        var item = document.createElement('div');
        item.className = 'job-item';
        var info = document.createElement('div');
        info.style.flex = '1';
        var label = document.createElement('div');
        label.className = 'job-item-ref';
        label.textContent = row.label || '(no label)';
        var sub = document.createElement('div');
        sub.className = 'job-item-info';
        sub.textContent = row.revoked ? 'Revoked' : 'Active — created ' + new Date(row.created_at).toLocaleDateString('en-GB');
        info.appendChild(label); info.appendChild(sub);
        item.appendChild(info);
        if (!row.revoked) {
          var revokeBtn = document.createElement('button');
          revokeBtn.className = 'job-del-btn'; revokeBtn.title = 'Revoke';
          revokeBtn.innerHTML = '&#x1F5D1;';
          revokeBtn.addEventListener('click', function() {
            if (!confirm('Revoke this link? The subcontractor will lose access immediately.')) return;
            supaFetch('POST', 'rpc/revoke_job_share_link', {p_token: row.token}).then(_refreshJobLinkList);
          });
          item.appendChild(revokeBtn);
        }
        listEl.appendChild(item);
      });
    })
    .catch(function(){ listEl.innerHTML = '<div class="job-empty" style="color:#c0392b;">Could not load links.</div>'; });
}

function createJobShareLink() {
  var label = document.getElementById('jobLinkLabelInput').value.trim();
  supaFetch('POST', 'rpc/create_job_share_link', {p_quote_ref: _jobLinkManagerRef, p_label: label || null})
    .then(function(r){ return r.json(); })
    .then(function(rows){
      if (!rows || !rows[0]) throw new Error('no token returned');
      var path = window.location.pathname.indexOf('index.html') !== -1
        ? window.location.pathname
        : window.location.pathname.replace(/\/?$/, '/index.html');
      var url = window.location.origin + path + '?jobLink=' + rows[0].token;
      var urlBox = document.getElementById('jobLinkModalNewUrl');
      urlBox.style.display = 'block';
      urlBox.querySelector('input').value = url;
      document.getElementById('jobLinkLabelInput').value = '';
      _refreshJobLinkList();
    })
    .catch(function(){ alert('Could not create link — check your connection and try again.'); });
}

function copyJobLinkUrl() {
  var input = document.getElementById('jobLinkModalNewUrl').querySelector('input');
  input.select();
  if (navigator.clipboard) navigator.clipboard.writeText(input.value).catch(function(){});
}
