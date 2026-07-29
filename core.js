/* ===== 核心：状态 / 数据读写 / 通用组件 ===== */
var S = {};            // 全部数据
var currentView = 'todo';
var TAGS = ['BJD业务', '眼镜业务', '玄学学习', '商务英语', '阅读', '记账'];
var TODO_CATS = ['工作待办', '生活待办'];
/* 台账列表：默认只有日常台账，其他项目台账在记账页「台账管理」中添加（存于 ledger.json 的 books 字段） */
function ledgerBooks() {
  var arr = (S.ledger && S.ledger.books) || [];
  if (!arr.length) arr = ['日常台账'];
  if (arr.indexOf('日常台账') < 0) arr.unshift('日常台账');
  return arr;
}

function $(sel) { return document.querySelector(sel); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function today() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDays(dateStr, n) {
  var d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  var a = new Date(dateStr + 'T00:00:00'), b = new Date(today() + 'T00:00:00');
  return Math.round((a - b) / 86400000);
}
function fmtMoney(n) { return '¥' + Number(n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }

function toast(msg) {
  var t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(function () { t.classList.remove('show'); }, 1800);
}

/* ---- 数据 API（纯前端；未配置时自动进入本地模式，⚙️ 可升级 GitHub 云端同步） ---- */
function loadAll(cb) {
  GH.loadAll(function (ok, err) {
    if (!ok && err === 'auth') { showSetup(true); return; }
    if (ok && GH.mode() === 'local' && !window.__localHint) {
      window.__localHint = true;
      toast('本地模式：数据存在本机浏览器（工作电脑不留文件）。点 ⚙️ 可升级为 GitHub 云端同步', 5200);
    }
    cb && cb();
  });
}

/* ---- 首次配置 / Token 设置页 ---- */
function showSetup(isAuthFail) {
  if ($('#setupMask')) { $('#setupErr').textContent = isAuthFail ? 'Token 无效或无权访问该仓库，请检查后重试' : ''; return; }
  var c = GH.config() || {};
  var div = document.createElement('div');
  div.id = 'setupMask';
  div.className = 'setup-mask';
  div.innerHTML =
    '<div class="setup-card">' +
    '<div class="lock-emoji">🌿</div>' +
    '<h3>连接你的数据仓库</h3>' +
    '<div class="lock-sub">数据保存在你自己的 GitHub 私有仓库，多设备自动同步。' +
    '还没建？去 GitHub 建一个<strong>私有</strong>仓库（如 workbench-data），并生成有 repo 权限的 Token。</div>' +
    '<label>GitHub 用户名</label><input id="cfgOwner" value="' + esc(c.owner || 'Shiny-41') + '" placeholder="你的用户名">' +
    '<label>数据仓库名（私有）</label><input id="cfgRepo" value="' + esc(c.repo || 'workbench-data') + '" placeholder="workbench-data">' +
    '<label>分支</label><input id="cfgBranch" value="' + esc(c.branch || 'main') + '" placeholder="main">' +
    '<label>Token（PAT，仅存本机浏览器）</label><input id="cfgToken" type="password" placeholder="github_pat_..." autocomplete="off">' +
    '<button id="cfgSave" class="primary">保存并连接</button>' +
    '<a class="setup-help" href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener">如何获取 Token ↗</a>' +
    (c.token ? '<button id="cfgLogout" class="link-btn">清除本机 Token（退出登录）</button>' : '') +
    '<div id="setupErr" class="lock-err"></div></div>';
  document.body.appendChild(div);
  var doSave = function () {
    var nc = {
      owner: $('#cfgOwner').value.trim(),
      repo: $('#cfgRepo').value.trim(),
      branch: $('#cfgBranch').value.trim() || 'main',
      token: $('#cfgToken').value.trim()
    };
    if (!nc.owner || !nc.repo || !nc.token) { $('#setupErr').textContent = '请填齐用户名、仓库名和 Token'; return; }
    $('#cfgSave').textContent = '连接中…';
    GH.test(nc).then(function (res) {
      if (!res.ok) {
        $('#setupErr').textContent = res.status === 404 ? '仓库不存在或 Token 无权限' : (res.status === 401 ? 'Token 无效' : '连接失败（' + res.status + '）');
        $('#cfgSave').textContent = '保存并连接';
        return;
      }
      if (!res.private) {
        $('#setupErr').textContent = '⚠ 该仓库是「公开」的，业务数据会被外人看到，请改用私有仓库';
        $('#cfgSave').textContent = '保存并连接';
        return;
      }
      GH.saveCfg(nc);
      $('#setupMask').remove();
      loadAll(function () { render(); toast('已连接'); });
    });
  };
  $('#cfgSave').onclick = doSave;
  $('#cfgToken').addEventListener('keydown', function (e) { if (e.key === 'Enter') doSave(); });
  if ($('#cfgLogout')) {
    $('#cfgLogout').onclick = function () {
      GH.clearCfg();
      $('#setupMask').remove();
      showSetup();
      toast('已清除本机 Token');
    };
  }
  setTimeout(function () { (c.owner ? $('#cfgToken') : $('#cfgOwner')).focus(); }, 100);
}
/* 两次点击确认（iOS PWA 下原生 confirm 会被拦截，统一用此方案）
   第一次点：按钮变红提示；3秒内再点一次才执行 fn */
function armBtn(btn, fn, tip) {
  if (!btn) { fn(); return; }
  if (btn.dataset.armed) {
    delete btn.dataset.armed;
    clearTimeout(btn._armT);
    fn();
    return;
  }
  btn.dataset.armed = '1';
  btn._origHTML = btn.innerHTML;
  btn.innerHTML = '再点一次确认';
  btn.classList.add('armed');
  if (tip) toast(tip);
  btn._armT = setTimeout(function () {
    delete btn.dataset.armed;
    btn.innerHTML = btn._origHTML;
    btn.classList.remove('armed');
  }, 3000);
}
/* 从内联 onclick 里拿到当前按钮 */
function evtBtn() {
  try { return window.event && window.event.target.closest('button'); } catch (e) { return null; }
}

function save(name, cb) {
  GH.save(name, function (ok) { if (ok && cb) cb(); });
}

/* ---- 通用表单弹窗 ----
   fields: [{key,label,type:'text|number|date|select|textarea|images',options,value,required}]
   type:'images' → 图片多选上传，值为 URL 数组 */
function openForm(title, fields, onSubmit) {
  var html = '<h3>' + esc(title) + '</h3>';
  fields.forEach(function (f) {
    html += '<div class="form-row"><label>' + esc(f.label) + (f.required ? ' *' : '') + '</label>';
    var v = f.value == null ? '' : f.value;
    if (f.type === 'select') {
      html += '<select data-k="' + f.key + '">' + (f.options || []).map(function (o) {
        return '<option value="' + esc(o) + '"' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select>';
    } else if (f.type === 'textarea') {
      html += '<textarea data-k="' + f.key + '">' + esc(v) + '</textarea>';
    } else if (f.type === 'images') {
      var imgs = Array.isArray(v) ? v : [];
      html += '<div class="img-field" data-k="' + f.key + '" data-urls=\'' + esc(JSON.stringify(imgs)) + '\'>' +
        '<div class="img-thumbs">' + imgs.map(function (u) {
          return '<span class="img-thumb"><img src="' + esc(u) + '"><i onclick="rmFormImg(this)">✕</i></span>';
        }).join('') + '</div>' +
        '<input type="file" accept="image/*" multiple style="display:none">' +
        '<button type="button" class="btn small" onclick="this.previousElementSibling.click()">📷 添加图片</button>' +
        '<span class="img-status" style="font-size:11px;color:var(--ink2)"></span></div>';
    } else {
      html += '<input data-k="' + f.key + '" type="' + (f.type || 'text') + '" value="' + esc(v) + '">';
    }
    html += '</div>';
  });
  html += '<div class="modal-actions"><button class="btn" id="fmCancel">取消</button><button class="btn primary" id="fmOk">保存</button></div>';
  $('#modal').innerHTML = html;
  $('#modalMask').style.display = 'flex';

  /* 图片字段绑定上传（本地压缩为 data URL，直接内联，无需图床） */
  document.querySelectorAll('#modal .img-field input[type=file]').forEach(function (fileEl) {
    fileEl.addEventListener('change', function () {
      var wrap = fileEl.closest('.img-field');
      var status = wrap.querySelector('.img-status');
      var files = Array.prototype.slice.call(fileEl.files);
      var done = 0;
      if (!files.length) return;
      status.textContent = '处理中…';
      files.forEach(function (file) {
        GH.upload(file).then(function (dataUrl) {
          done++;
          var urls = JSON.parse(wrap.dataset.urls || '[]');
          urls.push(dataUrl);
          wrap.dataset.urls = JSON.stringify(urls);
          wrap.querySelector('.img-thumbs').insertAdjacentHTML('beforeend',
            '<span class="img-thumb"><img src="' + esc(dataUrl) + '"><i onclick="rmFormImg(this)">✕</i></span>');
          status.textContent = done === files.length ? '' : ('处理中 ' + done + '/' + files.length);
        }).catch(function () {
          done++; status.textContent = done === files.length ? '部分图片处理失败' : ('处理中 ' + done + '/' + files.length);
        });
      });
      fileEl.value = '';
    });
  });

  $('#fmCancel').onclick = closeModal;
  $('#fmOk').onclick = function () {
    var out = {}, ok = true;
    fields.forEach(function (f) {
      if (f.type === 'images') {
        var wrap = $('#modal .img-field[data-k="' + f.key + '"]');
        out[f.key] = wrap ? JSON.parse(wrap.dataset.urls || '[]') : [];
        return;
      }
      var el = $('#modal [data-k="' + f.key + '"]');
      var val = el ? el.value.trim() : '';
      if (f.required && !val) { ok = false; el.style.borderColor = '#dc2626'; }
      out[f.key] = val;
    });
    if (!ok) { toast('请填写必填项'); return; }
    closeModal();
    onSubmit(out);
  };
}
function rmFormImg(el) {
  var thumb = el.closest('.img-thumb');
  var wrap = el.closest('.img-field');
  var url = thumb.querySelector('img').getAttribute('src');
  var urls = JSON.parse(wrap.dataset.urls || '[]').filter(function (u) { return u !== url; });
  wrap.dataset.urls = JSON.stringify(urls);
  thumb.remove();
}
function closeModal() { $('#modalMask').style.display = 'none'; }
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

/* ---- 视图路由 ---- */
var VIEWS = {};   // 各模块注册 render 函数
function go(view) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(function (n) {
    n.classList.toggle('active', n.dataset.view === view);
  });
  render();
  window.scrollTo(0, 0);
}
function render() {
  var fn = VIEWS[currentView];
  $('#main').innerHTML = fn ? fn() : '<div class="card">模块不存在</div>';
  var binder = VIEWS[currentView + '_bind'];
  if (binder) binder();
}
function thisMonth() { return today().slice(0, 7); }
/* 重新渲染但保留指定输入框的焦点与光标（用于列表内搜索） */
function renderKeepFocus(id) {
  var el = id ? $('#' + id) : null;
  var pos = el && el.selectionStart ? el.selectionStart : null;
  render();
  var el2 = id ? $('#' + id) : null;
  if (el2) {
    el2.focus();
    if (pos != null && el2.setSelectionRange) { try { el2.setSelectionRange(pos, pos); } catch (e) {} }
  }
}
