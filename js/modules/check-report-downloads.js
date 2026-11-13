// ── CHECK REPORT DOWNLOADS (Weekly Report, Manager Access) — a PDF of any
// one check straight from the report list, without opening the record, and
// every finished report for the week or the month as PDFs in one ZIP file,
// for moving into storage at the end of each week or month. PDFs are built
// with pdfmake (_loadPdfMake), the ZIP with JSZip — both fetched on first use. ──
var JSZIP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
var _jszipQueue = null;
function _withJsZip(cb) {
  if (typeof JSZip !== 'undefined') { cb(); return; }
  if (_jszipQueue) { _jszipQueue.push(cb); return; }
  _jszipQueue = [cb];
  var s = document.createElement('script');
  s.src = JSZIP_CDN;
  s.onload = function() { var q = _jszipQueue; _jszipQueue = null; q.forEach(function(fn) { fn(); }); };
  s.onerror = function() { var q = _jszipQueue; _jszipQueue = null; s.parentNode.removeChild(s); q.forEach(function(fn) { fn(true); }); };
  document.head.appendChild(s);
}

function _withPdfMake(cb, fail) {
  _loadPdfMake(function(err) {
    if (err || typeof pdfMake === 'undefined') { fail('PDF download is unavailable — please check your internet connection and try again.'); return; }
    cb();
  });
}

function _reportSource(kind, cat) {
  return kind === 'vehicle'
    ? { table: 'vehicle_checks', label: 'Vehicle', name: function(d) { return d.vehicle; }, fields: vehFieldList }
    : { table: CHECK_CATEGORIES[cat].table, label: CHECK_CATEGORIES[cat].label, name: function(d) { return d.machine; }, fields: function(d) { return catFieldRows(cat, d); } };
}

function _pdfAnswerColour(val) {
  if (/good|yes|correct|excellent/i.test(val)) return '#2d5a1b';
  if (/poor|no\b|unsatisfactory|damaged|requires|not working|too low/i.test(val)) return '#c62828';
  if (/fair|low|satisfactory/i.test(val)) return '#7a4d00';
  return '#222222';
}

function _checkPdfDoc(kind, cat, d) {
  var src = _reportSource(kind, cat);
  var name = src.name(d) || 'Unknown';
  var when = d.created_at ? new Date(d.created_at) : null;
  var rating = _ratingWord(d.overall_rating);
  var rows = [[{ text: 'Item', style: 'th' }, { text: 'Result', style: 'th' }]];
  src.fields(d).forEach(function(f) {
    if (f[1] === undefined || f[1] === null || f[1] === '') return;
    var val = String(f[1]);
    rows.push([{ text: String(f[0]), style: 'cell' }, { text: val, style: 'cell', bold: !f[2], color: f[2] ? '#222222' : _pdfAnswerColour(val) }]);
  });
  var content = [
    { text: 'ARBORITE TREE SERVICES', style: 'brand' },
    { text: src.label + ' Check — ' + name, style: 'title' },
    { table: { widths: [110, '*'], body: [
        [{ text: 'Inspector', style: 'metaLbl' }, { text: d.inspector_name || '', style: 'cell' }],
        [{ text: 'Date', style: 'metaLbl' }, { text: when ? when.toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long',year:'numeric'}) + ', ' + when.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}) : '', style: 'cell' }],
        [{ text: 'Overall rating', style: 'metaLbl' }, { text: rating || 'Not finished', style: 'cell', bold: true, color: _pdfAnswerColour(rating) }]
      ] }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 14] },
    { table: { headerRows: 1, widths: ['*', 170], body: rows }, layout: 'lightHorizontalLines' }
  ];
  if (d.remedial_notes) {
    content.push({ text: 'Remedial maintenance / actions taken', style: 'h2' }, { text: d.remedial_notes, style: 'cell' });
  }
  content.push({ text: 'Defects', style: 'h2' });
  if (d.has_defect) {
    var photos = Array.isArray(d.defect_images) ? d.defect_images.length : 0;
    content.push({ text: d.defect_comment || 'Defect reported (no comment).', style: 'cell', color: '#c62828' });
    if (photos) content.push({ text: photos + ' photo' + (photos === 1 ? '' : 's') + ' — view in the app', style: 'small' });
    content.push({ text: 'Status: ' + (d.defect_status === 'fixed' || d.defect_status === 'cleared' ? 'Resolved' : 'Not resolved') + (d.office_note ? ' — ' + d.office_note : ''), style: 'small' });
  } else {
    content.push({ text: 'No defects reported.', style: 'cell' });
  }
  return {
    pageSize: 'A4', pageMargins: [40, 40, 40, 40],
    content: content,
    footer: function(page, pages) { return { text: name + ' · page ' + page + ' of ' + pages, style: 'small', alignment: 'center', margin: [0, 10, 0, 0] }; },
    styles: {
      brand: { fontSize: 9, bold: true, color: '#2d5218', characterSpacing: 1.5, margin: [0, 0, 0, 2] },
      title: { fontSize: 17, bold: true, margin: [0, 0, 0, 12] },
      h2: { fontSize: 12, bold: true, color: '#2d5218', margin: [0, 14, 0, 4] },
      th: { fontSize: 9.5, bold: true, color: '#555555' },
      metaLbl: { fontSize: 9.5, bold: true, color: '#555555' },
      cell: { fontSize: 9.5 },
      small: { fontSize: 8.5, color: '#777777', margin: [0, 3, 0, 0] }
    },
    defaultStyle: { fontSize: 9.5 }
  };
}

function _checkPdfName(kind, cat, d) {
  var src = _reportSource(kind, cat);
  var day = d.created_at ? _isoDate(new Date(d.created_at)) : 'undated';
  return day + '_' + safeFileSegment(src.label) + '_' + safeFileSegment(src.name(d)) + '_' + safeFileSegment(d.inspector_name || '') + '_' + String(d.id).slice(0, 6) + '.pdf';
}

function _busy(btn, text) {
  if (!btn) return function() {};
  var old = btn.innerHTML;
  btn.disabled = true; btn.style.opacity = '.6'; btn.innerHTML = text;
  return function(msg) { btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = old; if (msg) alert(msg); };
}

// One check, straight from the Weekly Report list
function downloadCheckPdf(kind, cat, id, btn) {
  var done = _busy(btn, '&#8987;');
  var src = _reportSource(kind, cat);
  fetch(SUPA_URL + '/rest/v1/' + src.table + '?id=eq.' + id, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() } })
  .then(function(r) { return r.json(); })
  .then(function(rows) {
    var d = Array.isArray(rows) && rows[0];
    if (!d) { done('Could not load that check — it may have been deleted.'); return; }
    _withPdfMake(function() {
      pdfMake.createPdf(_checkPdfDoc(kind, cat, d)).download(_checkPdfName(kind, cat, d));
      done();
    }, done);
  })
  .catch(function() { done('Could not load that check — check connection and try again.'); });
}

