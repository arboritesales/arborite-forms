// ── SURVEY REPORT (Manager Access) ──
// Flags any answered field that didn't classify as the top score, using the
// same catOptionClass() bucketing already used to colour the record detail views.
var _surveyReportData = null;

// Fields that are identity/metadata rather than a quality score, per kind —
// reused by both the single-record Survey Report and the Defects dashboard.
function _surveyMeta(kind, cat) {
  if (kind === 'vehicle') return { fieldRows: null, skipLabels: { 'Vehicle': 1, 'Mileage': 1 } };
  var cfg = CHECK_CATEGORIES[cat];
  var skipLabels = {};
  if (cfg && cfg.hasMileage) skipLabels[cfg.mileageLabel] = 1;
  return { cfg: cfg, skipLabels: skipLabels };
}

// Buckets a record's answered fields into good/fair/poor/na and lists what's flagged.
function _scoreFieldRows(fieldRows, skipLabels) {
  var counts = { good: 0, fair: 0, poor: 0, na: 0 };
  var flagged = [];
  fieldRows.forEach(function(f) {
    var label = f[0], val = f[1];
    if (val === undefined || val === null || val === '') return;
    if (skipLabels[label]) return; // identity/meta fields (reg, mileage/hours) aren't a quality score
    var cls = catOptionClass(String(val));
    if (cls === 'active-good') counts.good++;
    else if (cls === 'active-na') counts.na++;
    else {
      if (cls === 'active-fair') counts.fair++;
      else counts.poor++; // active-poor and any other non-good bucket
      flagged.push([label, val]);
    }
  });
  return { counts: counts, flagged: flagged };
}

function _surveyBuildData(kind, cat) {
  var d, fieldRows, title, meta = _surveyMeta(kind, cat);
  if (kind === 'vehicle') {
    d = _vehDetailData;
    fieldRows = d ? vehFieldList(d) : [];
    title = 'Vehicle Check — ' + (d && d.vehicle ? d.vehicle : '');
  } else {
    d = _catDetailData[cat];
    fieldRows = d ? catFieldRows(cat, d) : [];
    title = (meta.cfg ? meta.cfg.label : cat) + ' Check — ' + (d && d.machine ? d.machine : '');
  }
  var scored = _scoreFieldRows(fieldRows, meta.skipLabels);
  return {
    d: d, kind: kind, cat: cat, title: title,
    inspector: (d && d.inspector_name) || '',
    dateStr: (d && d.created_at) ? new Date(d.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '',
    counts: scored.counts, flagged: scored.flagged
  };
}

function _surveyChartSVG(counts) {
  var total = counts.good + counts.fair + counts.poor;
  if (total === 0) return '<div style="color:#888;font-size:12px;">No scored items on this record.</div>';
  var r = 60, cx = 80, cy = 80, sw = 20;
  var circumference = 2 * Math.PI * r;
  var goodFrac = counts.good / total;
  var goodLen = circumference * goodFrac;
  var flagLen = circumference - goodLen;
  return '<svg viewBox="0 0 160 160" width="160" height="160">'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#e6e6e6" stroke-width="' + sw + '"/>'
    + (flagLen > 0 ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#c62828" stroke-width="' + sw + '" stroke-dasharray="' + flagLen + ' ' + circumference + '" stroke-dashoffset="' + (-goodLen) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>' : '')
    + (goodLen > 0 ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#2d5a1b" stroke-width="' + sw + '" stroke-dasharray="' + goodLen + ' ' + circumference + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>' : '')
    + '<text x="' + cx + '" y="' + (cy + 8) + '" text-anchor="middle" font-size="26" font-weight="800" fill="#222" font-family="Barlow Condensed, sans-serif">' + Math.round(goodFrac * 100) + '%</text>'
    + '</svg>';
}

function openSurveyReport(kind, cat) {
  var data = _surveyBuildData(kind, cat);
  if (!data.d) { alert('This record hasn\'t loaded yet — please try again.'); return; }
  _surveyReportData = data;
  renderSurveyReport(data);
  document.getElementById('surveyReportView').style.display = 'block';
  document.getElementById('surveyReportView').scrollTop = 0;
}

function closeSurveyReport() {
  document.getElementById('surveyReportView').style.display = 'none';
  _surveyReportData = null;
}

function renderSurveyReport(data) {
  var flaggedHtml = data.flagged.length
    ? data.flagged.map(function(f) {
        return '<div class="field-row lw"><div class="fc lbl">' + f[0] + '</div><div class="fc" style="padding:10px 14px;color:#c62828;font-weight:700;">' + f[1] + '</div></div>';
      }).join('')
    : '<div style="padding:20px;text-align:center;color:#2d5a1b;font-weight:700;">&#10003; Everything scored top marks — nothing flagged.</div>';

  document.getElementById('surveyReportContent').innerHTML =
    '<div style="text-align:center;padding:0 0 16px;"><img src="arborite-logo-192.png" style="height:56px;" alt="Arborite"></div>'
    + '<div style="text-align:center;font-family:\'Barlow Condensed\',sans-serif;font-size:22px;font-weight:800;color:#222;margin-bottom:2px;">Survey Report</div>'
    + '<div style="text-align:center;font-size:13px;color:#555;margin-bottom:6px;">' + data.title + '</div>'
    + '<div style="text-align:center;font-size:12px;color:#888;margin-bottom:20px;">' + (data.inspector ? data.inspector + ' &middot; ' : '') + data.dateStr + '</div>'
    + '<div style="display:flex;justify-content:center;margin-bottom:10px;">' + _surveyChartSVG(data.counts) + '</div>'
    + '<div style="text-align:center;font-size:12px;color:#555;margin-bottom:24px;">'
      + data.counts.good + ' Good &nbsp;&middot;&nbsp; ' + data.counts.fair + ' Fair &nbsp;&middot;&nbsp; ' + data.counts.poor + ' Poor'
      + (data.counts.na ? ' &nbsp;&middot;&nbsp; ' + data.counts.na + ' N/A' : '')
    + '</div>'
    + '<div class="sec-head">Flagged Items (not top score)</div>'
    + '<div style="background:white;border:1px solid var(--border);border-radius:8px;overflow:hidden;">' + flaggedHtml + '</div>';
}

function printSurveyReport() {
  var view = document.getElementById('surveyReportView');
  view.classList.add('printing-survey');
  _printWithClass(function() { view.classList.remove('printing-survey'); });
}

function exportSurveyExcel() {
  if (!_surveyReportData) return;
  var data = _surveyReportData;
  var meta = [
    ['Inspector', data.inspector],
    ['Date', data.dateStr],
    ['Good', data.counts.good],
    ['Fair', data.counts.fair],
    ['Poor', data.counts.poor],
    ['N/A', data.counts.na]
  ];
  var rows = data.flagged.length ? data.flagged : [['(none)', 'Everything scored top marks']];
  var filename = 'Survey_Report_' + safeFileSegment(data.title) + '.xlsx';
  exportFieldsToExcel(filename, 'Survey Report — ' + data.title, meta, rows);
}

