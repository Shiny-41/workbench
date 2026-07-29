/* ===== 工作 Tab：BJD业务 + 眼镜业务 ===== */
var workState = { biz: 'bjd', bjdTab: 'proj', glTab: 'clients', projFilter: '全部', newsKw: '', gnewsKw: '', clientFilter: '全部', infFilter: '全部', prosFilter: '全部' };
var BJD_STAGES = ['立绘期', '建模期', '打样期', '宣发期', '售卖期', '收尾期'];
var SUPPLIER_TYPES = ['注塑件', '娃衣', 'UV打印', '植发', '模具', '分销渠道'];
var INF_CATS = ['画师', '脸妆测评', '开箱测评', '整头测评', '素体测评', '妆面设计', '建模', '人形师', '拍照', '版师'];
var CLIENT_RATINGS = ['S', 'A', 'B', 'C'];

VIEWS.work = function () {
  var h = '<h1 class="page-title">💼 工作</h1><div class="page-sub">BJD业务 与 眼镜业务 双线并进</div>';
  h += '<div class="seg">' +
    '<button class="' + (workState.biz === 'bjd' ? 'on' : '') + '" onclick="workState.biz=\'bjd\';render()">🧸 BJD业务</button>' +
    '<button class="' + (workState.biz === 'glasses' ? 'on' : '') + '" onclick="workState.biz=\'glasses\';render()">👓 眼镜业务</button></div>';
  return h + (workState.biz === 'bjd' ? workBjd() : workGlasses());
};

/* ============ BJD业务 ============ */
function workBjd() {
  /* 行业资讯放在达人档案后面 */
  var tabs = [['proj', '📋 项目进度'], ['sup', '🏭 供应链'], ['inf', '🌟 达人档案'], ['news', '📰 行业资讯']];
  var h = '<div class="tabs">' + tabs.map(function (t) {
    return '<button class="tab' + (workState.bjdTab === t[0] ? ' active' : '') + '" onclick="workState.bjdTab=\'' + t[0] + '\';render()">' + t[1] + '</button>';
  }).join('') + '</div><div class="tab-body">';
  if (workState.bjdTab === 'proj') h += bjdProjView();
  else if (workState.bjdTab === 'sup') h += supplierView();
  else if (workState.bjdTab === 'inf') h += influencerView();
  else h += newsView('bjd_news', 'newsKw');
  return h + '</div>';
}

/* ---- 项目进度 ---- */
function bjdProjView() {
  var h = '<div class="toolbar">';
  ['全部', '进行中', '待启动', '已完成', '临近到期'].forEach(function (f) {
    h += '<button class="chip' + (workState.projFilter === f ? ' on' : '') + '" onclick="workState.projFilter=\'' + f + '\';render()">' + f + '</button>';
  });
  h += '<span style="flex:1"></span><button class="btn primary small" onclick="editProject()">＋ 新建项目</button></div>';

  var items = (S.bjd_projects.items || []).filter(function (p) {
    var d = daysUntil(p.deadline);
    if (workState.projFilter === '临近到期') return p.status !== '已完成' && d != null && d <= 7;
    if (workState.projFilter !== '全部') return p.status === workState.projFilter;
    return true;
  });
  if (!items.length) return h + '<div class="card"><div class="empty">暂无项目，点「＋ 新建项目」开始</div></div>';

  items.forEach(function (p) {
    var d = daysUntil(p.deadline);
    var badge = p.status === '已完成' ? '<span class="badge ok">已完成</span>' :
      p.status === '待启动' ? '<span class="badge gray">待启动</span>' :
      (d != null && d < 0) ? '<span class="badge red">已逾期' + (-d) + '天</span>' :
      (d != null && d <= 7) ? '<span class="badge warn">剩' + d + '天</span>' : '<span class="badge ok">进行中</span>';
    /* 阶段进度条 */
    var si = BJD_STAGES.indexOf(p.stage);
    var stageBar = '<div class="stage-bar">' + BJD_STAGES.map(function (s, i) {
      return '<span class="stage-dot' + (si >= 0 && i <= si ? ' on' : '') + '" title="' + s + '">' + s.slice(0, 2) + '</span>';
    }).join('<i></i>') + '</div>';
    h += '<div class="card"><div class="li-meta" style="justify-content:space-between"><b style="font-size:15px;color:var(--ink)">' + esc(p.name) + '</b>' + badge + '</div>' +
      stageBar +
      '<div class="li-body">阶段：<b>' + esc(p.stage || '-') + '</b>　关键节点：' + esc(p.milestone || '-') + '　截止：' + esc(p.deadline || '-') + '</div>' +
      (p.todo ? '<div class="li-body">📌 待执行：' + esc(p.todo) + '</div>' : '') +
      (p.risk ? '<div class="li-body" style="color:var(--red)">⚠ 风险：' + esc(p.risk) + '</div>' : '') +
      '<div style="margin-top:10px;display:flex;gap:8px">' +
      '<button class="btn small" onclick="editProject(\'' + p.id + '\')">编辑</button>' +
      (p.status !== '已完成' ? '<button class="btn small" onclick="doneProject(\'' + p.id + '\')">标记完成</button>' : '') +
      '<button class="btn small danger" onclick="delItem(\'bjd_projects\',\'' + p.id + '\')">删除</button></div></div>';
  });
  return h;
}
function editProject(id) {
  var p = id ? S.bjd_projects.items.find(function (x) { return x.id === id; }) : {};
  openForm(id ? '编辑项目' : '新建项目', [
    { key: 'name', label: '项目名称', required: true, value: p.name },
    { key: 'stage', label: '当前阶段', type: 'select', options: BJD_STAGES, value: p.stage || BJD_STAGES[0] },
    { key: 'milestone', label: '关键节点', value: p.milestone },
    { key: 'deadline', label: '截止时间', type: 'date', value: p.deadline },
    { key: 'todo', label: '待执行事项', type: 'textarea', value: p.todo },
    { key: 'risk', label: '风险备注', type: 'textarea', value: p.risk },
    { key: 'status', label: '状态', type: 'select', options: ['进行中', '待启动', '已完成'], value: p.status || '进行中' }
  ], function (v) {
    if (id) Object.assign(p, v);
    else { v.id = uid(); v.created = today(); S.bjd_projects.items.push(v); }
    save('bjd_projects', function () { toast('已保存'); render(); });
  });
}
function doneProject(id) {
  var p = S.bjd_projects.items.find(function (x) { return x.id === id; });
  if (p) { p.status = '已完成'; save('bjd_projects', render); }
}

