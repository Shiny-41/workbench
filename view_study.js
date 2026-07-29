/* ===== 学习 Tab：国学 / 英语 / 著作阅读 / 随笔素材库 ===== */
var studyState = { tab: 'english', engDate: '', engTab: 'today', matTab: 'quotes', quoteKw: '', essayKw: '', pickQuote: null };
var EBB_OFFSETS = [1, 2, 4, 7, 15, 30];   // 艾宾浩斯复习间隔（天）

VIEWS.study = function () {
  var h = '<h1 class="page-title">📖 学习</h1><div class="page-sub">英语 · 阅读 · 国学 · 素材，日拱一卒</div>';
  h += '<div class="tabs">' + [['english', '🗣 英语学习'], ['books', '📚 著作阅读'], ['guoxue', '☯ 国学学习'], ['material', '✍ 随笔素材库']].map(function (t) {
    return '<button class="tab' + (studyState.tab === t[0] ? ' active' : '') + '" onclick="studyState.tab=\'' + t[0] + '\';render()">' + t[1] + '</button>';
  }).join('') + '</div><div class="tab-body">';
  if (studyState.tab === 'guoxue') h += guoxueView();
  else if (studyState.tab === 'english') h += englishView();
  else if (studyState.tab === 'books') h += booksView();
  else h += materialView();
  return h + '</div>';
};

/* ---------- 国学学习（独立AI对话 + 八字案例） ---------- */
function guoxueView() {
  /* 完全独立的国学导师对话框：曾仕强+倪海厦知识体系 */
  var h = aiChatHTML('guoxue', '☯ 国学导师（赛博神算子坐镇）',
    '由专家「赛博神算子」回复，融合曾仕强、倪海厦两位先生的知识体系，帮你认识自己、顺势而为、趋吉避凶。可直接发「八字分析：1995年8月20日 早7点 公历 女」。');
  h += '<div class="hint">📁 下方是历史八字案例存档（对话中完成的结构化分析也会同步到 WorkBuddy 存档到这里）。</div>';
  var items = (S.bazi_cases.items || []).slice().reverse();
  if (!items.length) return h + '<div class="card"><div class="empty">暂无分析案例</div></div>';
  items.forEach(function (c) {
    var a = c.analysis || {};
    h += '<div class="card"><div class="li-meta" style="justify-content:space-between"><b style="font-size:15px;color:var(--ink)">☯ ' + esc(c.name || '案例') + '</b>' +
      '<span style="font-size:12px;color:var(--ink2)">' + esc(c.date || '') + '</span></div>' +
      '<div class="li-body">生辰：' + esc(c.birth || '-') + '（' + esc(c.calendar || '公历') + '）　性别：' + esc(c.gender || '-') + '</div>';
    ['日主', '格局', '五行强弱', '喜用神', '运势解读'].forEach(function (k) {
      if (a[k]) h += '<div class="li-body"><b>' + k + '：</b>' + esc(a[k]) + '</div>';
    });
    h += '<div style="margin-top:10px"><button class="btn small danger" onclick="delItem(\'bazi_cases\',\'' + c.id + '\')">删除</button></div></div>';
  });
  return h;
}

/* ---------- 英语学习 ---------- */
function englishView() {
  var h = '<div class="tabs secondary">' + [['today', '📅 今日素材'], ['review', '🔁 复习任务'], ['stats', '📊 月度统计'], ['history', '🗂 往期回看']].map(function (t) {
    return '<button class="tab' + (studyState.engTab === t[0] ? ' active' : '') + '" onclick="studyState.engTab=\'' + t[0] + '\';render()">' + t[1] + '</button>';
  }).join('') + '</div>';
  if (studyState.engTab === 'today') return h + engToday();
  if (studyState.engTab === 'review') return h + engReview();
  if (studyState.engTab === 'stats') return h + engStats();
  return h + engHistory();
}

function findDay(coll, date) {
  return (S[coll].days || []).find(function (d) { return d.date === date; });
}

