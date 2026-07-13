// ── SIGNATURES ──
function initSig(id) {
  var canvas = document.getElementById(id);
  if (!canvas) return;
  if (!canvas._listenersAttached) {
    canvas._listenersAttached = true;
    attachSigListeners(canvas, id);
  }
  var rect = canvas.getBoundingClientRect();
  var cw = rect.width;
  if (cw < 10) return;
  if (pads[id] && pads[id].sized) return;
  var dpr = window.devicePixelRatio || 1;
  var ch = parseInt(canvas.getAttribute('height')) || 90;
  canvas.width  = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  canvas.style.width  = cw + 'px';
  canvas.style.height = ch + 'px';
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.strokeStyle = '#1a1a3a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (pads[id]) { pads[id].canvas = canvas; pads[id].ctx = ctx; pads[id].sized = true; }
  else          { pads[id] = {canvas:canvas, ctx:ctx, sized:true}; }
}

function attachSigListeners(canvas, id) {
  if (!pads[id]) pads[id] = {canvas:canvas, ctx:null, sized:false};
  var drawing = false, lx = 0, ly = 0;
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    var s = e.touches ? e.touches[0] : e;
    return [s.clientX - r.left, s.clientY - r.top];
  }
  function startDraw(e) { initSig(id); drawing = true; var p = pos(e); lx = p[0]; ly = p[1]; }
  function doDraw(e) {
    if (!drawing) return;
    var pad = pads[id];
    if (!pad || !pad.ctx || !pad.sized) return;
    var p = pos(e);
    pad.ctx.beginPath(); pad.ctx.moveTo(lx, ly); pad.ctx.lineTo(p[0], p[1]); pad.ctx.stroke();
    lx = p[0]; ly = p[1];
  }
  function saveDataUrl() {
    try {
      var url = canvas.toDataURL('image/png');
      if (url && url.length > 100 && url !== 'data:,') {
        pads[id].dataUrl = url;
        sigCache[id] = url; // keep in cache so it redraws when switching tabs
        // Trigger auto-save for whichever panel this canvas lives in
        var el = canvas.parentNode;
        while (el && el !== document.body) {
          if (el.id && AUTO_SAVE_PANELS.indexOf(el.id) !== -1) {
            scheduleAutoSave(el.id, true);
            break;
          }
          el = el.parentNode;
        }
      }
    } catch(e) {}
  }
  canvas.addEventListener('mousedown',  function(e){ startDraw(e); });
  canvas.addEventListener('mousemove',  function(e){ doDraw(e); });
  canvas.addEventListener('mouseup',    function(){ drawing = false; saveDataUrl(); });
  canvas.addEventListener('mouseleave', function(){ drawing = false; });
  canvas.addEventListener('touchstart', function(e){ e.preventDefault(); startDraw(e); }, {passive:false});
  canvas.addEventListener('touchmove',  function(e){ e.preventDefault(); doDraw(e); },   {passive:false});
  canvas.addEventListener('touchend',   function(){ drawing = false; saveDataUrl(); });
}

function clrSig(id) {
  var p = pads[id];
  if (p) {
    if (p.ctx && p.sized) p.ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
    p.dataUrl = null;
  }
}
function initAllSigs() {
  var cs = document.querySelectorAll('.sig-wrap canvas');
  for (var i = 0; i < cs.length; i++) initSig(cs[i].id);
}

