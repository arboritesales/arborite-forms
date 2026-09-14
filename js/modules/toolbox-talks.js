// ── TOOLBOX TALKS ──
var currentTBTRef = null;

// ── TBT photos (reuses the defect-photos upload/storage helpers from
// defects-shared.js — same bucket, its own 'tbt/<ref>/' path prefix) ──
var TBT_PHOTOS_MAX = 6;
var tbtPhotos = [];

function resetTBTPhotos() {
  tbtPhotos = [];
  var input = document.getElementById('tbt_photoInput');
  if (input) input.value = '';
  renderTBTPhotos();
}

function renderTBTPhotos() {
  var wrap = document.getElementById('tbt_photos');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (var i = 0; i < tbtPhotos.length; i++) {
    (function(idx) {
      var p = tbtPhotos[idx];
      var tile = document.createElement('div');
      tile.style.cssText = 'width:72px;height:72px;border-radius:6px;border:2px solid var(--green);cursor:pointer;overflow:hidden;background:#fafafa;position:relative;';
      if (p.previewUrl) {
        var img = document.createElement('img');
        img.src = p.previewUrl;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        img.onclick = function() { openDefectLightbox(img); };
        tile.appendChild(img);
      } else {
        tile.textContent = '…';
        tile.style.display = 'flex'; tile.style.alignItems = 'center'; tile.style.justifyContent = 'center'; tile.style.color = '#999';
      }
      if (p.status === 'error') tile.style.borderColor = '#c62828';
      var del = document.createElement('div');
      del.className = 'tbt-no-print';
      del.textContent = '×';
      del.style.cssText = 'position:absolute;top:0;right:0;width:20px;height:20px;background:rgba(0,0,0,.6);color:white;display:flex;align-items:center;justify-content:center;font-size:14px;border-bottom-left-radius:6px;cursor:pointer;';
      del.onclick = function(e) {
        e.stopPropagation();
        if (!confirm('Remove this photo?')) return;
        tbtPhotos.splice(idx, 1);
        renderTBTPhotos();
      };
      tile.appendChild(del);
      wrap.appendChild(tile);
    })(i);
  }
  if (tbtPhotos.length < TBT_PHOTOS_MAX) {
    var addTile = document.createElement('div');
    addTile.className = 'tbt-no-print';
    addTile.style.cssText = 'width:72px;height:72px;border-radius:6px;border:2px dashed var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;color:#999;background:#fafafa;';
    addTile.textContent = '+';
    addTile.onclick = function() {
      var inp = document.getElementById('tbt_photoInput');
      if (inp) inp.click();
    };
    wrap.appendChild(addTile);
  }
}

function tbtPhotoUpload(input) {
  var file = input.files[0];
  input.value = '';
  if (!file) return;
  if (tbtPhotos.length >= TBT_PHOTOS_MAX) return;
  var slot = {previewUrl: '', storagePath: '', status: 'processing'};
  tbtPhotos.push(slot);
  renderTBTPhotos();
  _resizeImageToJpeg(file, 1600, 0.8, function(dataUrl) {
    if (!dataUrl) { slot.status = 'error'; renderTBTPhotos(); return; }
    slot.previewUrl = dataUrl;
    renderTBTPhotos();
    var path = 'tbt/' + (currentTBTRef || 'unfiled') + '/' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.jpg';
    _uploadDefectPhoto(path, dataUrl, 'image/jpeg').then(function(r) {
      if (r.ok) { slot.storagePath = path; slot.status = 'saved'; }
      else { slot.status = 'error'; }
      renderTBTPhotos();
    }).catch(function(){ slot.status = 'error'; renderTBTPhotos(); });
  });
}

function _tbtPhotoAuthUrl(path) {
  return SUPA_URL + '/storage/v1/object/authenticated/' + DEFECT_BUCKET + '/' + path;
}