function _pdfBlob(doc) {
  return new Promise(function(resolve) { pdfMake.createPdf(doc).getBlob(resolve); });
}

// ── DEFECTS EXPORT (Checks → Defects, Manager Access) — every defect ever
// logged, including resolved ones already removed from the list, as one ZIP:
// a spreadsheet (CSV, opens in Excel), a PDF register with the photos in it,
// and the original photos in a Photos folder. Pass a single record
// (kind, cat, id) to export just that one defect. Read-only — it never
// changes anything in the database. ──
function _defectStatusWord(s) {
  if (s === 'cleared') return 'Resolved (removed from list)';
  if (s === 'fixed') return 'Resolved';
  return 'Not resolved';
}
function _csvCell(v) {
  var s = String(v === undefined || v === null ? '' : v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function _blobToDataUrl(blob) {
  return new Promise(function(resolve) {
    var fr = new FileReader();
    fr.onload = function() { resolve(fr.result); };
    fr.onerror = function() { resolve(null); };
    fr.readAsDataURL(blob);
  });
}

function exportDefects(btn, kind, cat, id) {
  var single = !!id;
  var done = _busy(btn, single ? '&#8987;' : '&#8987; Fetching defects…');
  var sources = single
    ? [{ kind: kind, cat: cat || null }]
    : [{ kind: 'vehicle', cat: null }].concat(Object.keys(CHECK_CATEGORIES).map(function(c) { return { kind: 'cat', cat: c }; }));
  Promise.all(sources.map(function(s) {
    var src = _reportSource(s.kind, s.cat);
    var q = single ? 'id=eq.' + id : 'has_defect=eq.true&order=created_at.asc';
    return fetch(SUPA_URL + '/rest/v1/' + src.table + '?' + q, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() } })
      .then(function(r) { if (!r.ok) throw new Error(src.table); return r.json(); })
      .then(function(rows) { return (Array.isArray(rows) ? rows : []).map(function(d) { return { kind: s.kind, cat: s.cat, src: src, d: d }; }); });
  }))
  .then(function(lists) {
    var all = [].concat.apply([], lists);
    all.sort(function(a, b) { return (a.d.created_at || '').localeCompare(b.d.created_at || ''); });
    if (!all.length) { done('No defects to export.'); return; }
    _withPdfMake(function() {
      _withJsZip(function(err) {
        if (err) { done('ZIP download is unavailable — please check your internet connection and try again.'); return; }
        _buildDefectsZip(all, btn, single, done);
      });
    }, done);
  })
  .catch(function() { done('Could not fetch the defects — check connection and try again.'); });
}

