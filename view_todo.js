/* ===== 今日待办 Tab：工作/生活分类 + 月度汇总 ===== */
var todoState = { cat: '全部', tab: 'today', month: '' };

VIEWS.todo = function () {
  var t = today();
  var h = '<h1 class="page-title">☑️ 今日待办</h1><div class="page-sub">' + t + ' · 工作与生活，一件件来</div>';

  /* 客户回访提醒 */
  var remind = (S.glasses_clients.items || []).filter(function (c) {
    var d = daysUntil(c.next_visit);
    return d != null && d <= 3 && d >= -30;
  });
  if (remind.length) {
    h += '<div class="card" style="border-color:var(--rose)"><h3>🔔 客户回访提醒</h3>';
    remind.forEach(function (c) {
      var d = daysUntil(c.next_visit);
      var txt = d < 0 ? '已过期' + (-d) + '天' : (d === 0 ? '就是今天' : d + '天后');
      h += '<div class="todo-item"><span class="todo-text">👓 <b>' + esc(c.name) + '</b> 计划回访 ' + esc(c.next_visit) + '（' + txt + '）</span>' +
        '<button class="btn small" onclick="go(\'work\')">去查看</button></div>';
    });
    h += '</div>';
  }

  /* 页内标签：今日待办 / 月度汇总 */
  h += '<div class="tabs">' +
    '<button class="tab' + (todoState.tab === 'today' ? ' active' : '') + '" onclick="todoState.tab=\'today\';render()">📋 待办清单</button>' +
    '<button class="tab' + (todoState.tab === 'month' ? ' active' : '') + '" onclick="todoState.tab=\'month\';render()">📊 月度汇总</button></div>';

  if (todoState.tab === 'month') return h + todoMonthView();

  /* 分类筛选 */
  h += '<div class="toolbar">';
  ['全部'].concat(TODO_CATS).forEach(function (c) {
    h += '<button class="chip' + (todoState.cat === c ? ' on' : '') + '" onclick="todoState.cat=\'' + c + '\';render()">' + c + '</button>';
  });
  h += '<span style="flex:1"></span><button class="btn primary small" onclick="addTodo()">＋ 新增待办</button></div>';

  var items = (S.todos.items || []).slice().sort(function (a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.order || 0) - (b.order || 0);
  }).filter(function (x) {
    if (todoState.cat !== '全部' && (x.category || '工作待办') !== todoState.cat) return false;
    return !x.done || x.date === t;   // 未完成全部显示 + 今天已完成的显示
  });

  h += '<div class="card">';
  if (!items.length) h += '<div class="empty">暂无待办，点右上「＋ 新增待办」或在下方输入框直接发指令</div>';
  items.forEach(function (x) {
    var overdue = !x.done && x.date && x.date < t;
    var catCls = (x.category === '生活待办') ? 't-lifecat' : 't-work';
    h += '<div class="todo-item' + (x.done ? ' done' : '') + (overdue ? ' overdue' : '') + '">' +
      '<input type="checkbox" class="todo-check" ' + (x.done ? 'checked' : '') + ' onchange="toggleTodo(\'' + x.id + '\')">' +
      '<span class="todo-text">' + esc(x.text) +
      ' <span class="tag ' + catCls + '">' + esc(x.category || '工作待办') + '</span>' +
      (x.tag ? ' <span class="tag">' + esc(x.tag) + '</span>' : '') +
      (x.date && x.date !== t ? ' <span style="font-size:11px;color:var(--ink2)">' + esc(x.date) + '</span>' : '') + '</span>' +
      '<button class="icon-btn" title="上移" onclick="moveTodo(\'' + x.id + '\',-1)">↑</button>' +
      '<button class="icon-btn" title="下移" onclick="moveTodo(\'' + x.id + '\',1)">↓</button>' +
      '<button class="icon-btn" title="延期" onclick="delayTodo(\'' + x.id + '\')">⏭</button>' +
      '<button class="icon-btn" title="删除" onclick="delTodo(\'' + x.id + '\')">✕</button></div>';
  });
  h += '</div>';
  return h;
};

