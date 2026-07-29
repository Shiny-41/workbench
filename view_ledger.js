/* ===== 记账 Tab：多台账 + 日历 + 统计 + 导出 ===== */
var ledState = { book: '日常台账', month: '', tab: 'month' };
var INCOME_CATS = ['BJD销售', '眼镜订单', '工资', '副业', '理财', '其他收入'];
var EXPENSE_CATS = ['进货成本', '推广费用', '物流快递', '餐饮', '交通', '购物', '居住', '娱乐', '医疗', '学习', '其他支出'];

VIEWS.ledger = function () {
  var m = ledState.month || thisMonth();
  var h = '<h1 class="page-title">📒 记账</h1><div class="page-sub">默认记日常台账 · 可在「台账管理」添加其他项目台账 · 也可直接在下方输入「支出 45 午餐」</div>';

  /* 台账切换（默认日常台账；多台账时才显示"全部"） */
  var books = ledgerBooks();
  var segs = (books.length > 1 ? ['全部'] : []).concat(books);
  if (segs.indexOf(ledState.book) < 0) ledState.book = '日常台账';
  h += '<div class="seg">' + segs.map(function (b) {
    return '<button class="' + (ledState.book === b ? 'on' : '') + '" onclick="ledState.book=\'' + b + '\';render()">' + esc(b) + '</button>';
  }).join('') + '<button onclick="manageBooks()" title="台账管理">⚙</button></div>';

  h += '<div class="toolbar"><input type="month" value="' + m + '" onchange="ledState.month=this.value;render()">' +
    '<span style="flex:1"></span>' +
    '<button class="btn small" onclick="exportLedger()">⬇ 导出</button>' +
    '<button class="btn primary small" onclick="addLedger()">＋ 记一笔</button></div>';

  var all = scopeItems();
  var monthItems = all.filter(function (x) { return (x.date || '').slice(0, 7) === m; });
  var inc = sumBy(monthItems, '收入'), exp = sumBy(monthItems, '支出');
  var balance = sumBy(all, '收入') - sumBy(all, '支出');

  h += '<div class="stat-grid">' +
    '<div class="stat"><div class="s-label">' + m + ' 收入</div><div class="s-value income">' + fmtMoney(inc) + '</div></div>' +
    '<div class="stat"><div class="s-label">' + m + ' 支出</div><div class="s-value expense">' + fmtMoney(exp) + '</div></div>' +
    '<div class="stat"><div class="s-label">月度结余</div><div class="s-value">' + fmtMoney(inc - exp) + '</div></div></div>';
  h += '<div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:13px 16px">' +
    '<span style="font-size:13px;color:var(--ink2)">💼 ' + esc(ledState.book) + ' · 实时账户余额（累计收入−累计支出）</span>' +
    '<b style="font-size:19px;color:' + (balance >= 0 ? 'var(--accent-deep)' : 'var(--red)') + '">' + fmtMoney(balance) + '</b></div>';

  /* 页内tab */
  h += '<div class="tabs">' + [['month', '📅 日历'], ['cat', '📊 分类占比'], ['list', '📜 明细'], ['history', '🗂 历史月账单']].map(function (t) {
    return '<button class="tab' + (ledState.tab === t[0] ? ' active' : '') + '" onclick="ledState.tab=\'' + t[0] + '\';render()">' + t[1] + '</button>';
  }).join('') + '</div>';

  if (ledState.tab === 'month') h += calendarView(m, monthItems);
  else if (ledState.tab === 'cat') h += catView(monthItems);
  else if (ledState.tab === 'list') h += listView(monthItems);
  else h += historyView(all);
  return h;
};

function scopeItems() {
  return (S.ledger.items || []).filter(function (x) {
    return ledState.book === '全部' || (x.book || '日常台账') === ledState.book;
  });
}
function sumBy(arr, type) {
  return arr.reduce(function (s, x) { return s + (x.type === type ? Number(x.amount || 0) : 0); }, 0);
}

