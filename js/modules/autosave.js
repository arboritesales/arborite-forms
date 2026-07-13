// ── AUTO-SAVE ──
var autoSaveTimer = null;
var AUTO_SAVE_PANELS = ['signoff', 'method', 'daily', 'powa', 'safety', 'emergency'];

function scheduleAutoSave(panelId, immediate) {
  if (!currentJobRef) return;
  if (AUTO_SAVE_PANELS.indexOf(panelId) === -1) return;
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  // A finished signature is a complete action, not something to debounce like
  // typing — save it right away so it can't be lost by navigating away inside
  // the old 2s window (text fields still debounce, to avoid saving every keystroke).
  autoSaveTimer = setTimeout(function() {
    autoSaveTimer = null;
    saveJob();
  }, immediate ? 300 : 2000);
}

function attachAutoSave(panelId) {
  var panel = document.getElementById(panelId);
  if (!panel) return;
  wireAutoSaveOn(panel, panelId);
}

// Wire change/input (and canvas mouseup/touchend) autosave listeners onto
// every relevant field inside root. Guarded with _autoSaveWired so calling
// this repeatedly (e.g. attachAutoSave on every panel open, plus addDrRow
// on every new row) never stacks duplicate listeners on the same element.
function wireAutoSaveOn(root, panelId) {
  if (!root) return;
  var inputs = root.querySelectorAll('input[type="text"], input[type="date"], textarea, select');
  for (var i = 0; i < inputs.length; i++) {
    var el = inputs[i];
    if (el._autoSaveWired) continue;
    el._autoSaveWired = true;
    el.addEventListener('change', function() { scheduleAutoSave(panelId); });
    el.addEventListener('input', function() { scheduleAutoSave(panelId); });
  }
  // Canvas changes (signatures) — save immediately, no debounce
  var canvases = root.querySelectorAll('canvas');
  for (var ci = 0; ci < canvases.length; ci++) {
    var canvas = canvases[ci];
    if (canvas._autoSaveWired) continue;
    canvas._autoSaveWired = true;
    canvas.addEventListener('mouseup', function() { scheduleAutoSave(panelId, true); });
    canvas.addEventListener('touchend', function() { scheduleAutoSave(panelId, true); });
  }
}