/* ---- 资讯（BJD/眼镜共用） ---- */
function newsView(coll, kwKey) {
  var kw = workState[kwKey] || '';
  var h = coll === 'bjd_news'
    ? '<div class="hint">📡 每 2 小时自动抓取小红书 BJD 话题热门笔记，自动去重、长期存档。支持标记重点⭐ / 忽略。</div>'
    : '<div class="hint">📡 每日自动更新眼镜/镜片行业资讯与竞争对手动态（优缺点分析），长期存档可检索。</div>';
  h += '<div class="toolbar"><input type="text" id="kw_' + coll + '" placeholder="🔍 搜索标题/摘要关键词" value="' + esc(kw) + '" oninput="workState.' + kwKey + '=this.value;renderKeepFocus(\'kw_' + coll + '\')">' +
    (coll === 'glasses_news' ? '<button class="btn primary small" onclick="addGlassesNews()">＋ 手动添加</button>' : '') + '</div>';
  var items = (S[coll].items || []).slice().sort(function (a, b) { return (b.collected_at || b.date || '').localeCompare(a.collected_at || a.date || ''); })
    .filter(function (n) {
      if (!kw) return true;
      return (n.title + (n.summary || '') + (n.note || '')).toLowerCase().indexOf(kw.toLowerCase()) >= 0;
    });
  if (!items.length) return h + '<div class="card"><div class="empty">暂无资讯</div></div>';
  h += '<div class="card">';
  items.forEach(function (n) {
    var dim = n.mark === 'ignore' ? ' dimmed' : '';
    h += '<div class="list-item' + dim + '"><div class="li-title">' + (n.mark === 'star' ? '⭐ ' : '') + esc(n.title) + '</div>' +
      '<div class="li-meta"><span>📅 ' + esc(n.date || '-') + '</span>' + (n.category ? '<span class="tag">' + esc(n.category) + '</span>' : '') +
      (n.url ? '<a href="' + esc(n.url) + '" target="_blank">原文 ↗</a>' : '') + '</div>' +
      '<div class="li-body">' + esc(n.summary || '') + '</div>' +
      (n.note ? '<div class="li-body" style="color:var(--accent-deep)">📝 ' + esc(n.note) + '</div>' : '') +
      '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="btn small" onclick="markNews(\'' + coll + '\',\'' + n.id + '\',\'star\')">' + (n.mark === 'star' ? '取消重点' : '⭐ 重点') + '</button>' +
      '<button class="btn small" onclick="markNews(\'' + coll + '\',\'' + n.id + '\',\'ignore\')">' + (n.mark === 'ignore' ? '恢复' : '🚫 忽略') + '</button>' +
      '<button class="btn small" onclick="noteNews(\'' + coll + '\',\'' + n.id + '\')">📝 笔记</button></div></div>';
  });
  return h + '</div>';
}
function markNews(coll, id, m) {
  var n = S[coll].items.find(function (x) { return x.id === id; });
  if (!n) return;
  n.mark = (n.mark === m) ? 'normal' : m;
  save(coll, render);
}
function noteNews(coll, id) {
  var n = S[coll].items.find(function (x) { return x.id === id; });
  openForm('添加笔记', [{ key: 'note', label: '个人笔记', type: 'textarea', value: n.note }], function (v) {
    n.note = v.note; save(coll, function () { toast('笔记已保存'); render(); });
  });
}
function addGlassesNews() {
  openForm('添加眼镜行业资讯', [
    { key: 'title', label: '标题', required: true },
    { key: 'category', label: '分类', type: 'select', options: ['新品动态', '市场行情', '展会信息', '竞品动态', '行业消息'] },
    { key: 'date', label: '日期', type: 'date', value: today() },
    { key: 'summary', label: '摘要', type: 'textarea' },
    { key: 'url', label: '链接' }
  ], function (v) {
    v.id = uid(); v.mark = 'normal'; v.collected_at = today();
    S.glasses_news.items.push(v);
    save('glasses_news', function () { toast('已添加'); render(); });
  });
}