function loadTBTPhotos(paths) {
  tbtPhotos = (paths || []).map(function(p) { return {previewUrl: '', storagePath: p, status: 'saved'}; });
  renderTBTPhotos();
  tbtPhotos.forEach(function(p) {
    fetch(_tbtPhotoAuthUrl(p.storagePath), {headers: {apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken()}})
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function(blob) { p.previewUrl = URL.createObjectURL(blob); renderTBTPhotos(); })
      .catch(function() {});
  });
}

function openTBTView() {
  document.getElementById('tbtView').style.display = 'block';
  fetchTBTList();
  showTBTList();
}

function closeTBTView() {
  document.getElementById('tbtView').style.display = 'none';
}

function showTBTList() {
  document.getElementById('tbtListPanel').style.display = 'block';
  document.getElementById('tbtFormPanel').style.display = 'none';
  currentTBTRef = null;
  document.getElementById('tbtView').scrollTop = 0;
}

function fetchTBTList() {
  var listEl = document.getElementById('tbtList');
  listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">Loading...</div>';
  supaFetch('GET', TABLE + '?select=id,quote_ref,updated_at,form_data&quote_ref=like.TBT-*&order=updated_at.desc&limit=100')
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      if (!Array.isArray(rows) || rows.length === 0) {
        listEl.innerHTML = '<div style="color:rgba(255,255,255,.5);padding:30px;text-align:center;font-size:13px;">No toolbox talks saved yet.<br><br>Tap <strong style="color:#7ec820;">+ New TBT</strong> to create one.</div>';
        return;
      }
      var html = '<div style="display:flex;flex-direction:column;gap:12px;">';
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var d = row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
        var topic = (row.form_data && row.form_data.tbt_topic) ? row.form_data.tbt_topic : '';
        var ref = row.quote_ref;
        // Build display: show topic as main heading if available, ref as secondary
        var mainLine = topic ? topic : ref;
        var subLine = topic ? ref + ' &nbsp;·&nbsp; ' + d : 'Last saved: ' + d;
        html += '<div style="background:#305818;border:1px solid rgba(126,200,32,.4);border-radius:8px;padding:16px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;-webkit-tap-highlight-color:transparent;" onclick="loadTBT(\'' + ref + '\')">'
          + '<div style="flex:1;min-width:0;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:800;color:#7ec820;letter-spacing:.5px;">' + mainLine + '</div>'
          + '<div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;">' + subLine + '</div></div>'
          + '<div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">'
          + '<button onclick="event.stopPropagation();deleteTBT(\'' + ref + '\')" style="background:none;border:1px solid rgba(255,100,100,.5);border-radius:3px;color:#ff8888;font-size:14px;padding:3px 8px;cursor:pointer;line-height:1.4;" title="Delete">&#x1F5D1;</button>'
          + '<div style="font-size:22px;color:rgba(126,200,32,.6);">&#8250;</div>'
          + '</div>'
          + '</div>';
      }
      html += '</div>';
      listEl.innerHTML = html;
    })
    .catch(function() {
      listEl.innerHTML = '<div style="color:#f8d7da;padding:30px;text-align:center;font-size:13px;">Could not load records — check connection.</div>';
    });
}

function generateTBTRef() {
  var d = new Date();
  var yr = d.getFullYear();
  var mo = String(d.getMonth()+1).padStart(2,'0');
  var dy = String(d.getDate()).padStart(2,'0');
  var rand = String(Math.floor(Math.random()*900)+100);
  return 'TBT-' + yr + mo + dy + '-' + rand;
}

function newTBT() {
  clearTBTFormFields();
  currentTBTRef = generateTBTRef();
  document.getElementById('tbtRef').textContent = currentTBTRef;
  document.getElementById('tbt_date').value = new Date().toISOString().slice(0,10);
  showTBTForm();
}

function showTBTForm() {
  document.getElementById('tbtListPanel').style.display = 'none';
  document.getElementById('tbtFormPanel').style.display = 'block';
  document.getElementById('tbtView').scrollTop = 0;
  setTimeout(function() { for (var i = 1; i <= 20; i++) initSig('tbt_sig_' + i); }, 60);
}

