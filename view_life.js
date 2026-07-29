/* ===== 生活 Tab：睡眠 / 冥想 / 篮球 / 经期 + 本月汇总 ===== */
var lifeState = { tab: 'sleep' };

VIEWS.life = function () {
  var h = '<h1 class="page-title">🧘 生活</h1><div class="page-sub">照顾好身体，才有力气搞事业</div>';
  h += '<div class="tabs">' + [['sleep', '😴 睡眠'], ['meditation', '🧘 冥想'], ['basketball', '🏀 篮球'], ['menstrual', '🌸 经期'], ['summary', '📊 本月汇总']].map(function (t) {
    return '<button class="tab' + (lifeState.tab === t[0] ? ' active' : '') + '" onclick="lifeState.tab=\'' + t[0] + '\';render()">' + t[1] + '</button>';
  }).join('') + '</div><div class="tab-body">';
  if (lifeState.tab === 'sleep') h += sleepView();
  else if (lifeState.tab === 'meditation') h += medView();
  else if (lifeState.tab === 'basketball') h += ballView();
  else if (lifeState.tab === 'menstrual') h += mensView();
  else h += lifeSummaryView();
  /* 底部：成长教练独立对话框（自动携带睡眠/运动/待办数据背景） */
  h += aiChatHTML('coach', '🌱 成长教练（独立对话）',
    '随时聊聊近况、困惑或想复盘的事。教练会结合你的睡眠、运动、待办完成情况给出陪伴式分析与建议。');
  return h + '</div>';
};

/* ---- 睡眠 ---- */
function calcSleepMinutes(sleepT, wakeT) {
  var p = function (s) { var a = (s || '0:0').split(':'); return Number(a[0]) * 60 + Number(a[1] || 0); };
  var d = p(wakeT) - p(sleepT);
  if (d <= 0) d += 1440;   // 跨午夜
  return d;
}
function fmtDur(min) { return Math.floor(min / 60) + '小时' + (min % 60 ? (min % 60) + '分' : ''); }