/* 日历视图 */
function calendarView(m, items) {
  var y = Number(m.slice(0, 4)), mo = Number(m.slice(5, 7));
  var first = new Date(y, mo - 1, 1), days = new Date(y, mo, 0).getDate();
  var startW = first.getDay();
  var byDay = {};
  items.forEach(function (x) {
    var d = Number((x.date || '').slice(8, 10));
    if (!d) return;
    byDay[d] = byDay[d] || { i: 0, e: 0 };
    if (x.type === '收入') byDay[d].i += Number(x.amount || 0); else byDay[d].e += Number(x.amount || 0);
  });
  var h = '<div class="card"><table class="cal"><tr>' + ['日', '一', '二', '三', '四', '五', '六'].map(function (w) { return '<th>' + w + '</th>'; }).join('') + '</tr><tr>';
  for (var i = 0; i < startW; i++) h += '<td style="border:none"></td>';
  var t = today();
  for (var d = 1; d <= days; d++) {
    var cur = m + '-' + String(d).padStart(2, '0');
    var v = byDay[d];
    h += '<td class="' + (cur === t ? 'today-cell' : '') + '"><span class="d">' + d + '</span>' +
      (v && v.i ? '<span class="ci">+' + Math.round(v.i) + '</span>' : '') +
      (v && v.e ? '<span class="ce">-' + Math.round(v.e) + '</span>' : '') + '</td>';
    if ((startW + d) % 7 === 0 && d < days) h += '</tr><tr>';
  }
  h += '</tr></table><div style="font-size:11px;color:var(--ink2);margin-top:8px">红=当日收入 绿=当日支出（单位：元）</div></div>';
  return h;
}

/* 分类占比 */
function catView(items) {
  var h = '';
  [['支出', 'var(--green)'], ['收入', 'var(--red)']].forEach(function (pair) {
    var type = pair[0], color = pair[1];
    var sub = items.filter(function (x) { return x.type === type; });
    var total = sumBy(sub, type);
    var byCat = {};
    sub.forEach(function (x) { byCat[x.category || '未分类'] = (byCat[x.category || '未分类'] || 0) + Number(x.amount || 0); });
    var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
    h += '<div class="card"><h3>' + (type === '支出' ? '💸' : '💰') + ' ' + type + '分类占比（' + fmtMoney(total) + '）</h3>';
    if (!cats.length) h += '<div class="empty">本月暂无' + type + '记录</div>';
    cats.forEach(function (c) {
      var pct = total ? Math.round(byCat[c] / total * 100) : 0;
      h += '<div class="bar-row"><span class="bl">' + esc(c) + '</span><span class="bt"><div style="width:' + pct + '%;background:' + color + '"></div></span>' +
        '<span class="bv">' + fmtMoney(byCat[c]) + ' · ' + pct + '%</span></div>';
    });
    h += '</div>';
  });
  return h;
}

/* 明细 */
function listView(items) {
  var sorted = items.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  var h = '<div class="card">';
  if (!sorted.length) return h + '<div class="empty">本月暂无记录</div></div>';
  h += '<table class="tbl"><tr><th>日期</th><th>台账</th><th>分类</th><th>金额</th><th>备注</th><th></th></tr>';
  sorted.forEach(function (x) {
    h += '<tr><td>' + esc((x.date || '').slice(5)) + '</td><td style="font-size:11px">' + esc((x.book || '日常台账').slice(0, 2)) + '</td>' +
      '<td>' + esc(x.category || '-') + '</td>' +
      '<td style="color:' + (x.type === '收入' ? 'var(--red)' : 'var(--green)') + ';font-weight:600">' + (x.type === '收入' ? '+' : '-') + Number(x.amount || 0) + '</td>' +
      '<td style="font-size:12px;color:var(--ink2)">' + esc(x.note || '') + '</td>' +
      '<td><button class="icon-btn" onclick="delItem(\'ledger\',\'' + x.id + '\')">✕</button></td></tr>';
  });
  return h + '</table></div>';
}

/* 历史月账单 */
function historyView(all) {
  var byM = {};
  all.forEach(function (x) {
    var m = (x.date || '').slice(0, 7);
    if (!m) return;
    byM[m] = byM[m] || { i: 0, e: 0, n: 0 };
    if (x.type === '收入') byM[m].i += Number(x.amount || 0); else byM[m].e += Number(x.amount || 0);
    byM[m].n++;
  });
  var months = Object.keys(byM).sort().reverse();
  var h = '<div class="card"><h3>🗂 历史月度账单</h3>';
  if (!months.length) return h + '<div class="empty">暂无历史账单</div></div>';
  h += '<table class="tbl"><tr><th>月份</th><th>笔数</th><th>收入</th><th>支出</th><th>结余</th><th></th></tr>';
  months.forEach(function (m) {
    var v = byM[m];
    h += '<tr><td>' + m + '</td><td>' + v.n + '</td><td style="color:var(--red)">' + fmtMoney(v.i) + '</td>' +
      '<td style="color:var(--green)">' + fmtMoney(v.e) + '</td><td><b>' + fmtMoney(v.i - v.e) + '</b></td>' +
      '<td><button class="btn small" onclick="ledState.month=\'' + m + '\';ledState.tab=\'list\';render()">查看</button></td></tr>';
  });
  return h + '</table></div>';
}

