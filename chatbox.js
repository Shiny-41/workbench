/* ===== 常驻对话指令框：本地即时解析 ===== */
(function () {
  var input = $('#cmdInput');

  function num(str) {
    var m = String(str).match(/(\d+(\.\d+)?)/);
    return m ? Number(m[1]) : null;
  }
  function extractTime(str) {
    var m = String(str).match(/(\d{1,2})[:：点.](\d{0,2})/);
    if (!m) return null;
    return String(m[1]).padStart(2, '0') + ':' + String(m[2] || '00').padStart(2, '0');
  }

  /* 支出分类猜测 */
  function guessCat(text, type) {
    var map = type === '收入'
      ? [['BJD销售', /bjd|娃|人偶|妆面|订单尾款/i], ['眼镜订单', /眼镜|镜片|光学/], ['工资', /工资|薪/], ['理财', /理财|利息|基金|股/]]
      : [['餐饮', /餐|饭|吃|奶茶|咖啡|外卖|零食/], ['交通', /交通|打车|地铁|公交|油|停车/], ['进货成本', /进货|采购|原料|素体|镜片成本/], ['物流快递', /快递|物流|运费/], ['推广费用', /推广|投放|广告|达人/], ['购物', /购物|买|淘宝|京东/], ['居住', /房租|水电|物业/], ['娱乐', /娱乐|电影|游戏/], ['医疗', /医|药/], ['学习', /书|课程|学习/]];
    for (var i = 0; i < map.length; i++) if (map[i][1].test(text)) return map[i][0];
    return type === '收入' ? '其他收入' : '其他支出';
  }

  function handle(raw) {
    var s = raw.trim();
    if (!s) return;

    /* -- 导航/查看类 -- */
    if (/^(查看)?今日待办/.test(s)) { todoState.tab = 'today'; go('todo'); return ok('已打开今日待办'); }
    if (/月度待办|待办汇总/.test(s)) { todoState.tab = 'month'; go('todo'); return ok('已打开月度待办汇总'); }
    if (/记账报表|月度账单|本月账单/.test(s)) { ledState.tab = 'cat'; go('ledger'); return ok('已打开本月记账报表'); }
    if (/生活打卡汇总|生活汇总/.test(s)) { lifeState.tab = 'summary'; go('life'); return ok('已打开本月生活汇总'); }
    if (/^帮助|^\?|^？/.test(s)) return showHelp();

    /* -- 新增待办 -- */
    var m = s.match(/^新增待办[:：]?\s*(.+)/);
    if (m) {
      var body = m[1];
      var cat = /生活/.test(body.match(/分类[【\[]?([^】\]]+)/) ? body.match(/分类[【\[]?([^】\]]+)/)[1] : '') ? '生活待办' : (/分类/.test(body) ? '工作待办' : null);
      var text = body.replace(/[,，]?\s*分类[【\[]?(工作待办|生活待办|工作|生活)[】\]]?/, '').replace(/[【】\[\]]/g, '').trim();
      if (!cat) cat = /睡|吃|买菜|家|健身|球|冥想|医院|洗/.test(text) ? '生活待办' : '工作待办';
      var maxOrder = Math.max.apply(null, [0].concat((S.todos.items || []).map(function (x) { return x.order || 0; })));
      S.todos.items.push({ id: uid(), text: text, category: cat, tag: '', date: today(), done: false, order: maxOrder + 1 });
      save('todos', function () { go('todo'); ok('已添加待办（' + cat + '）：' + text); });
      return;
    }

    /* -- 记账 -- */
    m = s.match(/^(记账录入|记账|收入|支出|花了|收到)[:：]?\s*(.*)/);
    if (m) {
      var rest = (m[1] === '记账' || m[1] === '记账录入') ? m[2] : s;
      var type = /收入|收到|进账|赚/.test(rest) || /^收入|^收到/.test(s) ? '收入' : '支出';
      var amount = num(rest);
      if (amount == null) { addLedger({}); return; }
      /* 台账匹配：命中已有台账名则记入该台账，否则默认日常台账 */
      var book = null;
      ledgerBooks().forEach(function (b) { if (!book && rest.indexOf(b) >= 0) book = b; });
      var note = rest.replace(/(收入|支出|花了|收到|台账选择|台账)/g, '').replace(/[【】\[\]]/g, '')
        .replace(/(\d+(\.\d+)?)\s*元?/, '').replace(/[,，。]/g, ' ').trim();
      if (book) note = note.replace(book, '').trim();
      if (!book) book = '日常台账';
      var cat = guessCat(rest, type);
      S.ledger.items.push({ id: uid(), type: type, amount: amount, category: cat, book: book, date: today(), note: note });
      save('ledger', function () { go('ledger'); ok('已入账：' + book + ' · ' + type + ' ' + fmtMoney(amount) + '（' + cat + '）'); });
      return;
    }

    /* -- 录入书目 / 阅读打卡 -- */
    m = s.match(/^(录入书目|新增书目|添加书目|加书)[:：]?\s*(.*)/);
    if (m) {
      studyState.tab = 'books'; go('study');
      if (m[2].trim()) {
        if (!S.books) S.books = { items: [] };
        if (!S.books.items) S.books.items = [];
        S.books.items.push({ id: uid(), title: m[2].trim(), author: '', total: '', daily_goal: '', logs: [], created: today() });
        save('books', function () { render(); ok('已录入书目《' + m[2].trim() + '》，可点「编辑」补充页数'); });
      } else { editBook(); }
      return;
    }
    m = s.match(/^阅读打卡[:：]?\s*(.*)/);
    if (m) {
      studyState.tab = 'books'; go('study');
      var bks = (S.books.items || []);
      if (!bks.length) return ok('还没有书目，先发「录入书目：书名」');
      var bk = bks.find(function (b) { return m[1] && m[1].indexOf(b.title) >= 0; }) || bks[bks.length - 1];
      var pg = num(m[1]);
      if (pg != null) {
        (bk.logs = bk.logs || []).push({ date: today(), pages: pg, note: '' });
        save('books', function () { render(); ok('《' + bk.title + '》打卡成功，读了 ' + pg + ' 页'); });
      } else { readCheck(bk.id); }
      return;
    }

    /* -- 保存佳句 -- */
    m = s.match(/^保存佳句[:：]?\s*(.+)/);
    if (m) {
      var txt = m[1].replace(/^[「『"']|[」』"']$/g, '').trim();
      S.quotes.items.push({ id: uid(), text: txt, tags: [], source: '', note: '', added: today() });
      save('quotes', function () {
        studyState.tab = 'material'; studyState.matTab = 'quotes'; go('study');
        ok('佳句已收录。想要解读与背诵方法，可以在AI对话里发给我～');
      });
      return;
    }

    /* -- 新增随笔 -- */
    m = s.match(/^(新增随笔|随笔)[:：]?\s*(.+)/);
    if (m) {
      S.essays.items.push({ id: uid(), title: '', content: m[2].trim(), date: today() });
      save('essays', function () { studyState.tab = 'material'; studyState.matTab = 'essays'; go('study'); ok('随笔已归档'); });
      return;
    }

    /* -- 记录梦境 -- */
    m = s.match(/^(记录梦境|梦境)[:：]?\s*(.+)/);
    if (m) {
      var parts = m[2].split(/感受[:：]/);
      S.dreams.items.push({ id: uid(), date: today(), content: parts[0].trim(), feeling: (parts[1] || '').trim() });
      save('dreams', function () { studyState.tab = 'material'; studyState.matTab = 'dreams'; go('study'); ok('梦境已存档 🌙 想解析可在AI对话里发我'); });
      return;
    }

    /* -- 睡眠记录 -- */
    if (/^(睡眠记录|记录睡眠|睡眠)/.test(s)) {
      var mm = s.match(/入睡[:：]?\s*([\d:：点.]+)[,，]?\s*(起床|醒来)[:：]?\s*([\d:：点.]+)/);
      if (mm) {
        var st = extractTime(mm[1]), wt = extractTime(mm[3]);
        if (st && wt) {
          var dur = calcSleepMinutes(st, wt);
          S.sleep.items.push({ id: uid(), date: today(), sleep_time: st, wake_time: wt, duration: dur });
          save('sleep', function () { lifeState.tab = 'sleep'; go('life'); ok('已记录，睡了 ' + fmtDur(dur)); });
          return;
        }
      }
      addSleep(); return;
    }

    /* -- 冥想打卡 -- */
    if (/^冥想/.test(s)) {
      var dur2 = num(s);
      var feel = (s.split(/感受[:：]/)[1] || '').trim();
      if (dur2 != null) {
        S.meditation.items.push({ id: uid(), date: today(), duration: dur2, feeling: feel });
        save('meditation', function () { lifeState.tab = 'meditation'; go('life'); ok('冥想打卡成功 🧘 ' + dur2 + '分钟'); });
        return;
      }
      addMed(); return;
    }

    /* -- 篮球打卡 -- */
    if (/^篮球/.test(s)) {
      var dur3 = num(s);
      S.basketball.items.push({ id: uid(), date: today(), duration: dur3 || '', note: '' });
      save('basketball', function () { lifeState.tab = 'basketball'; go('life'); ok('篮球打卡成功 🏀'); });
      return;
    }

    /* -- 经期 -- */
    if (/^登记经期|^经期/.test(s)) {
      var feel2 = (s.split(/感受[:：]/)[1] || '').trim();
      if (/结束/.test(s)) {
        var ongoing = (S.menstrual.items || []).find(function (x) { return x.start && !x.end; });
        if (!ongoing) return ok('没有进行中的经期记录哦');
        ongoing.end = today();
        if (feel2) ongoing.feeling = ((ongoing.feeling || '') + ' ' + feel2).trim();
        save('menstrual', function () { lifeState.tab = 'menstrual'; go('life'); ok('已登记经期结束'); });
      } else {
        S.menstrual.items.push({ id: uid(), start: today(), end: '', feeling: feel2, symptoms: '' });
        save('menstrual', function () { lifeState.tab = 'menstrual'; go('life'); ok('已登记经期开始，注意休息 🌸'); });
      }
      return;
    }
    if (/预测.*经期|经期.*预测/.test(s)) {
      lifeState.tab = 'menstrual'; go('life');
      setTimeout(function () { lifeShowPrediction('bodyAnalysis'); }, 100);
      return ok('已生成预测与身体分析');
    }

    /* -- 需要AI的指令 -- */
    if (/英语|八字|分析|解析|资讯|生成/.test(s)) {
      return ok('这条需要AI帮忙～请把这句话直接发到 WorkBuddy 对话窗口，我处理后数据会自动同步到这里', 4000);
    }
    ok('没听懂这条指令 😅 点右侧「?」看指令清单，或发到AI对话窗口', 3500);
  }

  function ok(msg, dur) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('show'); }, dur || 2200);
  }

  function showHelp() {
    $('#modal').innerHTML = '<h3>💬 指令清单（输入框直接发）</h3><div class="li-body" style="line-height:2">' +
      ['查看今日待办', '新增待办【内容】分类【工作待办/生活待办】', '记账：支出45 午餐（默认日常台账，写台账名可指定）', '录入书目：认知觉醒', '阅读打卡：30页',
        '保存佳句：【文本】', '新增随笔：【内容】', '记录梦境：【内容】，感受：xxx', '睡眠记录：入睡23:30，起床7:00',
        '冥想打卡，时长30分钟，感受：平静', '篮球打卡', '登记经期开始 / 登记经期结束，感受：xxx', '预测下次经期',
        '月度待办汇总', '查看本月记账报表', '查看本月生活打卡汇总'].map(function (x) { return '· ' + esc(x); }).join('<br>') +
      '</div><div class="hint" style="margin-top:10px">复杂任务（八字分析、生成英语素材、BJD资讯、解梦、月报解读）发到 WorkBuddy AI对话窗口，数据会自动同步到本页。</div>' +
      '<div class="modal-actions"><button class="btn primary" onclick="closeModal()">知道了</button></div>';
    $('#modalMask').style.display = 'flex';
  }

  $('#cmdSend').addEventListener('click', function () { handle(input.value); input.value = ''; });
  $('#cmdHelp').addEventListener('click', showHelp);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { handle(input.value); input.value = ''; input.blur(); }
  });

  /* ===== iOS 键盘适配 ===== */
  var bar = document.querySelector('.chatbar');

  /* 点整条输入栏任意位置都触发聚焦（iOS 上点击命中偶发失效的兜底） */
  bar.addEventListener('touchend', function (e) {
    if (e.target === bar) { e.preventDefault(); input.focus(); }
  });

  /* 键盘弹出时把输入栏顶到键盘上方（iOS 不会自动推 fixed 元素） */
  if (window.visualViewport) {
    var vv = window.visualViewport;
    function onVV() {
      var kb = window.innerHeight - vv.height - vv.offsetTop;   // 键盘占高
      if (kb > 60 && document.activeElement === input) {
        bar.classList.add('kb-open');
        bar.style.transform = 'translateY(-' + kb + 'px)';
      } else {
        bar.classList.remove('kb-open');
        bar.style.transform = '';
      }
    }
    vv.addEventListener('resize', onVV);
    vv.addEventListener('scroll', onVV);
    input.addEventListener('blur', function () {
      setTimeout(function () { bar.classList.remove('kb-open'); bar.style.transform = ''; }, 80);
    });
  }
})();
