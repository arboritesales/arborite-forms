// ── DEFECTS (shared "Are there any defects?" block used by the vehicle form
// and every equipment category form — one prefix per form instance, e.g.
// 'veh' or 'cat_stump') ──
var DEFECT_BUCKET = 'defect-photos';
var DEFECT_STATE = {};
function defectState(prefix) {
  if (!DEFECT_STATE[prefix]) DEFECT_STATE[prefix] = { flag: '', comment: '', photos: [] };
  return DEFECT_STATE[prefix];
}
function resetDefectState(prefix) {
  DEFECT_STATE[prefix] = { flag: '', comment: '', photos: [] };
  var panel = document.getElementById(prefix + '_defectPanel');
  if (panel) panel.style.display = 'none';
  var photoInput = document.getElementById(prefix + '_defectPhotoInput');
  if (photoInput) photoInput.value = '';
  renderDefectPhotos(prefix);
}
function defectAutoSaveHook(prefix) {
  if (prefix === 'veh') vehAutoSave();
  else if (prefix.indexOf('cat_') === 0) catAutoSave(prefix.substring(4));
}
function defectBlockHtml(prefix) {
  return '<div style="background:white;border-radius:8px;margin-bottom:14px;overflow:hidden;">'
    + '<div style="background:#2d5218;padding:10px 16px;font-family:\'Barlow Condensed\',sans-serif;font-size:13px;font-weight:800;color:var(--lime);text-transform:uppercase;letter-spacing:1px;">&#9888;&#65039; Defects</div>'
    + '<div class="field-row lw"><div class="fc lbl">Are there any defects?</div><div class="fc veh-opts" id="' + prefix + '_defect">'
    + '<button class="veh-btn" onclick="defectSel(\'' + prefix + '\',this,\'Yes\')">Yes</button>'
    + '<button class="veh-btn" onclick="defectSel(\'' + prefix + '\',this,\'No\')">No</button>'
    + '</div></div>'
    + '<div id="' + prefix + '_defectPanel" style="display:none;padding:0 14px 14px;">'
    + '<div style="font-size:12px;color:var(--mid);font-weight:600;margin-bottom:6px;">Photos of the defect (up to 3)</div>'
    + '<div id="' + prefix + '_defectPhotos" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;"></div>'
    + '<input type="file" id="' + prefix + '_defectPhotoInput" accept="image/*" style="display:none;" onchange="defectPhotoUpload(\'' + prefix + '\',this)">'
    + '<div style="font-size:12px;color:var(--mid);font-weight:600;margin-bottom:6px;">Comment</div>'
    + '<textarea id="' + prefix + '_defectComment" rows="2" placeholder="Describe the defect..." style="width:100%;border:1px solid var(--border);border-radius:3px;padding:8px;font-size:13px;font-family:\'Barlow\',sans-serif;outline:none;resize:vertical;" oninput="defectCommentInput(\'' + prefix + '\')"></textarea>'
    + '</div></div>';
}
function defectSel(prefix, btn, val) {
  var group = document.getElementById(prefix + '_defect');
  group.querySelectorAll('.veh-btn').forEach(function(b){ b.className = 'veh-btn'; });
  btn.classList.add(val === 'Yes' ? 'active-poor' : 'active-good');
  defectState(prefix).flag = val;
  var panel = document.getElementById(prefix + '_defectPanel');
  if (panel) panel.style.display = (val === 'Yes') ? 'block' : 'none';
  renderDefectPhotos(prefix);
  defectAutoSaveHook(prefix);
}
function defectCommentInput(prefix) {
  var el = document.getElementById(prefix + '_defectComment');
  defectState(prefix).comment = el ? el.value : '';
  defectAutoSaveHook(prefix);
}
function renderDefectPhotos(prefix) {
  var wrap = document.getElementById(prefix + '_defectPhotos');
  if (!wrap) return;
  var photos = defectState(prefix).photos;
  wrap.innerHTML = '';
  for (var i = 0; i < 3; i++) {
    var tile = document.createElement('div');
    if (photos[i]) {
      var p = photos[i];
      tile.style.cssText = 'width:64px;height:64px;border-radius:6px;border:2px solid var(--green);cursor:pointer;overflow:hidden;background:#fafafa;position:relative;';
      if (p.previewUrl) {
        var img = document.createElement('img');
        img.src = p.previewUrl;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        tile.appendChild(img);
      } else {
        tile.textContent = '…';
        tile.style.display = 'flex'; tile.style.alignItems = 'center'; tile.style.justifyContent = 'center'; tile.style.color = '#999';
      }
      if (p.status === 'error') tile.style.borderColor = '#c62828';
      (function(idx){
        tile.onclick = function(){
          if (!confirm('Remove this photo?')) return;
          photos.splice(idx, 1);
          renderDefectPhotos(prefix);
          defectAutoSaveHook(prefix);
        };
      })(i);
    } else if (i === photos.length) {
      tile.style.cssText = 'width:64px;height:64px;border-radius:6px;border:2px dashed var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;color:#999;background:#fafafa;';
      tile.textContent = '+';
      tile.onclick = function(){
        var inp = document.getElementById(prefix + '_defectPhotoInput');
        if (inp) inp.click();
      };
    } else {
      continue; // no placeholder beyond the very next open slot
    }
    wrap.appendChild(tile);
  }
}
// Downscale to a max dimension + JPEG compress before upload — phone camera
// photos are several MB each and up to 3 per defect would otherwise be a
// heavy, slow upload on a site with poor signal.
function _resizeImageToJpeg(file, maxDim, quality, cb) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      var scale = Math.min(1, maxDim / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
      var canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
      cb(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function(){ cb(e.target.result); };
    img.src = e.target.result;
  };
  reader.onerror = function(){ cb(null); };
  reader.readAsDataURL(file);
}
function _uploadDefectPhoto(path, dataUrl, mimeType) {
  var base64 = dataUrl.split(',')[1];
  var chars = atob(base64), bytes = new Uint8Array(chars.length);
  for (var i = 0; i < chars.length; i++) bytes[i] = chars.charCodeAt(i);
  return fetch(SUPA_URL + '/storage/v1/object/' + DEFECT_BUCKET + '/' + path, {
    method: 'POST',
    headers: {'apikey':SUPA_KEY,'Authorization':'Bearer '+_authToken(),'Content-Type':mimeType||'image/jpeg','x-upsert':'true'},
    body: bytes, credentials: 'omit', mode: 'cors'
  });
}
function defectPhotoUpload(prefix, input) {
  var file = input.files[0];
  input.value = '';
  if (!file) return;
  var photos = defectState(prefix).photos;
  if (photos.length >= 3) return;
  var slot = {previewUrl: '', storagePath: '', status: 'processing'};
  photos.push(slot);
  renderDefectPhotos(prefix);
  _resizeImageToJpeg(file, 1600, 0.8, function(dataUrl) {
    if (!dataUrl) { slot.status = 'error'; renderDefectPhotos(prefix); return; }
    slot.previewUrl = dataUrl;
    renderDefectPhotos(prefix);
    var path = prefix + '/' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.jpg';
    _uploadDefectPhoto(path, dataUrl, 'image/jpeg').then(function(r) {
      if (r.ok) { slot.storagePath = path; slot.status = 'saved'; }
      else { slot.status = 'error'; }
      renderDefectPhotos(prefix);
      defectAutoSaveHook(prefix);
    }).catch(function(){ slot.status = 'error'; renderDefectPhotos(prefix); });
  });
}
// What actually gets merged into the check's save payload
function getDefectPayload(prefix) {
  var st = defectState(prefix);
  return {
    has_defect: st.flag === 'Yes',
    defect_comment: st.flag === 'Yes' ? (st.comment || null) : null,
    defect_images: st.flag === 'Yes' ? st.photos.map(function(p){ return p.storagePath; }).filter(Boolean) : []
  };
}