function _buildDefectsZip(all, btn, single, done) {
  var zip = new JSZip();
  var photosDir = zip.folder('Photos');
  var missing = 0;
  // Download every photo first (one at a time — phones on site signal)
  var jobs = [];
  all.forEach(function(it) {
    var d = it.d, when = d.created_at ? new Date(d.created_at) : null;
    it.base = (when ? _isoDate(when) : 'undated') + '_' + safeFileSegment(it.src.label) + '_' + safeFileSegment(it.src.name(d)) + '_' + String(d.id).slice(0, 6);
    it.photos = [];
    (Array.isArray(d.defect_images) ? d.defect_images : []).forEach(function(p, n) {
      jobs.push({ it: it, path: p, file: it.base + '_photo' + (n + 1) + '.jpg' });
    });
  });
  var i = 0;
  (function nextPhoto() {
    if (i >= jobs.length) { finish(); return; }
    var j = jobs[i++];
    if (btn && !single) btn.innerHTML = '&#8987; Photo ' + i + ' of ' + jobs.length + '…';
    fetch(_defectPhotoAuthUrl(j.path), { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() } })
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function(blob) {
        photosDir.file(j.file, blob);
        return _blobToDataUrl(blob).then(function(url) { j.it.photos.push({ file: j.file, url: url }); });
      })
      .catch(function() { missing++; j.it.photos.push({ file: j.file + ' (could not be downloaded)', url: null }); })
      .then(nextPhoto);
  })();

  function finish() {
    if (btn && !single) btn.innerHTML = '&#8987; Building register…';
    // Spreadsheet
    var header = ['Date', 'Time', 'Category', 'Item', 'Inspector', 'Defect', 'Status', 'Office note', 'Photos', 'Record ID'];
    var lines = [header.map(_csvCell).join(',')];
    all.forEach(function(it) {
      var d = it.d, when = d.created_at ? new Date(d.created_at) : null;
      lines.push([
        when ? when.toLocaleDateString('en-GB') : '', when ? when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
        it.src.label, it.src.name(d) || '', d.inspector_name || '', d.defect_comment || '',
        _defectStatusWord(d.defect_status), d.office_note || '',
        it.photos.map(function(p) { return p.file; }).join('; '), d.id
      ].map(_csvCell).join(','));
    });
    var stamp = _isoDate(new Date());
    var label = single ? 'Defect_' + all[0].base : 'Defects_Register_' + stamp;
    zip.file(label + '.csv', '﻿' + lines.join('\r\n'));
    // PDF register with the photos in it
    _pdfBlob(_defectsPdfDoc(all, single)).then(function(pdf) {
      zip.file(label + '.pdf', pdf);
      if (btn && !single) btn.innerHTML = '&#8987; Zipping…';
      return zip.generateAsync({ type: 'blob' });
    }).then(function(blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = label + '.zip';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function() { URL.revokeObjectURL(a.href); }, 5000);
      done(missing ? missing + ' photo' + (missing === 1 ? '' : 's') + ' could not be downloaded — everything else is in the ZIP.' : '');
    }).catch(function() { done('Could not build the export — please try again.'); });
  }
}