/* 记一笔 */
function addLedger(preset) {
  preset = preset || {};
  openForm('记一笔', [
    { key: 'type', label: '类型', type: 'select', options: ['支出', '收入'], value: preset.type },
    { key: 'amount', label: '金额（元）', type: 'number', required: true, value: preset.amount },
    { key: 'category', label: '分类', type: 'select', options: EXPENSE_CATS.concat(INCOME_CATS), value: preset.category },
    { key: 'book', label: '台账', type: 'select', options: ledgerBooks(), value: preset.book || (ledState.book !== '全部' ? ledState.book : '日常台账') },
    { key: 'date', label: '日期', type: 'date', value: preset.date || today() },
    { key: 'note', label: '备注', value: preset.note }
  ], function (v) {
    v.id = uid(); v.amount = Number(v.amount);
    S.ledger.items.push(v);
    save('ledger', function () { toast('已入账：' + v.type + ' ' + fmtMoney(v.amount)); render(); });
  });
}

/* ===== 台账管理：默认只有日常台账，可添加其他项目台账 ===== */
function manageBooks() {
  var books = ledgerBooks();
  var html = '<h3>⚙ 台账管理</h3><div class="li-body" style="margin-bottom:10px">「日常台账」为默认台账不可删除；其他项目（如 BJD项目、眼镜业务）可按需添加，各台账独立核算。</div>';
  books.forEach(function (b, i) {
    var n = (S.ledger.items || []).filter(function (x) { return (x.book || '日常台账') === b; }).length;
    html += '<div class="list-item" style="display:flex;align-items:center;gap:8px"><b style="flex:1">📒 ' + esc(b) + '</b>' +
      '<span style="font-size:12px;color:var(--ink2)">' + n + ' 笔</span>' +
      (b === '日常台账' ? '<span class="badge gray">默认</span>' : '<button class="icon-btn" onclick="delBookAt(' + i + ')">✕ 删除</button>') + '</div>';
  });
  html += '<div class="form-row" style="margin-top:12px"><label>新增台账名称</label><input id="newBookName" placeholder="如：BJD-XX项目 / 眼镜业务"></div>' +
    '<div class="modal-actions"><button class="btn" onclick="closeModal()">关闭</button><button class="btn primary" onclick="addBook()">＋ 添加台账</button></div>';
  $('#modal').innerHTML = html;
  $('#modalMask').style.display = 'flex';
}
function addBook() {
  var el = $('#newBookName');
  var name = el ? el.value.trim() : '';
  if (!name) { toast('请输入台账名称'); return; }
  var books = ledgerBooks();
  if (books.indexOf(name) >= 0) { toast('该台账已存在'); return; }
  S.ledger.books = books.concat([name]);
  save('ledger', function () { toast('已添加台账：' + name); manageBooks(); render(); });
}
function delBookAt(i) { delBook(ledgerBooks()[i]); }
function delBook(name) {
  if (!name || name === '日常台账') return;
  var n = (S.ledger.items || []).filter(function (x) { return x.book === name; }).length;
  armBtn(evtBtn(), function () {
    S.ledger.books = ledgerBooks().filter(function (b) { return b !== name; });
    (S.ledger.items || []).forEach(function (x) { if (x.book === name) x.book = '日常台账'; });
    if (ledState.book === name) ledState.book = '日常台账';
    save('ledger', function () { toast('已删除台账「' + name + '」'); manageBooks(); render(); });
  }, n ? '该台账 ' + n + ' 笔记录将归入日常台账，再点一次确认删除' : '再点一次确认删除');
}

/* 导出CSV */
function exportLedger() {
  var rows = [['日期', '台账', '类型', '分类', '金额', '备注']];
  scopeItems().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); }).forEach(function (x) {
    rows.push([x.date, x.book || '日常台账', x.type, x.category || '', x.amount, (x.note || '').replace(/,/g, '，')]);
  });
  var csv = '\ufeff' + rows.map(function (r) { return r.join(','); }).join('\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = '记账导出_' + (ledState.book) + '_' + today() + '.csv';
  a.click();
  toast('已导出 CSV');
}
