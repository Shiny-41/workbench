/* ===== AI 对话组件：国学导师(guoxue) / 成长教练(coach) 各自完全独立 ===== */
var aiBusy = {};

function aiChatHTML(role, title, subtitle) {
  var msgs = (S.ai_chats && S.ai_chats[role]) || [];
  var h = '<div class="card ai-chat" id="aiChat-' + role + '">' +
    '<h3>' + title + (S._ai_ready ? '' : ' <span class="badge">半自动</span>') + '</h3>' +
    (subtitle ? '<div style="font-size:12px;color:var(--ink2);margin-bottom:8px">' + subtitle + '</div>' : '');
  h += '<div class="ai-msgs" id="aiMsgs-' + role + '">';
  if (!msgs.length && !aiBusy[role]) h += '<div class="empty">还没有对话，说点什么吧</div>';
  msgs.slice(-60).forEach(function (m) {
    h += '<div class="ai-msg ' + (m.role === 'user' ? 'me' : 'bot') + '">' + esc(m.content).replace(/\n/g, '<br>') + '</div>';
  });
  if (aiBusy[role]) h += '<div class="ai-msg bot typing">正在思考…</div>';
  else if (!S._ai_ready && msgs.length && msgs[msgs.length - 1].role === 'user')
    h += '<div class="ai-msg bot typing">⏳ 消息已收到，助手会在1小时内回复（页面会自动刷新）</div>';
  h += '</div>';
  h += '<div class="ai-input"><textarea id="aiIn-' + role + '" rows="1" placeholder="输入消息，Enter发送…" ' +
    'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();aiSend(\'' + role + '\')}"></textarea>' +
    '<button class="btn primary small" onclick="aiSend(\'' + role + '\')">发送</button>' +
    (msgs.length ? '<button class="btn small" onclick="aiClear(\'' + role + '\')">清空</button>' : '') + '</div>';
  if (!S._ai_ready) h += '<div class="hint" style="margin-top:8px">💬 半自动模式：消息先存档到你的 GitHub 数据仓库，助手每小时集中回复一次；页面会自动刷新同步。急的话直接在 WorkBuddy 里说「处理AI对话」立即回复。</div>';
  return h + '</div>';
}

function aiScroll(role) {
  var b = $('#aiMsgs-' + role);
  if (b) b.scrollTop = b.scrollHeight;
}

/* 给AI补充用户当前数据背景 */
function aiContext(role) {
  try {
    if (role === 'guoxue') {
      var cs = ((S.bazi_cases || {}).items || []).slice(-3).map(function (c) {
        var a = c.analysis || {};
        return (c.name || '') + ' ' + (c.birth || '') + ' 日主:' + (a['日主'] || '-') + ' 格局:' + (a['格局'] || '-') + ' 喜用神:' + (a['喜用神'] || '-');
      });
      return cs.length ? '用户已有八字案例存档：' + cs.join('；') : '';
    }
    var t = today(), m = thisMonth();
    var todos = ((S.todos || {}).items || []).filter(function (x) { return x.date === t; });
    var done = todos.filter(function (x) { return x.done; }).length;
    var slp = ((S.sleep || {}).items || []).slice(-7).map(function (x) {
      return x.date.slice(5) + '睡' + (Math.round((x.duration || 0) / 6) / 10) + 'h';
    }).join(',');
    var med = ((S.meditation || {}).items || []).filter(function (x) { return (x.date || '').slice(0, 7) === m; }).length;
    var ball = ((S.basketball || {}).items || []).filter(function (x) { return (x.date || '').slice(0, 7) === m; }).length;
    return '今日待办' + todos.length + '项已完成' + done + '项；近7天睡眠：' + (slp || '暂无') + '；本月冥想' + med + '次、篮球' + ball + '次。';
  } catch (e) { return ''; }
}

function aiSend(role) {
  var el = $('#aiIn-' + role);
  var text = el ? el.value.trim() : '';
  if (!text || aiBusy[role]) return;
  S.ai_chats = S.ai_chats || {};
  var arr = S.ai_chats[role] = S.ai_chats[role] || [];
  arr.push({ role: 'user', content: text, time: today() });

  /* 半自动模式：未配置密钥时只存档，等助手定时回复 */
  if (!S._ai_ready) {
    save('ai_chats', function () { render(); aiScroll(role); toast('已发送，助手稍后回复'); });
    return;
  }

  aiBusy[role] = true;
  save('ai_chats', function () { render(); aiScroll(role); });
  fetch('/api/ai', {
    method: 'POST',
    body: JSON.stringify({ role: role, messages: arr.slice(-20), context: aiContext(role) })
  }).then(function (r) { return r.json(); }).then(function (res) {
    aiBusy[role] = false;
    arr.push({ role: 'assistant', content: res.ok ? res.reply : ('⚠ ' + (res.msg || res.err || '调用失败')), time: today() });
    save('ai_chats', function () { render(); aiScroll(role); });
  }).catch(function () {
    aiBusy[role] = false;
    arr.push({ role: 'assistant', content: '⚠ 网络错误，请稍后重试', time: today() });
    save('ai_chats', function () { render(); aiScroll(role); });
  });
}

function aiClear(role) {
  armBtn(evtBtn(), function () {
    S.ai_chats[role] = [];
    save('ai_chats', render);
  }, '将清空整段对话，再点一次确认');
}