function _defectsPdfDoc(all, single) {
  var open = all.filter(function(it) { return it.d.defect_status !== 'fixed' && it.d.defect_status !== 'cleared'; }).length;
  var content = [
    { text: 'ARBORITE TREE SERVICES', style: 'brand' },
    { text: single ? 'Defect Record' : 'Defects Register', style: 'title' },
    { text: 'Exported ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + (single ? '' : ' · ' + all.length + ' defect' + (all.length === 1 ? '' : 's') + ' · ' + open + ' not resolved'), style: 'small', margin: [0, 0, 0, 12] }
  ];
  all.forEach(function(it, n) {
    var d = it.d, when = d.created_at ? new Date(d.created_at) : null;
    var resolved = d.defect_status === 'fixed' || d.defect_status === 'cleared';
    var block = [
      { text: (single ? '' : (n + 1) + '. ') + (it.src.name(d) || 'Unknown') + ' — ' + it.src.label, style: 'h2' },
      { table: { widths: [90, '*'], body: [
        [{ text: 'Date', style: 'metaLbl' }, { text: when ? when.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '', style: 'cell' }],
        [{ text: 'Inspector', style: 'metaLbl' }, { text: d.inspector_name || '', style: 'cell' }],
        [{ text: 'Defect', style: 'metaLbl' }, { text: d.defect_comment || 'Defect reported (no comment).', style: 'cell', color: '#c62828' }],
        [{ text: 'Status', style: 'metaLbl' }, { text: _defectStatusWord(d.defect_status), style: 'cell', bold: true, color: resolved ? '#2d5a1b' : '#c62828' }],
        [{ text: 'Office note', style: 'metaLbl' }, { text: d.office_note || '—', style: 'cell' }]
      ] }, layout: 'lightHorizontalLines' }
    ];
    var pics = it.photos.filter(function(p) { return p.url; });
    for (var k = 0; k < pics.length; k += 3) {
      block.push({ columns: pics.slice(k, k + 3).map(function(p) { return { image: p.url, fit: [160, 160] }; }), columnGap: 8, margin: [0, 8, 0, 0] });
    }
    it.photos.filter(function(p) { return !p.url; }).forEach(function(p) { block.push({ text: 'Photo missing: ' + p.file, style: 'small' }); });
    content.push({ stack: block, margin: [0, 0, 0, 16], unbreakable: pics.length <= 3 });
  });
  return {
    pageSize: 'A4', pageMargins: [40, 40, 40, 40],
    content: content,
    footer: function(page, pages) { return { text: 'Defects register · page ' + page + ' of ' + pages, style: 'small', alignment: 'center', margin: [0, 10, 0, 0] }; },
    styles: {
      brand: { fontSize: 9, bold: true, color: '#2d5218', characterSpacing: 1.5, margin: [0, 0, 0, 2] },
      title: { fontSize: 17, bold: true, margin: [0, 0, 0, 4] },
      h2: { fontSize: 12, bold: true, color: '#2d5218', margin: [0, 6, 0, 4] },
      metaLbl: { fontSize: 9.5, bold: true, color: '#555555' },
      cell: { fontSize: 9.5 },
      small: { fontSize: 8.5, color: '#777777', margin: [0, 3, 0, 0] }
    },
    defaultStyle: { fontSize: 9.5 }
  };
}

// Every finished check (the categories picked in the report) for the week on
// screen, or for the calendar month that week starts in, as one ZIP with a
// folder per category.
function downloadReportsZip(period, btn) {
  var ws = _weeklyReportWeekStart || _mondayOf(new Date());
  var start, end, label;
  if (period === 'month') {
    start = new Date(ws.getFullYear(), ws.getMonth(), 1);
    end = new Date(ws.getFullYear(), ws.getMonth() + 1, 1);
    label = 'Check_Reports_' + start.getFullYear() + '-' + ('0' + (start.getMonth() + 1)).slice(-2);
  } else {
    start = ws;
    end = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 7);
    label = 'Check_Reports_week_of_' + _isoDate(ws);
  }
  var opt = _weeklyReportOptions().filter(function(o) { return o.key === _weeklyReportFilter; })[0];
  if (opt && opt.key !== 'all') label += '_' + safeFileSegment(opt.label);
  var done = _busy(btn, '&#8987; Fetching reports…');
  var from = encodeURIComponent(start.toISOString()), to = encodeURIComponent(end.toISOString());
  var tables = _weeklyReportTables();
  Promise.all(tables.map(function(t) {
    return fetch(SUPA_URL + '/rest/v1/' + t.table + '?overall_rating=not.is.null&created_at=gte.' + from + '&created_at=lt.' + to + '&order=created_at.asc', {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + _authToken() }
    })
    .then(function(r) { if (!r.ok) throw new Error(t.table); return r.json(); })
    .then(function(rows) { return (Array.isArray(rows) ? rows : []).map(function(d) { return { kind: t.kind, cat: t.cat, d: d }; }); });
  }))
  .then(function(lists) {
    var all = [].concat.apply([], lists);
    if (!all.length) { done('No finished checks to download for that ' + (period === 'month' ? 'month' : 'week') + '.'); return; }
    _withPdfMake(function() {
      _withJsZip(function(err) {
        if (err) { done('ZIP download is unavailable — please check your internet connection and try again.'); return; }
        var zip = new JSZip();
        var i = 0;
        (function next() {
          if (i >= all.length) {
            btn.innerHTML = '&#8987; Zipping…';
            zip.generateAsync({ type: 'blob' }).then(function(blob) {
              var a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = label + '.zip';
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(function() { URL.revokeObjectURL(a.href); }, 5000);
              done();
            }).catch(function() { done('Could not build the ZIP file — please try again.'); });
            return;
          }
          var it = all[i++];
          if (btn) btn.innerHTML = '&#8987; PDF ' + i + ' of ' + all.length + '…';
          _pdfBlob(_checkPdfDoc(it.kind, it.cat, it.d)).then(function(blob) {
            zip.folder(safeFileSegment(_reportSource(it.kind, it.cat).label)).file(_checkPdfName(it.kind, it.cat, it.d), blob);
            next();
          });
        })();
      });
    }, done);
  })
  .catch(function() { done('Could not fetch the reports — check connection and try again.'); });
}