function sleepView() {
  var items = (S.sleep.items || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  var recent = items.slice(0, 14);
  var avg = recent.length ? Math.round(recent.reduce(function (s, x) { return s + (x.duration || 0); }, 0) / recent.length) : 0;
  var h = '<div class="toolbar"><span style="font-size:12px;color:var(--ink2)">近14天平均：<b>' + (avg ? fmtDur(avg) : '-') + '</b>' +
    (avg ? (avg < 420 ? ' <span class="badge warn">偏短</span>' : avg > 540 ? ' <span class="badge gray">偏长</span>' : ' <span class="badge ok">正常</span>') : '') + '</span>' +
    '<span style="flex:1"></span><button class="btn primary small" onclick="addSleep()">＋ 记录睡眠</button></div>';
  if (!items.length) return h + '<div class="card"><div class="empty">暂无睡眠记录，发「记录睡眠：入睡23:30，起床7:00」即可</div></div>';
  h += '<div class="card"><table class="tbl"><tr><th>日期</th><th>入睡</th><th>起床</th><th>时长</th><th></th></tr>';
  items.forEach(function (x) {
    h += '<tr><td>' + esc(x.date) + '</td><td>' + esc(x.sleep_time) + '</td><td>' + esc(x.wake_time) + '</td>' +
      '<td><b>' + fmtDur(x.duration || 0) + '</b></td>' +
      '<td><button class="icon-btn" onclick="delItem(\'sleep\',\'' + x.id + '\')">✕</button></td></tr>';
  });
  return h + '</table></div>';
}
function addSleep() {
  openForm('记录睡眠', [
    { key: 'date', label: '日期（醒来当天）', type: 'date', value: today() },
    { key: 'sleep_time', label: '入睡时间（如 23:30）', required: true },
    { key: 'wake_time', label: '起床时间（如 07:00）', required: true }
  ], function (v) {
    v.id = uid();
    v.duration = calcSleepMinutes(v.sleep_time, v.wake_time);
    S.sleep.items.push(v);
    save('sleep', function () { toast('已记录，睡了 ' + fmtDur(v.duration)); render(); });
  });
}

/* ---- 冥想 ---- */
function medView() {
  var m = thisMonth();
  var items = (S.meditation.items || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  var mItems = items.filter(function (x) { return (x.date || '').slice(0, 7) === m; });
  var mMin = mItems.reduce(function (s, x) { return s + Number(x.duration || 0); }, 0);
  var h = '<div class="stat-grid">' +
    '<div class="stat"><div class="s-label">本月打卡</div><div class="s-value" style="color:var(--accent-deep)">' + mItems.length + ' 次</div></div>' +
    '<div class="stat"><div class="s-label">本月时长</div><div class="s-value">' + mMin + ' 分钟</div></div>' +
    '<div class="stat"><div class="s-label">历史累计</div><div class="s-value">' + items.length + ' 次</div></div></div>';
  h += '<div class="toolbar"><span style="flex:1"></span><button class="btn primary small" onclick="addMed()">＋ 冥想打卡</button></div>';
  if (!items.length) return h + '<div class="card"><div class="empty">暂无冥想记录</div></div>';
  h += '<div class="card">';
  items.forEach(function (x) {
    h += '<div class="list-item"><div class="li-title">🧘 ' + esc(x.date) + '　' + esc(x.duration) + ' 分钟</div>' +
      (x.feeling ? '<div class="li-body">💭 ' + esc(x.feeling) + '</div>' : '') +
      '<div style="margin-top:4px"><button class="icon-btn" onclick="delItem(\'meditation\',\'' + x.id + '\')">✕</button></div></div>';
  });
  return h + '</div>';
}
function addMed() {
  openForm('冥想打卡', [
    { key: 'date', label: '日期', type: 'date', value: today() },
    { key: 'duration', label: '冥想时长（分钟）', type: 'number', required: true },
    { key: 'feeling', label: '当下感受', type: 'textarea' }
  ], function (v) {
    v.id = uid(); v.duration = Number(v.duration);
    S.meditation.items.push(v);
    save('meditation', function () { toast('打卡成功 🧘'); render(); });
  });
}

/* ---- 篮球 ---- */
function ballView() {
  var m = thisMonth();
  var items = (S.basketball.items || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  var mItems = items.filter(function (x) { return (x.date || '').slice(0, 7) === m; });
  var daysInM = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate();
  var h = '<div class="stat-grid">' +
    '<div class="stat"><div class="s-label">当月总次数</div><div class="s-value" style="color:var(--accent-deep)">' + mItems.length + ' 次</div></div>' +
    '<div class="stat"><div class="s-label">月度频率</div><div class="s-value">' + (mItems.length ? '每' + Math.round(daysInM / mItems.length) + '天1次' : '-') + '</div></div>' +
    '<div class="stat"><div class="s-label">历史累计</div><div class="s-value">' + items.length + ' 次</div></div></div>';
  h += '<div class="toolbar"><span style="flex:1"></span>' +
    '<button class="btn primary" onclick="quickBall()">🏀 一键打卡</button>' +
    '<button class="btn small" onclick="addBall()">详细登记</button></div>';
  if (!items.length) return h + '<div class="card"><div class="empty">暂无运动记录，点「一键打卡」开始</div></div>';
  h += '<div class="card">';
  items.forEach(function (x) {
    h += '<div class="list-item"><div class="li-title">🏀 ' + esc(x.date) + (x.duration ? '　' + esc(x.duration) + ' 分钟' : '') + '</div>' +
      (x.note ? '<div class="li-body">' + esc(x.note) + '</div>' : '') +
      '<div style="margin-top:4px"><button class="icon-btn" onclick="delItem(\'basketball\',\'' + x.id + '\')">✕</button></div></div>';
  });
  return h + '</div>';
}
function quickBall() {
  S.basketball.items.push({ id: uid(), date: today(), duration: '', note: '' });
  save('basketball', function () { toast('打卡成功 🏀'); render(); });
}
function addBall() {
  openForm('篮球运动登记', [
    { key: 'date', label: '日期', type: 'date', value: today() },
    { key: 'duration', label: '时长（分钟，可空）', type: 'number' },
    { key: 'note', label: '备注（可空）' }
  ], function (v) {
    v.id = uid();
    S.basketball.items.push(v);
    save('basketball', function () { toast('已登记'); render(); });
  });
}

/* ---- 经期 ---- */
function mensView() {
  var items = (S.menstrual.items || []).slice().sort(function (a, b) { return (b.start || '').localeCompare(a.start || ''); });
  var ongoing = items.find(function (x) { return x.start && !x.end; });
  var h = '<div class="toolbar">' +
    (ongoing ? '<button class="btn primary small" onclick="endPeriod(\'' + ongoing.id + '\')">🌸 登记结束</button>'
      : '<button class="btn primary small" onclick="startPeriod()">🌸 登记经期开始</button>') +
    '<button class="btn small" onclick="lifeShowPrediction(\'bodyAnalysis\')">🔮 预测 & 身体分析</button></div>';
  if (ongoing) h += '<div class="hint">🌸 当前经期进行中（' + esc(ongoing.start) + ' 开始，第 ' + (1 - daysUntil(ongoing.start)) + ' 天）</div>';
  h += '<div id="bodyAnalysis"></div>';
  if (!items.length) return h + '<div class="card"><div class="empty">暂无经期记录</div></div>';
  h += '<div class="card"><h3>📆 历史记录（永久保存）</h3>';
  items.forEach(function (x) {
    var len = (x.start && x.end) ? (1 + Math.round((new Date(x.end + 'T00:00:00') - new Date(x.start + 'T00:00:00')) / 86400000)) : null;
    h += '<div class="list-item"><div class="li-title">🌸 ' + esc(x.start) + ' ~ ' + (x.end ? esc(x.end) : '进行中') + (len ? '　<span class="badge gray">' + len + '天</span>' : '') + '</div>' +
      (x.feeling ? '<div class="li-body">💭 感受：' + esc(x.feeling) + '</div>' : '') +
      (x.symptoms ? '<div class="li-body">🩹 症状：' + esc(x.symptoms) + '</div>' : '') +
      '<div style="margin-top:4px"><button class="icon-btn" onclick="editPeriod(\'' + x.id + '\')">✎</button>' +
      '<button class="icon-btn" onclick="delItem(\'menstrual\',\'' + x.id + '\')">✕</button></div></div>';
  });
  return h + '</div>';
}
function startPeriod() {
  openForm('登记经期开始', [
    { key: 'start', label: '开始日期', type: 'date', value: today() },
    { key: 'feeling', label: '身体感受' },
    { key: 'symptoms', label: '不适症状' }
  ], function (v) {
    v.id = uid(); v.end = '';
    S.menstrual.items.push(v);
    save('menstrual', function () { toast('已登记，注意休息 🌸'); render(); });
  });
}
function endPeriod(id) {
  var x = S.menstrual.items.find(function (i) { return i.id === id; });
  openForm('登记经期结束', [
    { key: 'end', label: '结束日期', type: 'date', value: today() },
    { key: 'feeling', label: '整体感受', value: x.feeling },
    { key: 'symptoms', label: '症状补充', value: x.symptoms }
  ], function (v) {
    Object.assign(x, v);
    save('menstrual', function () { toast('已登记结束'); render(); });
  });
}
function editPeriod(id) {
  var x = S.menstrual.items.find(function (i) { return i.id === id; });
  openForm('编辑经期记录', [
    { key: 'start', label: '开始日期', type: 'date', value: x.start },
    { key: 'end', label: '结束日期（进行中留空）', type: 'date', value: x.end },
    { key: 'feeling', label: '感受', value: x.feeling },
    { key: 'symptoms', label: '症状', value: x.symptoms }
  ], function (v) {
    Object.assign(x, v);
    save('menstrual', render);
  });
}

/* 经期预测 + 身体综合分析 */
function lifeShowPrediction(targetId) {
  var box = $('#' + (targetId || 'bodyAnalysis'));
  if (!box) return;
  var items = (S.menstrual.items || []).filter(function (x) { return x.start; })
    .sort(function (a, b) { return a.start.localeCompare(b.start); });
  var h = '<div class="card" style="border-color:var(--rose)"><h3>🔮 经期预测与身体综合参考</h3>';
  if (items.length < 2) {
    h += '<div class="li-body">历史记录不足 2 次，暂无法预测周期。先积累两次记录吧。</div>';
  } else {
    var gaps = [];
    for (var i = 1; i < items.length; i++) {
      gaps.push(Math.round((new Date(items[i].start + 'T00:00:00') - new Date(items[i - 1].start + 'T00:00:00')) / 86400000));
    }
    var cycle = Math.round(gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length);
    var lens = items.filter(function (x) { return x.end; }).map(function (x) {
      return 1 + Math.round((new Date(x.end + 'T00:00:00') - new Date(x.start + 'T00:00:00')) / 86400000);
    });
    var avgLen = lens.length ? Math.round(lens.reduce(function (a, b) { return a + b; }, 0) / lens.length) : 5;
    var last = items[items.length - 1];
    var nextStart = addDays(last.start, cycle);
    var d = daysUntil(nextStart);
    h += '<div class="li-body">平均周期：<b>' + cycle + '天</b>　平均经期时长：<b>' + avgLen + '天</b></div>' +
      '<div class="li-body">预测下次经期：<b style="color:var(--rose)">' + nextStart + ' ~ ' + addDays(nextStart, avgLen - 1) + '</b>' +
      (d != null ? (d > 0 ? '（' + d + '天后）' : d === 0 ? '（就是今天）' : '（可能已推迟' + (-d) + '天）') : '') + '</div>';
    if (d != null && d < -7) h += '<div class="li-body" style="color:var(--red)">⚠ 已推迟超过7天，若非正常情况建议关注身体或就医确认。</div>';
  }
  /* 结合睡眠/运动/冥想 */
  var t = today();
  var recent = (S.sleep.items || []).filter(function (x) { return daysUntil(x.date) >= -14; });
  var avgSleep = recent.length ? Math.round(recent.reduce(function (s, x) { return s + (x.duration || 0); }, 0) / recent.length) : 0;
  var m = thisMonth();
  var ball = (S.basketball.items || []).filter(function (x) { return (x.date || '').slice(0, 7) === m; }).length;
  var med = (S.meditation.items || []).filter(function (x) { return (x.date || '').slice(0, 7) === m; }).length;
  h += '<div class="li-body" style="margin-top:8px"><b>身体状态综合参考：</b></div><div class="li-body">';
  h += avgSleep ? ('· 近14天平均睡眠 ' + fmtDur(avgSleep) + (avgSleep < 420 ? '，<span style="color:var(--red)">偏短，经期前后尤其要早睡</span>' : '，状态不错') + '<br>') : '· 暂无近期睡眠数据<br>';
  h += '· 本月运动 ' + ball + ' 次、冥想 ' + med + ' 次' + ((ball + med) >= 8 ? '，身心管理很自律 👍' : (ball + med) > 0 ? '，可以再增加一些频次' : '，本月还没动起来，试试今天打个卡？');
  h += '</div></div>';
  box.innerHTML = h;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ---- 本月汇总 ---- */
function lifeSummaryView() {
  var m = thisMonth();
  var inM = function (coll, key) {
    return (S[coll].items || []).filter(function (x) { return ((x[key || 'date'] || '').slice(0, 7)) === m; });
  };
  var med = inM('meditation'), ball = inM('basketball'), slp = inM('sleep'), mens = inM('menstrual', 'start');
  var medMin = med.reduce(function (s, x) { return s + Number(x.duration || 0); }, 0);
  var avgSlp = slp.length ? Math.round(slp.reduce(function (s, x) { return s + (x.duration || 0); }, 0) / slp.length) : 0;
  var h = '<div class="stat-grid">' +
    '<div class="stat"><div class="s-label">🧘 冥想</div><div class="s-value">' + med.length + ' 次</div><div style="font-size:11px;color:var(--ink2)">' + medMin + ' 分钟</div></div>' +
    '<div class="stat"><div class="s-label">🏀 篮球</div><div class="s-value">' + ball.length + ' 次</div></div>' +
    '<div class="stat"><div class="s-label">😴 平均睡眠</div><div class="s-value" style="font-size:16px">' + (avgSlp ? fmtDur(avgSlp) : '-') + '</div><div style="font-size:11px;color:var(--ink2)">' + slp.length + ' 天记录</div></div></div>';
  h += '<div class="card"><h3>📊 ' + m + ' 生活月报</h3><div class="li-body">' +
    '· 冥想打卡 <b>' + med.length + '</b> 次，共 <b>' + medMin + '</b> 分钟<br>' +
    '· 篮球运动 <b>' + ball.length + '</b> 次<br>' +
    '· 睡眠记录 <b>' + slp.length + '</b> 天，平均 <b>' + (avgSlp ? fmtDur(avgSlp) : '-') + '</b><br>' +
    '· 本月经期记录 <b>' + mens.length + '</b> 次</div>' +
    '<div style="margin-top:10px"><button class="btn" onclick="lifeShowPrediction(\'sumPred\')">🩺 展开身体综合参考</button></div>' +
    '<div id="sumPred" style="margin-top:10px"></div></div>';
  return h;
}