/* 月度汇总视图 */
function todoMonthView() {
  var m = todoState.month || thisMonth();
  var items = (S.todos.items || []).filter(function (x) { return (x.date || '').slice(0, 7) === m; });
  var done = items.filter(function (x) { return x.done; });
  var undone = items.filter(function (x) { return !x.done; });

  var h = '<div class="toolbar"><input type="month" value="' + m + '" onchange="todoState.month=this.value;render()">' +
    '<span style="font-size:12px;color:var(--ink2)">共 ' + items.length + ' 项 · 完成率 ' +
    (items.length ? Math.round(done.length / items.length * 100) : 0) + '%</span></div>';

  h += '<div class="stat-grid"><div class="stat"><div class="s-label">当月总数</div><div class="s-value">' + items.length + '</div></div>' +
    '<div class="stat"><div class="s-label">已完成</div><div class="s-value" style="color:var(--accent-deep)">' + done.length + '</div></div>' +
    '<div class="stat"><div class="s-label">未完成</div><div class="s-value" style="color:var(--red)">' + undone.length + '</div></div></div>';

  h += '<div class="card"><h3>✅ 已完成清单（' + done.length + '）</h3>';
  h += done.length ? done.map(function (x) {
    return '<div class="todo-item done"><span class="todo-text">' + esc(x.text) +
      ' <span class="tag ' + (x.category === '生活待办' ? 't-lifecat' : 't-work') + '">' + esc(x.category || '工作待办') + '</span>' +
      ' <span style="font-size:11px;color:var(--ink2)">' + esc(x.date || '') + '</span></span></div>';
  }).join('') : '<div class="empty">本月暂无完成记录</div>';
  h += '</div>';

  h += '<div class="card"><h3>⏳ 未完成清单（' + undone.length + '）</h3>';
  h += undone.length ? undone.map(function (x) {
    return '<div class="todo-item"><span class="todo-text">' + esc(x.text) +
      ' <span class="tag ' + (x.category === '生活待办' ? 't-lifecat' : 't-work') + '">' + esc(x.category || '工作待办') + '</span>' +
      ' <span style="font-size:11px;color:var(--ink2)">' + esc(x.date || '') + '</span></span></div>';
  }).join('') : '<div class="empty">全部完成，太棒了！</div>';
  h += '</div>';
  return h;
}

/* ---- 待办操作 ---- */
function addTodo() {
  openForm('新增待办', [
    { key: 'text', label: '内容', required: true },
    { key: 'category', label: '分类', type: 'select', options: TODO_CATS },
    { key: 'tag', label: '标签', type: 'select', options: [''].concat(TAGS) },
    { key: 'date', label: '日期', type: 'date', value: today() }
  ], function (v) {
    var maxOrder = Math.max.apply(null, [0].concat((S.todos.items || []).map(function (x) { return x.order || 0; })));
    S.todos.items.push({ id: uid(), text: v.text, category: v.category, tag: v.tag, date: v.date || today(), done: false, order: maxOrder + 1 });
    save('todos', function () { toast('已添加'); render(); });
  });
}
function toggleTodo(id) {
  var x = S.todos.items.find(function (i) { return i.id === id; });
  if (!x) return;
  x.done = !x.done;
  if (x.done) x.done_at = today();
  save('todos', render);
}
function delayTodo(id) {
  var x = S.todos.items.find(function (i) { return i.id === id; });
  if (!x) return;
  x.date = addDays(x.date || today(), 1);
  save('todos', function () { toast('已延期至 ' + x.date); render(); });
}
function delTodo(id) {
  S.todos.items = S.todos.items.filter(function (i) { return i.id !== id; });
  save('todos', function () { toast('已删除'); render(); });
}
function moveTodo(id, dir) {
  var arr = S.todos.items.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  var i = arr.findIndex(function (x) { return x.id === id; });
  var j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return;
  var tmp = arr[i].order; arr[i].order = arr[j].order; arr[j].order = tmp;
  save('todos', render);
}