function engToday() {
  var t = today();
  var sd = findDay('english_sentences', t);
  var vd = findDay('english_vocab', t);
  var h = '';
  if (!sd && !vd) {
    h += '<div class="card"><div class="empty">今日素材尚未生成<br><br>每日 8:00 自动产出「20句口语 + 20个词汇」<br>也可在对话中发「生成今日英语学习素材」立即生成</div></div>';
    return h;
  }
  if (sd) {
    h += '<div class="card"><h3>🗣 今日口语 20 句 ' +
      (sd.checked ? '<span class="badge ok">已打卡 ' + esc(sd.checked_at || '') + '</span>'
        : '<button class="btn primary small" style="margin-left:auto" onclick="engCheck(\'' + t + '\')">✔ 完成打卡</button>') + '</h3>';
    (sd.sentences || []).forEach(function (s, i) {
      h += '<div class="sentence"><div class="en"><span class="sent-num">' + (i + 1) + '.</span>' + esc(s.en) +
        '<button class="icon-btn" title="朗读" onclick="speakEn(this,' + JSON.stringify(s.en).replace(/"/g, '&quot;') + ')">🔊</button>' +
        '<button class="icon-btn" title="跟读打分" onclick="followRead(' + JSON.stringify(s.en).replace(/"/g, '&quot;') + ')">🎙</button></div>' +
        '<div class="zh">' + esc(s.zh) + '<span class="sc">' + esc(s.scene || '') + '</span></div></div>';
    });
    h += '</div>';
  }
  if (vd) {
    h += '<div class="card"><h3>📇 今日词汇 20 个</h3>';
    (vd.words || []).forEach(function (w, i) {
      h += '<div class="sentence"><div class="en"><span class="sent-num">' + (i + 1) + '.</span>' + esc(w.word) +
        (w.pron ? ' <span class="pron">' + esc(w.pron) + '</span>' : '') +
        '<button class="icon-btn" title="朗读" onclick="speakEn(this,' + JSON.stringify(w.word).replace(/"/g, '&quot;') + ')">🔊</button></div>' +
      '<div class="zh">' + esc(w.meaning) + (w.scene ? '<span class="sc">' + esc(w.scene) + '</span>' : '') + '</div></div>';
    });
    h += '</div>';
  }
  h += '<div class="hint">💡 点 🔊 听原声（已自动挑选最自然的语音）、点 🎙 跟读录音打分（红色单词=需加强）。复习安排见「🔁 复习任务」。</div>';
  return h;
}
function engCheck(date) {
  var sd = findDay('english_sentences', date);
  if (!sd) return;
  sd.checked = true;
  var n = new Date();
  sd.checked_at = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
  save('english_sentences', function () { toast('打卡成功！'); render(); });
}
/* 挑选最自然的英语语音（优先高质量在线音，避免机械音） */
var _enVoice = null;
function pickEnVoice() {
  if (_enVoice) return _enVoice;
  try {
    var vs = speechSynthesis.getVoices().filter(function (v) { return /^en([-_]US)?/i.test(v.lang); });
    var prefer = ['Samantha', 'Ava', 'Allison', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Karen', 'Alex'];
    for (var i = 0; i < prefer.length; i++) {
      var hit = vs.find(function (v) { return v.name.indexOf(prefer[i]) >= 0; });
      if (hit) { _enVoice = hit; return hit; }
    }
    _enVoice = vs[0] || null;
  } catch (e) {}
  return _enVoice;
}
if (window.speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = function () { _enVoice = null; pickEnVoice(); };
}
function speakEn(btn, text, rate) {
  try {
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = rate || 0.85; u.pitch = 1;
    var v = pickEnVoice();
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) { toast('当前浏览器不支持语音朗读'); }
}

/* ===== 跟读录音打分 ===== */
var _srTarget = '', _srRec = null;
function followRead(text) {
  _srTarget = text;
  var html = '<h3>🎙 跟读打分</h3>' +
    '<div class="sentence" style="margin-bottom:12px"><div class="en" style="font-size:16px">' + esc(text) + '</div></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
    '<button class="btn small" onclick="speakEn(null,' + JSON.stringify(text).replace(/"/g, '&quot;') + ')">🔊 听原声</button>' +
    '<button class="btn small" onclick="speakEn(null,' + JSON.stringify(text).replace(/"/g, '&quot;') + ',0.6)">🐢 慢速听</button>' +
    '<button class="btn primary small" id="srBtn" onclick="srStart()">🎙 开始跟读</button></div>' +
    '<div id="srResult" style="min-height:60px;font-size:13px;color:var(--ink2)">点「开始跟读」后大声朗读上面的句子，读完自动识别打分。</div>' +
    '<div class="modal-actions"><button class="btn" onclick="srStop();closeModal()">关闭</button></div>';
  $('#modal').innerHTML = html;
  $('#modalMask').style.display = 'flex';
}
function srStart() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var box = $('#srResult'), btn = $('#srBtn');
  if (!SR) {
    box.innerHTML = '⚠ 当前浏览器不支持语音识别打分。<br>iPhone 请用 Safari 并在 设置→Safari→高级 中开启语音识别；也可以先用「🔊听原声→大声跟读」的方式练习。';
    return;
  }
  try {
    var r = _srRec = new SR();
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
    btn.textContent = '👂 正在听…'; btn.disabled = true;
    box.innerHTML = '请开始朗读…';
    r.onresult = function (ev) {
      var said = ev.results[0][0].transcript || '';
      box.innerHTML = srScore(_srTarget, said);
      btn.textContent = '🎙 再读一次'; btn.disabled = false;
    };
    r.onerror = function (ev) {
      box.innerHTML = '⚠ 识别失败（' + ev.error + '）。请确认已允许麦克风权限后重试。';
      btn.textContent = '🎙 开始跟读'; btn.disabled = false;
    };
    r.onend = function () { if (btn.disabled) { btn.textContent = '🎙 开始跟读'; btn.disabled = false; } };
    r.start();
  } catch (e) { box.innerHTML = '⚠ 无法启动录音：' + e.message; }
}
function srStop() { try { if (_srRec) _srRec.stop(); } catch (e) {} }
/* 词级比对打分 */
function srScore(target, said) {
  var norm = function (s) { return s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean); };
  var tw = norm(target), sw = norm(said);
  var hitCount = 0;
  var pool = sw.slice();
  var marks = tw.map(function (w) {
    var i = pool.indexOf(w);
    if (i >= 0) { pool.splice(i, 1); hitCount++; return '<span style="color:var(--accent-deep)">' + esc(w) + '</span>'; }
    return '<span style="color:var(--red);text-decoration:underline">' + esc(w) + '</span>';
  });
  var score = tw.length ? Math.round(hitCount / tw.length * 100) : 0;
  var cmt = score >= 90 ? '🎉 发音非常标准，继续保持！' :
            score >= 75 ? '👍 不错！注意红色单词的发音再练一遍。' :
            score >= 50 ? '💪 有进步空间，先慢速听再逐词模仿红色部分。' :
                          '🐢 别急，点「慢速听」逐词跟读，多练几遍就好。';
  return '<div style="font-size:26px;font-weight:700;color:' + (score >= 75 ? 'var(--accent-deep)' : 'var(--red)') + '">' + score + ' 分</div>' +
    '<div style="margin:6px 0">识别到：' + esc(said || '(未识别到语音)') + '</div>' +
    '<div style="margin:6px 0">对照（<span style="color:var(--red)">红色=没读准/漏读</span>）：' + marks.join(' ') + '</div>' +
    '<div style="margin-top:6px">' + cmt + '</div>';
}

/* 艾宾浩斯复习 */
function engReview() {
  var t = today();
  var h = '<div class="hint">🔁 按艾宾浩斯遗忘曲线，今天应复习 <b>' + EBB_OFFSETS.join('/') + ' 天前</b>学过的素材。</div>';
  var found = 0;
  EBB_OFFSETS.forEach(function (off) {
    var d = addDays(t, -off);
    var sd = findDay('english_sentences', d), vd = findDay('english_vocab', d);
    if (!sd && !vd) return;
    found++;
    h += '<div class="card"><h3>📆 ' + d + '（' + off + '天前）</h3>';
    if (vd && (vd.words || []).length) {
      h += '<div style="margin-bottom:8px">' + vd.words.map(function (w) {
        return '<span class="word-chip" title="' + esc(w.meaning) + '">' + esc(w.word) + '</span>';
      }).join('') + '<div style="font-size:11px;color:var(--ink2);margin-top:4px">长按/悬停查看释义</div></div>';
    }
    if (sd && (sd.sentences || []).length) {
      h += '<details class="comm"><summary>复习当日20句</summary>';
      sd.sentences.forEach(function (s, i) {
        h += '<div class="comm-item"><b>' + (i + 1) + '.</b> ' + esc(s.en) + '<br><span style="color:var(--ink2)">' + esc(s.zh) + '</span></div>';
      });
      h += '</details>';
    }
    h += '</div>';
  });
  if (!found) h += '<div class="card"><div class="empty">今天没有到期的复习任务 🎉</div></div>';
  h += '<div class="card"><h3>🎯 随机测验</h3><div id="quizBox"><button class="btn primary" onclick="engQuiz()">开始抽查 5 个词</button></div></div>';
  return h;
}
function engQuiz() {
  var all = [];
  (S.english_vocab.days || []).forEach(function (d) { (d.words || []).forEach(function (w) { all.push(w); }); });
  if (all.length < 3) { toast('词汇量还不够，先积累几天吧'); return; }
  var picks = [];
  var pool = all.slice();
  for (var i = 0; i < Math.min(5, pool.length); i++) {
    picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  var h = picks.map(function (w, i) {
    return '<div class="sentence"><div class="en">' + (i + 1) + '. ' + esc(w.word) + '</div>' +
      '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;color:var(--accent-deep)">看释义</summary>' +
      '<div class="zh" style="margin-top:4px">' + esc(w.meaning) + '</div></details></div>';
  }).join('');
  $('#quizBox').innerHTML = h + '<div style="margin-top:10px"><button class="btn" onclick="engQuiz()">🔄 换一批</button></div>';
}

/* 月度统计 */
function engStats() {
  var m = thisMonth();
  var days = (S.english_vocab.days || []).filter(function (d) { return d.date.slice(0, 7) === m; });
  var sdays = (S.english_sentences.days || []).filter(function (d) { return d.date.slice(0, 7) === m; });
  var newWords = days.reduce(function (s, d) { return s + (d.words || []).length; }, 0);
  var checked = sdays.filter(function (d) { return d.checked; }).length;
  var totalWords = (S.english_vocab.days || []).reduce(function (s, d) { return s + (d.words || []).length; }, 0);
  var h = '<div class="stat-grid">' +
    '<div class="stat"><div class="s-label">本月新增词汇</div><div class="s-value">' + newWords + '</div></div>' +
    '<div class="stat"><div class="s-label">本月打卡天数</div><div class="s-value" style="color:var(--accent-deep)">' + checked + '</div></div>' +
    '<div class="stat"><div class="s-label">累计词汇总量</div><div class="s-value">' + totalWords + '</div></div></div>';
  h += '<div class="card"><h3>📅 本月学习日历</h3><div>';
  sdays.sort(function (a, b) { return a.date.localeCompare(b.date); }).forEach(function (d) {
    h += '<span class="word-chip" style="' + (d.checked ? '' : 'opacity:.45') + '">' + d.date.slice(8) + '日 ' + (d.checked ? '✅' : '⏳') + '</span>';
  });
  if (!sdays.length) h += '<div class="empty">本月暂无学习记录</div>';
  h += '</div></div>';
  return h;
}

/* 往期回看 */
function engHistory() {
  var dates = (S.english_sentences.days || []).map(function (d) { return d.date; }).sort().reverse();
  if (!dates.length) return '<div class="card"><div class="empty">暂无往期记录</div></div>';
  var sel = studyState.engDate || dates[0];
  var h = '<div class="toolbar"><select onchange="studyState.engDate=this.value;render()">' + dates.map(function (d) {
    return '<option value="' + d + '"' + (d === sel ? ' selected' : '') + '>' + d + '</option>';
  }).join('') + '</select></div>';
  var sd = findDay('english_sentences', sel), vd = findDay('english_vocab', sel);
  if (sd) {
    h += '<div class="card"><h3>🗣 ' + sel + ' 口语20句 ' + (sd.checked ? '<span class="badge ok">已打卡</span>' : '<span class="badge gray">未打卡</span>') + '</h3>';
    (sd.sentences || []).forEach(function (s, i) {
      h += '<div class="sentence"><div class="en"><span class="sent-num">' + (i + 1) + '.</span>' + esc(s.en) + '</div>' +
        '<div class="zh">' + esc(s.zh) + '<span class="sc">' + esc(s.scene || '') + '</span></div></div>';
    });
    h += '</div>';
  }
  if (vd) {
    h += '<div class="card"><h3>📇 当日词汇</h3><div>' + (vd.words || []).map(function (w) {
      return '<span class="word-chip" title="' + esc(w.meaning) + '">' + esc(w.word) + '</span>';
    }).join('') + '</div></div>';
  }
  return h;
}

/* ---------- 著作阅读 ---------- */
function booksView() {
  var h = '<div class="toolbar"><span style="font-size:12px;color:var(--ink2)">共 ' + (S.books.items || []).length + ' 本书</span>' +
    '<span style="flex:1"></span><button class="btn primary small" onclick="editBook()">＋ 录入书目</button></div>';
  var items = S.books.items || [];
  if (!items.length) return h + '<div class="card"><div class="empty">暂无书目，点「＋ 录入书目」开始你的阅读计划</div></div>';
  var t = today();
  items.forEach(function (b) {
    var logs = b.logs || [];
    var read = logs.reduce(function (s, l) { return s + Number(l.pages || 0); }, 0);
    var total = Number(b.total || 0);
    var pct = total ? Math.min(100, Math.round(read / total * 100)) : 0;
    var todayLog = logs.find(function (l) { return l.date === t; });
    h += '<div class="card"><div class="li-meta" style="justify-content:space-between"><b style="font-size:15px;color:var(--ink)">📕 ' + esc(b.title) + '</b>' +
      (pct >= 100 ? '<span class="badge ok">已读完</span>' : todayLog ? '<span class="badge ok">今日已打卡</span>' : '<span class="badge warn">今日目标 ' + esc(b.daily_goal || '-') + '页</span>') + '</div>' +
      (b.author ? '<div class="li-body">作者：' + esc(b.author) + '</div>' : '') +
      '<div class="progress"><div style="width:' + pct + '%"></div></div>' +
      '<div style="font-size:12px;color:var(--ink2)">已读 ' + read + (total ? ' / ' + total : '') + ' 页 · ' + pct + '%</div>';
    if (logs.length) {
      h += '<details class="comm"><summary>阅读记录（' + logs.length + '）</summary>';
      logs.slice().reverse().forEach(function (l) {
        h += '<div class="comm-item"><b>' + esc(l.date) + '</b>　读了 ' + esc(l.pages) + ' 页' + (l.note ? '<br>💭 ' + esc(l.note) : '') + '</div>';
      });
      h += '</details>';
    }
    h += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn small primary" onclick="readCheck(\'' + b.id + '\')">📖 阅读打卡</button>' +
      '<button class="btn small" onclick="editBook(\'' + b.id + '\')">编辑</button>' +
      '<button class="btn small danger" onclick="delItem(\'books\',\'' + b.id + '\')">删除</button></div></div>';
  });
  return h;
}
function editBook(id) {
  if (!S.books) S.books = { items: [] };
  if (!S.books.items) S.books.items = [];
  var b = id ? S.books.items.find(function (x) { return x.id === id; }) : {};
  b = b || {};
  openForm(id ? '编辑书目' : '录入书目', [
    { key: 'title', label: '书名', required: true, value: b.title },
    { key: 'author', label: '作者', value: b.author },
    { key: 'total', label: '总页数', type: 'number', value: b.total },
    { key: 'daily_goal', label: '每日目标页数', type: 'number', value: b.daily_goal }
  ], function (v) {
    if (id) Object.assign(b, v);
    else { v.id = uid(); v.logs = []; v.created = today(); S.books.items.push(v); }
    save('books', function () { toast('已保存《' + v.title + '》'); render(); });
  });
}
function readCheck(id) {
  var b = S.books.items.find(function (x) { return x.id === id; });
  openForm('阅读打卡 · ' + b.title, [
    { key: 'date', label: '日期', type: 'date', value: today() },
    { key: 'pages', label: '今日阅读页数', type: 'number', required: true, value: b.daily_goal },
    { key: 'note', label: '读书心得（可空）', type: 'textarea' }
  ], function (v) {
    (b.logs = b.logs || []).push(v);
    save('books', function () { toast('打卡成功'); render(); });
  });
}

/* ---------- 随笔素材库（佳句 / 随笔 / 梦境） ---------- */
function materialView() {
  var h = '<div class="tabs secondary">' + [['quotes', '📜 好词佳句'], ['essays', '✏️ 随笔记录'], ['dreams', '🌙 梦境专区']].map(function (t) {
    return '<button class="tab' + (studyState.matTab === t[0] ? ' active' : '') + '" onclick="studyState.matTab=\'' + t[0] + '\';render()">' + t[1] + '</button>';
  }).join('') + '</div>';
  if (studyState.matTab === 'quotes') return h + quotesView();
  if (studyState.matTab === 'essays') return h + essaysView();
  return h + dreamsView();
}

function quotesView() {
  var kw = studyState.quoteKw || '';
  var h = '<div class="toolbar"><input type="text" id="quoteKw" placeholder="🔍 关键词检索" value="' + esc(kw) + '" oninput="studyState.quoteKw=this.value;renderKeepFocus(\'quoteKw\')">' +
    '<button class="btn small" onclick="pickRandomQuote()">🎲 随机复盘</button>' +
    '<button class="btn primary small" onclick="addQuote()">＋ 收录佳句</button></div>';
  if (studyState.pickQuote) {
    var q = studyState.pickQuote;
    h += '<div class="quote-pick">「' + esc(q.text) + '」' +
      (q.note ? '<div style="font-size:12px;color:var(--ink2);margin-top:8px">' + esc(q.note) + '</div>' : '') +
      '<div style="margin-top:8px"><button class="btn small" onclick="studyState.pickQuote=null;render()">收起</button></div></div>';
  }
  var items = (S.quotes.items || []).slice().reverse().filter(function (q) {
    if (!kw) return true;
    return (q.text + (q.tags || []).join(',') + (q.note || '')).toLowerCase().indexOf(kw.toLowerCase()) >= 0;
  });
  if (!items.length) return h + '<div class="card"><div class="empty">暂无收录。发「保存佳句：xxx」我会附上解读与背诵方法</div></div>';
  h += '<div class="card">';
  items.forEach(function (q) {
    h += '<div class="list-item"><div class="li-body" style="font-size:14px;color:var(--ink)">「' + esc(q.text) + '」</div>' +
      '<div class="li-meta" style="margin-top:5px">' + (q.tags || []).map(function (tg) { return '<span class="tag">' + esc(tg) + '</span>'; }).join('') +
      (q.source ? '<span>出处：' + esc(q.source) + '</span>' : '') + '<span>' + esc(q.added || '') + '</span></div>' +
      (q.note ? '<details class="comm"><summary>解读与背诵方法</summary><div class="comm-item">' + esc(q.note).replace(/\n/g, '<br>') + '</div></details>' : '') +
      '<div style="margin-top:6px"><button class="icon-btn" onclick="delItem(\'quotes\',\'' + q.id + '\')">✕ 删除</button></div></div>';
  });
  return h + '</div>';
}
function addQuote() {
  openForm('收录佳句', [
    { key: 'text', label: '句子', type: 'textarea', required: true },
    { key: 'tags', label: '标签（逗号分隔）' },
    { key: 'source', label: '出处' },
    { key: 'note', label: '解读/背诵方法（可空，也可交给AI补充）', type: 'textarea' }
  ], function (v) {
    S.quotes.items.push({ id: uid(), text: v.text, tags: v.tags ? v.tags.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean) : [], source: v.source, note: v.note, added: today() });
    save('quotes', function () { toast('已收录'); render(); });
  });
}
function pickRandomQuote() {
  var arr = S.quotes.items || [];
  if (!arr.length) { toast('素材库还是空的'); return; }
  studyState.pickQuote = arr[Math.floor(Math.random() * arr.length)];
  render();
}

function essaysView() {
  var kw = studyState.essayKw || '';
  var h = '<div class="toolbar"><input type="text" id="essayKw" placeholder="🔍 关键词检索" value="' + esc(kw) + '" oninput="studyState.essayKw=this.value;renderKeepFocus(\'essayKw\')">' +
    '<button class="btn primary small" onclick="editEssay()">＋ 写随笔</button></div>';
  var items = (S.essays.items || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); })
    .filter(function (e) {
      if (!kw) return true;
      return ((e.title || '') + e.content).toLowerCase().indexOf(kw.toLowerCase()) >= 0;
    });
  if (!items.length) return h + '<div class="card"><div class="empty">暂无随笔，随时发「新增随笔：xxx」记录感悟</div></div>';
  h += '<div class="card">';
  items.forEach(function (e) {
    h += '<div class="list-item"><div class="li-title">' + esc(e.title || '随笔') + '　<span style="font-weight:400;font-size:12px;color:var(--ink2)">' + esc(e.date) + '</span></div>' +
      '<div class="li-body">' + esc(e.content).replace(/\n/g, '<br>') + '</div>' +
      '<div style="margin-top:6px"><button class="icon-btn" onclick="editEssay(\'' + e.id + '\')">✎ 编辑</button>' +
      '<button class="icon-btn" onclick="delItem(\'essays\',\'' + e.id + '\')">✕ 删除</button></div></div>';
  });
  return h + '</div>';
}
function editEssay(id) {
  var e = id ? S.essays.items.find(function (x) { return x.id === id; }) : {};
  openForm(id ? '编辑随笔' : '写随笔', [
    { key: 'title', label: '标题（可空）', value: e.title },
    { key: 'content', label: '内容', type: 'textarea', required: true, value: e.content },
    { key: 'date', label: '日期', type: 'date', value: e.date || today() }
  ], function (v) {
    if (id) { Object.assign(e, v); e.updated = today(); }
    else { v.id = uid(); S.essays.items.push(v); }
    save('essays', function () { toast('已保存'); render(); });
  });
}

function dreamsView() {
  var h = '<div class="toolbar"><span style="font-size:12px;color:var(--ink2)">🌙 共 ' + (S.dreams.items || []).length + ' 条梦境 · 想解析可在对话里发「帮我解析这个梦」</span>' +
    '<span style="flex:1"></span><button class="btn primary small" onclick="editDream()">＋ 记录梦境</button></div>';
  var items = (S.dreams.items || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  if (!items.length) return h + '<div class="card"><div class="empty">暂无梦境记录</div></div>';
  h += '<div class="card">';
  items.forEach(function (d) {
    h += '<div class="list-item"><div class="li-title">🌙 ' + esc(d.date) + '</div>' +
      '<div class="li-body">' + esc(d.content).replace(/\n/g, '<br>') + '</div>' +
      (d.feeling ? '<div class="li-body" style="color:var(--accent-deep)">💭 醒后感受：' + esc(d.feeling) + '</div>' : '') +
      (d.analysis ? '<details class="comm"><summary>梦境解析</summary><div class="comm-item">' + esc(d.analysis).replace(/\n/g, '<br>') + '</div></details>' : '') +
      '<div style="margin-top:6px"><button class="icon-btn" onclick="delItem(\'dreams\',\'' + d.id + '\')">✕ 删除</button></div></div>';
  });
  return h + '</div>';
}
function editDream() {
  openForm('记录梦境', [
    { key: 'date', label: '做梦日期', type: 'date', value: today() },
    { key: 'content', label: '梦境内容', type: 'textarea', required: true },
    { key: 'feeling', label: '醒后感受', value: '' }
  ], function (v) {
    v.id = uid();
    S.dreams.items.push(v);
    save('dreams', function () { toast('已记录'); render(); });
  });
}