function clearTBTFormFields() {
  var panel = document.getElementById('tbtFormPanel');
  if (!panel) return;
  var inputs = panel.querySelectorAll('input[type="text"], input[type="date"], textarea');
  for (var i = 0; i < inputs.length; i++) inputs[i].value = '';
  for (var s = 1; s <= 20; s++) {
    var id = 'tbt_sig_' + s;
    var p = pads[id];
    if (p && p.ctx && p.canvas) { p.ctx.clearRect(0, 0, p.canvas.width, p.canvas.height); p.dataUrl = null; }
  }
  resetTBTPhotos();
}

function loadTBT(ref) {
  currentTBTRef = ref;
  document.getElementById('tbtRef').textContent = ref;
  supaFetch('GET', TABLE + '?quote_ref=eq.' + encodeURIComponent(ref) + '&select=form_data&limit=1')
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      clearTBTFormFields();
      showTBTForm();
      if (!rows || !rows[0] || !rows[0].form_data) return;
      var data = rows[0].form_data;
      var panel = document.getElementById('tbtFormPanel');
      var inputs = panel.querySelectorAll('input[type="text"][id], input[type="date"][id], textarea[id]');
      for (var i = 0; i < inputs.length; i++) {
        if (data[inputs[i].id] !== undefined) inputs[i].value = data[inputs[i].id];
      }
      if (data.signatures) {
        setTimeout(function() {
          for (var s = 1; s <= 20; s++) {
            var id = 'tbt_sig_' + s;
            if (data.signatures[id]) restoreSig(id, data.signatures[id]);
          }
        }, 80);
      }
      loadTBTPhotos(data.tbt_photos);
    })
    .catch(function() { showTBTForm(); });
}

function saveTBT() {
  if (!currentTBTRef) return;
  var btn = document.getElementById('tbtSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  var panel = document.getElementById('tbtFormPanel');
  var data = { signatures: {} };
  var inputs = panel.querySelectorAll('input[type="text"][id], input[type="date"][id], textarea[id]');
  for (var i = 0; i < inputs.length; i++) data[inputs[i].id] = inputs[i].value;
  data.tbt_photos = tbtPhotos.filter(function(p) { return p.storagePath; }).map(function(p) { return p.storagePath; });
  for (var s = 1; s <= 20; s++) {
    var id = 'tbt_sig_' + s;
    var p = pads[id];
    if (!p || !p.sized) continue;
    var cv = p.canvas || document.getElementById(id);
    if (!cv) continue;
    try {
      var tmp = document.createElement('canvas');
      tmp.width = cv.width; tmp.height = cv.height;
      var ctx2 = tmp.getContext('2d');
      ctx2.fillStyle = '#ffffff';
      ctx2.fillRect(0, 0, tmp.width, tmp.height);
      ctx2.drawImage(cv, 0, 0);
      var url = tmp.toDataURL('image/jpeg', 0.6);
      if (url && url.length > 100) data.signatures[id] = url;
    } catch(e) {}
  }
  var payload = { quote_ref: currentTBTRef, updated_at: new Date().toISOString(), form_data: data };
  supaFetch('POST', TABLE + '?on_conflict=quote_ref', payload)
    .then(function(r) {
      if (btn) btn.disabled = false;
      if (r.ok || r.status === 201 || r.status === 204) {
        if (btn) { btn.textContent = '✓ Saved'; setTimeout(function(){ btn.textContent = 'Save'; }, 2000); }
      } else {
        if (btn) { btn.textContent = 'Save failed'; setTimeout(function(){ btn.textContent = 'Save'; }, 2500); }
      }
    })
    .catch(function() {
      if (btn) { btn.disabled = false; btn.textContent = 'Save failed'; setTimeout(function(){ btn.textContent = 'Save'; }, 2500); }
    });
}

function printTBT() {
  var view = document.getElementById('tbtView');
  view.classList.add('printing-tbt');
  _printWithClass(function() { view.classList.remove('printing-tbt'); });
}