/* ---- 供应链档案 ---- */
function supplierView() {
  var h = '<div class="toolbar">';
  ['全部'].concat(SUPPLIER_TYPES).forEach(function (f) {
    h += '<button class="chip' + ((workState.supFilter || '全部') === f ? ' on' : '') + '" onclick="workState.supFilter=\'' + f + '\';render()">' + f + '</button>';
  });
  h += '</div><div class="toolbar"><span style="font-size:12px;color:var(--ink2)">共 ' + (S.suppliers.items || []).length + ' 家供应商</span>' +
    '<span style="flex:1"></span>' +
    '<button class="btn small" onclick="batchImportSup()">📥 批量导入</button>' +
    '<button class="btn small" onclick="exportSuppliers()">📤 批量导出</button>' +
    '<button class="btn primary small" onclick="editSupplier()">＋ 新增供应商</button></div>';
  var items = (S.suppliers.items || []).filter(function (s) {
    return (workState.supFilter || '全部') === '全部' || s.category === workState.supFilter;
  });
  if (!items.length) return h + '<div class="card"><div class="empty">暂无供应链档案</div></div>';
  items.forEach(function (s) {
    h += '<div class="card"><div class="li-meta" style="justify-content:space-between"><b style="font-size:15px;color:var(--ink)">🏭 ' + esc(s.name) + '</b>' +
      '<span class="tag">' + esc(s.category || '供应商') + '</span></div>' +
      '<div class="li-body">地区：' + esc(s.region || '-') + '　对接人：' + esc(s.person || '-') + '　联系方式：' + esc(s.contact || '-') + '</div>' +
      (s.factory_addr ? '<div class="li-body">🏗 工厂地址：' + esc(s.factory_addr) + '</div>' : '') +
      (s.ship_addr ? '<div class="li-body">📦 收货地址：' + esc(s.ship_addr) + '</div>' : '') +
      '<div class="li-body">交货周期：' + esc(s.leadtime || '-') + '　报价：' + esc(s.quote || '-') + '</div>' +
      (s.terms ? '<div class="li-body">📄 合作条款：' + esc(s.terms) + '</div>' : '');
    var recs = s.records || [];
    if (recs.length) {
      h += '<details class="comm"><summary>合作记录（' + recs.length + '）</summary>';
      recs.slice().reverse().forEach(function (r) {
        h += '<div class="comm-item"><b>' + esc(r.date) + '</b>　' + esc(r.content);
        if (r.images && r.images.length) {
          h += '<div class="rec-imgs">' + r.images.map(function (u) {
            return '<a href="' + esc(u) + '" target="_blank"><img src="' + esc(u) + '"></a>';
          }).join('') + '</div>';
        }
        h += '</div>';
      });
      h += '</details>';
    }
    h += '<div style="margin-top:10px;display:flex;gap:8px">' +
      '<button class="btn small primary" onclick="addSupplierRec(\'' + s.id + '\')">＋ 合作记录</button>' +
      '<button class="btn small" onclick="editSupplier(\'' + s.id + '\')">编辑</button>' +
      '<button class="btn small danger" onclick="delItem(\'suppliers\',\'' + s.id + '\')">删除</button></div></div>';
  });
  return h;
}
function editSupplier(id) {
  var s = id ? S.suppliers.items.find(function (x) { return x.id === id; }) : {};
  openForm(id ? '编辑供应商' : '新增供应商', [
    { key: 'name', label: '供应商名称', required: true, value: s.name },
    { key: 'category', label: '类型', type: 'select', options: SUPPLIER_TYPES, value: s.category || SUPPLIER_TYPES[0] },
    { key: 'region', label: '地区（如 广东东莞）', value: s.region },
    { key: 'factory_addr', label: '工厂地址', value: s.factory_addr },
    { key: 'ship_addr', label: '收货地址', value: s.ship_addr },
    { key: 'person', label: '对接人', value: s.person },
    { key: 'contact', label: '联系方式', value: s.contact },
    { key: 'leadtime', label: '交货周期', value: s.leadtime },
    { key: 'quote', label: '报价', value: s.quote },
    { key: 'terms', label: '合作条款', type: 'textarea', value: s.terms }
  ], function (v) {
    if (id) Object.assign(s, v);
    else { v.id = uid(); v.records = []; v.created = today(); S.suppliers.items.push(v); }
    save('suppliers', function () { toast('已保存'); render(); });
  });
}
function addSupplierRec(id) {
  var s = S.suppliers.items.find(function (x) { return x.id === id; });
  openForm('新增合作记录 · ' + s.name, [
    { key: 'date', label: '日期', type: 'date', value: today() },
    { key: 'content', label: '记录内容', type: 'textarea', required: true },
    { key: 'images', label: '图片（合同/聊天截图等）', type: 'images', value: [] }
  ], function (v) {
    (s.records = s.records || []).push(v);
    save('suppliers', function () { toast('已记录'); render(); });
  });
}

