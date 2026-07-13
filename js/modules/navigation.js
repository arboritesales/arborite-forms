// ── JOB SELECT SCREEN ──
var _fromJobSelect = false;

function showJobSelectScreen() {
  var jss  = document.getElementById('jobSelectScreen');
  var dash = document.getElementById('dashboard');
  var app  = document.getElementById('appView');
  var off  = document.getElementById('officeView');
  if (jss)  jss.style.display  = 'block';
  if (dash) dash.style.display = 'none';
  if (app)  app.style.display  = 'none';
  if (off)  off.style.display  = 'none';
  var officeTile = document.getElementById('officeTile');
  if (officeTile) officeTile.style.display = managerUnlocked ? '' : 'none';
}

function showNewJobFromSelect() {
  _fromJobSelect = true;
  showNewJobModal();
}

function showLoadJobFromSelect() {
  _fromJobSelect = true;
  showLoadModal();
}

// ── DASHBOARD NAVIGATION ──
function showDashboard() {
  var jss  = document.getElementById('jobSelectScreen');
  var dash = document.getElementById('dashboard');
  var app  = document.getElementById('appView');
  var off  = document.getElementById('officeView');
  if (jss)  jss.style.display  = 'none';
  if (dash) dash.style.display = 'block';
  if (app)  app.style.display  = 'none';
  if (off)  off.style.display  = 'none';
  var ref = currentJobRef || 'No job loaded';
  var el = document.getElementById('dash-job-ref-display');
  if (el) el.textContent = ref;
  var btn = document.getElementById('dashSaveBtn');
  if (btn) btn.disabled = !currentJobRef;
  // Reset all panels to hidden ready for next openForm
  var allPanels = document.querySelectorAll('.panel');
  for (var pi = 0; pi < allPanels.length; pi++) allPanels[pi].style.display = 'none';
}

function backToDashboard() {
  if (openedFromOffice) {
    openedFromOffice = false;
    document.getElementById('appView').style.display = 'none';
    openOffice();
  } else {
    document.getElementById('officeView').style.display = 'none';
    showDashboard();
  }
}

var currentPanelId = 'signoff';
var openedFromOffice = false;

function openForm(panelId) {
  if (!openedFromOffice) openedFromOffice = false;
  currentPanelId = panelId;
  var dash = document.getElementById('dashboard');
  var app  = document.getElementById('appView');
  if (dash) dash.style.display = 'none';
  if (app)  app.style.display  = 'block';
  // Show only the selected panel
  var allPanels = document.querySelectorAll('.panel');
  for (var i = 0; i < allPanels.length; i++) {
    allPanels[i].style.display = (allPanels[i].id === panelId) ? 'block' : 'none';
  }
  var titles = {
    signoff:'Work Spec & Client Sign Off',
    method:'Method Statement & Sign Off',
    daily:'Daily Task Register',
    powa:'POWA',
    audit:'Audit',
    documents:'Documents',
    emergency:'Emergency Procedure',
    safety:'Safety Checks',
    cfra:'Common Factor Risk Assessment'
  };
  var titleEl = document.getElementById('appViewTitle');
  if (titleEl) titleEl.textContent = titles[panelId] || panelId;
  var appRef = document.getElementById('appBarRef');
  if (appRef) appRef.textContent = currentJobRef || 'No job loaded';
  var btn = document.getElementById('appSaveBtn');
  if (btn) btn.disabled = !currentJobRef;
  // Copy logo src to app header
  var dashLogo = document.querySelector('.dash-header-logo img');
  var appLogo = document.getElementById('appHeaderLogo');
  if (dashLogo && appLogo) appLogo.src = dashLogo.src;
  // Update back button label
  var backBtn = document.querySelector('#appViewHeader button[onclick="backToDashboard()"]');
  if (backBtn) backBtn.textContent = openedFromOffice ? '\u2190 Office' : '\u2190 Dashboard';
  // Init staff selects, signatures and auto-save for this panel
  setTimeout(function() {
    initAllStaffSelects();
    var cs = document.querySelectorAll('#' + panelId + ' .sig-wrap canvas');
    for (var ci = 0; ci < cs.length; ci++) {
      initSig(cs[ci].id);
      if (sigCache[cs[ci].id]) _paintSigOnCanvas(cs[ci].id, sigCache[cs[ci].id]);
    }
    attachAutoSave(panelId);
  }, 80);
  if (panelId === 'documents') setTimeout(renderAllDocLists, 100);
}

function printCurrentForm() {
  printPanel(currentPanelId);
}