/* 通用CSV下载 */
function downloadCSV(rows, filename) {
  var csv = '\ufeff' + rows.map(function (r) {
    return r.map(function (c) {
      c = (c == null ? '' : String(c));
      return /[,"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
    }).join(',');
  }).join('\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  toast('已导出 ' + (rows.length - 1) + ' 条');
}

/* 供应链：批量导出 */
function exportSuppliers() {
  var items = (S.suppliers.items || []).filter(function (s) {
    return (workState.supFilter || '全部') === '全部' || s.category === workState.supFilter;
  });
  if (!items.length) return toast('没有可导出的供应商');
  var rows = [['供应商名称', '类型', '地区', '工厂地址', '收货地址', '对接人', '联系方式', '交货周期', '报价', '合作条款', '合作记录数']];
  items.forEach(function (s) {
    rows.push([s.name, s.category || '', s.region || '', s.factory_addr || '', s.ship_addr || '',
      s.person || '', s.contact || '', s.leadtime || '', s.quote || '', s.terms || '', (s.records || []).length]);
  });
  downloadCSV(rows, '供应链档案_' + (workState.supFilter || '全部') + '_' + today() + '.csv');
}

/* 供应链：批量导入（每行一家） */
function batchImportSup() {
  openForm('批量导入供应商（每行一家）', [
    { key: 'text', label: '格式：名称，类型，地区，对接人，联系方式，报价（逗号分隔，名称后的项可省略）\n类型可选：' + SUPPLIER_TYPES.join('/') + '\n也可直接粘贴导出的CSV内容（自动跳过表头）', type: 'textarea', required: true }
  ], function (v) {
    var lines = v.text.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var added = 0, skipped = 0;
    lines.forEach(function (line) {
      var parts = line.split(/[,，|｜\t]/).map(function (x) { return x.replace(/^"|"$/g, '').trim(); });
      if (!parts[0] || parts[0] === '供应商名称') return; /* 跳过空行与CSV表头 */
      if ((S.suppliers.items || []).some(function (x) { return x.name === parts[0]; })) { skipped++; return; }
      var cat = SUPPLIER_TYPES.indexOf(parts[1]) >= 0 ? parts[1] : '';
      /* 兼容两种格式：简易6列 与 导出CSV的11列 */
      var isCSV = parts.length >= 7;
      S.suppliers.items.push({
        id: uid(), name: parts[0], category: cat,
        region: parts[2] || '', factory_addr: isCSV ? (parts[3] || '') : '', ship_addr: isCSV ? (parts[4] || '') : '',
        person: (isCSV ? parts[5] : parts[3]) || '', contact: (isCSV ? parts[6] : parts[4]) || '',
        leadtime: isCSV ? (parts[7] || '') : '', quote: (isCSV ? parts[8] : parts[5]) || '',
        terms: isCSV ? (parts[9] || '') : '', records: [], created: today()
      });
      added++;
    });
    save('suppliers', function () { toast('导入完成：新增 ' + added + ' 家' + (skipped ? '，跳过重复 ' + skipped + ' 家' : '')); render(); });
  });
}

/* ---- 达人档案 ---- */
function influencerView() {
  var h = '<div class="toolbar">';
  ['全部'].concat(INF_CATS).forEach(function (f) {
    h += '<button class="chip' + (workState.infFilter === f ? ' on' : '') + '" onclick="workState.infFilter=\'' + f + '\';render()">' + f + '</button>';
  });
  h += '</div><div class="toolbar"><span style="font-size:12px;color:var(--ink2)">共 ' + (S.influencers.items || []).length + ' 位达人</span>' +
    '<span style="flex:1"></span>' +
    '<button class="btn small" onclick="batchImportInf()">📥 批量导入</button>' +
    '<button class="btn small" onclick="exportInfluencers()">📤 批量导出</button>' +
    '<button class="btn primary small" onclick="editInfluencer()">＋ 新增达人</button></div>';
  var items = (S.influencers.items || []).filter(function (f) {
    return workState.infFilter === '全部' || f.category === workState.infFilter;
  });
  if (!items.length) return h + '<div class="card"><div class="empty">暂无达人档案</div></div>';
  items.forEach(function (f) {
    var stars = f.rating ? '　评价：' + '★'.repeat(Number(f.rating)) + '☆'.repeat(5 - Number(f.rating)) : '';
    h += '<div class="card"><div class="li-meta" style="justify-content:space-between"><b style="font-size:15px;color:var(--ink)">🌟 ' + esc(f.name) + '</b>' +
      '<span>' + (f.category ? '<span class="tag t-work">' + esc(f.category) + '</span> ' : '') +
      '<span class="tag">' + esc(f.platform || '小红书') + '</span></span></div>' +
      '<div class="li-body">联系方式：' + esc(f.contact || '-') + '　报价：' + esc(f.price || '-') + stars + '</div>' +
      (f.schedule ? '<div class="li-body">📅 排期：' + esc(f.schedule) + '</div>' : '') +
      (f.history ? '<div class="li-body">🤝 合作历史：' + esc(f.history) + '</div>' : '') +
      (f.notes ? '<div class="li-body">📝 ' + esc(f.notes) + '</div>' : '') +
      '<div style="margin-top:10px;display:flex;gap:8px">' +
      '<button class="btn small" onclick="editInfluencer(\'' + f.id + '\')">编辑</button>' +
      '<button class="btn small danger" onclick="delItem(\'influencers\',\'' + f.id + '\')">删除</button></div></div>';
  });
  return h;
}
function editInfluencer(id) {
  var f = id ? S.influencers.items.find(function (x) { return x.id === id; }) : {};
  openForm(id ? '编辑达人档案' : '新增达人档案', [
    { key: 'name', label: '达人昵称', required: true, value: f.name },
    { key: 'category', label: '分类', type: 'select', options: INF_CATS, value: f.category || INF_CATS[0] },
    { key: 'platform', label: '平台', type: 'select', options: ['小红书', '微博', 'B站', '抖音', '圈内'], value: f.platform },
    { key: 'contact', label: '联系方式', value: f.contact },
    { key: 'price', label: '合作报价', value: f.price },
    { key: 'schedule', label: '排期', value: f.schedule },
    { key: 'history', label: '合作历史', type: 'textarea', value: f.history },
    { key: 'rating', label: '合作评价(1-5星)', type: 'select', options: ['', '1', '2', '3', '4', '5'], value: f.rating },
    { key: 'notes', label: '备注', type: 'textarea', value: f.notes }
  ], function (v) {
    if (id) Object.assign(f, v);
    else { v.id = uid(); v.created = today(); S.influencers.items.push(v); }
    save('influencers', function () { toast('已保存'); render(); });
  });
}
/* 达人：批量导出 */
function exportInfluencers() {
  var items = (S.influencers.items || []).filter(function (f) {
    return workState.infFilter === '全部' || f.category === workState.infFilter;
  });
  if (!items.length) return toast('没有可导出的达人');
  var rows = [['昵称', '分类', '平台', '联系方式', '报价', '排期', '合作历史', '评价(星)', '备注']];
  items.forEach(function (f) {
    rows.push([f.name, f.category || '', f.platform || '', f.contact || '', f.price || '',
      f.schedule || '', f.history || '', f.rating || '', f.notes || '']);
  });
  downloadCSV(rows, '达人档案_' + workState.infFilter + '_' + today() + '.csv');
}

/* 批量导入：每行一位达人 */
function batchImportInf() {
  openForm('批量导入达人（每行一位）', [
    { key: 'text', label: '格式：昵称，分类，平台，联系方式，报价（用中文/英文逗号分隔，后三项可省略）\n分类可选：' + INF_CATS.join('/') + '\n也可直接粘贴导出的CSV内容（自动跳过表头）', type: 'textarea', required: true }
  ], function (v) {
    var lines = v.text.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var added = 0, skipped = 0;
    lines.forEach(function (line) {
      var parts = line.split(/[,，|｜\t]/).map(function (x) { return x.replace(/^"|"$/g, '').trim(); });
      if (!parts[0] || parts[0] === '昵称') return; /* 跳过空行与CSV表头 */
      /* 昵称重复则跳过 */
      if ((S.influencers.items || []).some(function (x) { return x.name === parts[0]; })) { skipped++; return; }
      var cat = INF_CATS.indexOf(parts[1]) >= 0 ? parts[1] : (parts[1] && /测评/.test(parts[1]) ? '开箱测评' : (parts[1] || ''));
      S.influencers.items.push({
        id: uid(), name: parts[0], category: cat, platform: parts[2] || '小红书',
        contact: parts[3] || '', price: parts[4] || '',
        schedule: parts[5] || '', history: parts[6] || '',
        rating: (/^[1-5]$/.test(parts[7] || '') ? parts[7] : ''), notes: parts[8] || '', created: today()
      });
      added++;
    });
    save('influencers', function () { toast('导入完成：新增 ' + added + ' 位' + (skipped ? '，跳过重复 ' + skipped + ' 位' : '')); render(); });
  });
}

/* ============ 眼镜业务 ============ */
function workGlasses() {
  var tabs = [['clients', '👥 大客户档案'], ['prospects', '🎯 待开发客户'], ['comms', '📞 客情台账'], ['gnews', '🔍 行业资讯']];
  var h = '<div class="tabs">' + tabs.map(function (t) {
    return '<button class="tab' + (workState.glTab === t[0] ? ' active' : '') + '" onclick="workState.glTab=\'' + t[0] + '\';render()">' + t[1] + '</button>';
  }).join('') + '</div><div class="tab-body">';
  if (workState.glTab === 'clients') h += clientsView();
  else if (workState.glTab === 'prospects') h += prospectsView();
  else if (workState.glTab === 'comms') h += commsView();
  else h += newsView('glasses_news', 'gnewsKw');
  return h + '</div>';
}

function clientRating(c) { return c.rating || (c.vip === '是' ? 'S' : ''); }

function clientsView() {
  var h = '<div class="toolbar">';
  ['全部', '待回访', 'S', 'A', 'B', 'C'].forEach(function (f) {
    h += '<button class="chip' + (workState.clientFilter === f ? ' on' : '') + '" onclick="workState.clientFilter=\'' + f + '\';render()">' + (f.length === 1 ? f + '级' : f) + '</button>';
  });
  h += '<span style="flex:1"></span><button class="btn primary small" onclick="editClient()">＋ 新增客户</button></div>';
  var items = (S.glasses_clients.items || []).filter(function (c) {
    if (workState.clientFilter === '待回访') { var d = daysUntil(c.next_visit); return d != null && d <= 3; }
    if (workState.clientFilter.length === 1) return clientRating(c) === workState.clientFilter;
    return true;
  });
  if (!items.length) return h + '<div class="card"><div class="empty">暂无客户档案</div></div>';
  /* S > A > B > C 排序 */
  items.sort(function (a, b) { return (CLIENT_RATINGS.indexOf(clientRating(a)) + 9 || 99) - (CLIENT_RATINGS.indexOf(clientRating(b)) + 9 || 99); });
  items.forEach(function (c) {
    var d = daysUntil(c.next_visit);
    var vBadge = (d != null && d <= 3) ? '<span class="badge ' + (d < 0 ? 'red' : 'warn') + '">回访' + (d < 0 ? '已过期' : d === 0 ? '今天' : d + '天后') + '</span>' : '';
    var r = clientRating(c);
    var rBadge = r ? '<span class="rating-badge r-' + r + '">' + r + '</span>' : '';
    h += '<div class="card"><div class="li-meta" style="justify-content:space-between"><b style="font-size:15px;color:var(--ink)">' +
      rBadge + ' ' + esc(c.name) + '</b><span>' + vBadge + '</span></div>' +
      '<div class="li-body">对接人：' + esc(c.person || '-') + (c.title ? '（' + esc(c.title) + '）' : '') + '　联系方式：' + esc(c.contact || '-') + '</div>' +
      '<div class="li-body">合作体量：' + esc(c.scale || '-') + '　阶段：<b>' + esc(c.stage || '-') + '</b></div>' +
      (c.needs ? '<div class="li-body">🎯 核心需求：' + esc(c.needs) + '</div>' : '') +
      (c.note ? '<div class="li-body">👤 个人情况：' + esc(c.note) + '</div>' : '') +
      (c.next_visit ? '<div class="li-body">📅 计划回访：' + esc(c.next_visit) + '</div>' : '');
    var comms = c.comms || [];
    if (comms.length) {
      h += '<details class="comm"><summary>沟通记录（' + comms.length + '）</summary>';
      comms.slice().reverse().forEach(function (m) {
        h += '<div class="comm-item"><b>' + esc(m.date) + '</b>　' + esc(m.content) +
          (m.followup ? '<br>📌 待落实：' + esc(m.followup) : '') +
          (m.next_visit ? '<br>📅 计划回访：' + esc(m.next_visit) : '') + '</div>';
      });
      h += '</details>';
    }
    h += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn small primary" onclick="addComm(\'' + c.id + '\')">＋ 沟通记录</button>' +
      '<button class="btn small" onclick="editClient(\'' + c.id + '\')">编辑</button>' +
      '<button class="btn small danger" onclick="delItem(\'glasses_clients\',\'' + c.id + '\')">删除</button></div></div>';
  });
  return h;
}
function editClient(id) {
  var c = id ? S.glasses_clients.items.find(function (x) { return x.id === id; }) : {};
  openForm(id ? '编辑客户' : '新增大客户', [
    { key: 'name', label: '公司名称', required: true, value: c.name },
    { key: 'person', label: '对接人', value: c.person },
    { key: 'title', label: '职位', value: c.title },
    { key: 'contact', label: '联系方式', value: c.contact },
    { key: 'scale', label: '合作体量', value: c.scale },
    { key: 'rating', label: '客户评级', type: 'select', options: CLIENT_RATINGS, value: clientRating(c) || 'B' },
    { key: 'stage', label: '合作阶段', type: 'select', options: ['初步接触', '需求确认', '方案报价', '试单', '稳定合作', '暂停'], value: c.stage },
    { key: 'needs', label: '核心需求', type: 'textarea', value: c.needs },
    { key: 'note', label: '个人情况备注', type: 'textarea', value: c.note },
    { key: 'next_visit', label: '计划回访日期', type: 'date', value: c.next_visit }
  ], function (v) {
    if (id) Object.assign(c, v);
    else { v.id = uid(); v.comms = []; v.created = today(); S.glasses_clients.items.push(v); }
    save('glasses_clients', function () { toast('已保存'); render(); });
  });
}
function addComm(id) {
  var c = S.glasses_clients.items.find(function (x) { return x.id === id; });
  openForm('新增沟通记录 · ' + c.name, [
    { key: 'date', label: '沟通时间', type: 'date', value: today() },
    { key: 'content', label: '谈话内容', type: 'textarea', required: true },
    { key: 'followup', label: '待落实事项', type: 'textarea' },
    { key: 'next_visit', label: '计划回访日期', type: 'date' }
  ], function (v) {
    (c.comms = c.comms || []).push(v);
    if (v.next_visit) c.next_visit = v.next_visit;
    save('glasses_clients', function () { toast('已记录'); render(); });
  });
}

/* ---- 待开发客户 ---- */
function prospectsView() {
  var t = today();
  var all = S.prospects.items || [];
  var todayN = all.filter(function (p) { return p.added === t; }).length;
  var h = '<div class="hint">🎯 每日自动更新 20 个广东省潜在客户（公司情况/现用镜片品牌/切入点/销售话术）。逐个打卡反馈：值得跟 → 继续沟通；没戏 → 放弃。看中的客户可一键转入大客户档案。今日已更新 <b>' + todayN + '</b> 个。</div>';
  h += '<div class="toolbar">';
  ['全部', '今日新增', '待打卡', '继续沟通', '已放弃', '已转正'].forEach(function (f) {
    h += '<button class="chip' + (workState.prosFilter === f ? ' on' : '') + '" onclick="workState.prosFilter=\'' + f + '\';render()">' + f + '</button>';
  });
  h += '<span style="flex:1"></span><button class="btn primary small" onclick="editProspect()">＋ 手动添加</button></div>';
  var items = all.slice().sort(function (a, b) { return (b.added || '').localeCompare(a.added || ''); }).filter(function (p) {
    if (workState.prosFilter === '今日新增') return p.added === t;
    if (workState.prosFilter === '待打卡') return !p.status || p.status === '待跟进';
    if (workState.prosFilter === '继续沟通') return p.status === '继续沟通';
    if (workState.prosFilter === '已放弃') return p.status === '放弃';
    if (workState.prosFilter === '已转正') return p.status === '已转正';
    return true;
  });
  if (!items.length) return h + '<div class="card"><div class="empty">暂无待开发客户，每日自动更新后会出现在这里</div></div>';
  items.forEach(function (p) {
    var st = p.status || '待跟进';
    var stBadge = st === '继续沟通' ? '<span class="badge ok">继续沟通</span>' :
      st === '放弃' ? '<span class="badge gray">已放弃</span>' :
      st === '已转正' ? '<span class="badge ok">💎 已转正</span>' : '<span class="badge warn">待打卡</span>';
    h += '<div class="card' + (st === '放弃' ? ' dimmed-card' : '') + '"><div class="li-meta" style="justify-content:space-between"><b style="font-size:15px;color:var(--ink)">🎯 ' + esc(p.company) + '</b>' + stBadge + '</div>' +
      '<div class="li-meta"><span>📍 ' + esc(p.region || '广东') + '</span><span>📅 ' + esc(p.added || '') + '</span></div>' +
      (p.contact ? '<div class="li-body">📱 联系方式：' + esc(p.contact) + '</div>' : '') +
      (p.profile ? '<div class="li-body">🏢 公司情况：' + esc(p.profile) + '</div>' : '') +
      (p.competitor ? '<div class="li-body">🔄 现用镜片：' + esc(p.competitor) + '</div>' : '') +
      (p.angle ? '<div class="li-body" style="color:var(--accent-deep)">💡 切入点：' + esc(p.angle) + '</div>' : '') +
      (p.script ? '<details class="comm"><summary>💬 销售话术</summary><div class="comm-item">' + esc(p.script).replace(/\n/g, '<br>') + '</div></details>' : '') +
      (p.feedback ? '<div class="li-body" style="color:var(--blue)">📝 我的反馈：' + esc(p.feedback) + '</div>' : '') +
      '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">';
    if (st !== '已转正') {
      h += '<button class="btn small primary" onclick="prospectMark(\'' + p.id + '\',\'继续沟通\')">✔ 继续沟通</button>' +
        '<button class="btn small" onclick="prospectMark(\'' + p.id + '\',\'放弃\')">✘ 放弃</button>' +
        '<button class="btn small" onclick="prospectToClient(\'' + p.id + '\')">💎 转入大客户</button>';
    }
    h += '<button class="btn small" onclick="editProspect(\'' + p.id + '\')">编辑</button>' +
      '<button class="btn small danger" onclick="delItem(\'prospects\',\'' + p.id + '\')">删除</button></div></div>';
  });
  return h;
}
function prospectMark(id, st) {
  var p = S.prospects.items.find(function (x) { return x.id === id; });
  openForm(st === '继续沟通' ? '打卡：继续沟通' : '打卡：放弃', [
    { key: 'feedback', label: '反馈备注（沟通情况/放弃原因，可空）', type: 'textarea', value: p.feedback }
  ], function (v) {
    p.status = st;
    if (v.feedback) p.feedback = v.feedback;
    p.marked_at = today();
    save('prospects', function () { toast('已打卡：' + st); render(); });
  });
}
function prospectToClient(id) {
  var p = S.prospects.items.find(function (x) { return x.id === id; });
  S.glasses_clients.items.push({
    id: uid(), name: p.company, person: '', title: '', contact: p.contact || '',
    scale: '', rating: 'B', stage: '初步接触', needs: p.angle || '',
    note: (p.profile || '') + (p.competitor ? '；现用：' + p.competitor : ''),
    next_visit: '', comms: [], created: today()
  });
  p.status = '已转正';
  save('glasses_clients', function () {
    save('prospects', function () { toast('已转入大客户档案 💎'); render(); });
  });
}
function editProspect(id) {
  var p = id ? S.prospects.items.find(function (x) { return x.id === id; }) : {};
  openForm(id ? '编辑待开发客户' : '添加待开发客户', [
    { key: 'company', label: '公司名称', required: true, value: p.company },
    { key: 'region', label: '地区', value: p.region || '广东' },
    { key: 'contact', label: '联系方式', value: p.contact },
    { key: 'profile', label: '公司情况', type: 'textarea', value: p.profile },
    { key: 'competitor', label: '现用哪家镜片', value: p.competitor },
    { key: 'angle', label: '切入点', type: 'textarea', value: p.angle },
    { key: 'script', label: '销售话术', type: 'textarea', value: p.script }
  ], function (v) {
    if (id) Object.assign(p, v);
    else { v.id = uid(); v.added = today(); v.status = '待跟进'; S.prospects.items.push(v); }
    save('prospects', function () { toast('已保存'); render(); });
  });
}

/* 客情台账：全部沟通流水 */
function commsView() {
  var rows = [];
  (S.glasses_clients.items || []).forEach(function (c) {
    (c.comms || []).forEach(function (m) { rows.push({ client: c.name, r: clientRating(c), m: m }); });
  });
  rows.sort(function (a, b) { return (b.m.date || '').localeCompare(a.m.date || ''); });
  var h = '<div class="hint">按时间倒序展示全部客户的沟通/客情记录，共 ' + rows.length + ' 条。新增记录请在「大客户档案」中对应客户卡片操作。</div>';
  if (!rows.length) return h + '<div class="card"><div class="empty">暂无客情记录</div></div>';
  h += '<div class="card">';
  rows.forEach(function (r) {
    h += '<div class="list-item"><div class="li-title">' + (r.r ? '<span class="rating-badge r-' + r.r + '">' + r.r + '</span> ' : '') + esc(r.client) + '　<span style="font-weight:400;font-size:12px;color:var(--ink2)">' + esc(r.m.date) + '</span></div>' +
      '<div class="li-body">' + esc(r.m.content) + '</div>' +
      (r.m.followup ? '<div class="li-body">📌 待落实：' + esc(r.m.followup) + '</div>' : '') +
      (r.m.next_visit ? '<div class="li-body">📅 计划回访：' + esc(r.m.next_visit) + '</div>' : '') + '</div>';
  });
  return h + '</div>';
}

/* 通用删除 */
function delItem(coll, id) {
  armBtn(evtBtn(), function () {
    S[coll].items = S[coll].items.filter(function (x) { return x.id !== id; });
    save(coll, function () { toast('已删除'); render(); });
  }, '再点一次确认删除');
}
