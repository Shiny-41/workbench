/* ===== GitHub 数据层：纯前端 + 数据存 GitHub 私有仓库 =====
   取代原 server.py 后端。所有数据读写都通过 GitHub Contents API 完成，
   因此页面可部署到任意静态托管（GitHub Pages / Vercel / Netlify …），
   数据自动在多设备间同步，且不在任何一台电脑上长期留存。
*/
var GH = (function () {
  var COLLECTIONS = [
    "todos", "bjd_projects", "bjd_news", "glasses_clients", "glasses_news",
    "bazi_cases", "english_sentences", "books", "quotes", "ledger",
    "essays", "dreams", "sleep", "meditation", "basketball", "menstrual",
    "suppliers", "influencers", "english_vocab", "prospects", "ai_chats"
  ];
  var CFG_KEY = "gh_cfg";
  var cfg = null;
  var shaMap = {};     // 每个集合文件当前的 git blob sha（用于乐观并发更新）
  var etagMap = {};    // 每个集合文件当前 ETag（用于条件刷新，省额度）

  function loadCfg() {
    try { cfg = JSON.parse(localStorage.getItem(CFG_KEY) || "null"); } catch (e) { cfg = null; }
    return cfg;
  }
  function saveCfg(c) { cfg = c; localStorage.setItem(CFG_KEY, JSON.stringify(c)); }
  function clearCfg() { cfg = null; localStorage.removeItem(CFG_KEY); shaMap = {}; etagMap = {}; }
  function needCfg() { return !cfg || !cfg.token || !cfg.owner || !cfg.repo; }
  function config() { return cfg; }

  function api(path, opts) {
    opts = opts || {};
    var h = {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (cfg && cfg.token) h["Authorization"] = "Bearer " + cfg.token;
    if (opts.headers) Object.assign(h, opts.headers);
    return fetch("https://api.github.com" + path, {
      method: opts.method || "GET",
      headers: h,
      body: opts.body
    });
  }

  function dataApiPath(name) {
    return "/repos/" + cfg.owner + "/" + cfg.repo + "/contents/data/" + name + ".json?ref=" + (cfg.branch || "main");
  }

  function b64decode(s) {
    try { return decodeURIComponent(escape(atob(s.replace(/\s/g, "")))); } catch (e) { return ""; }
  }
  function b64encode(s) {
    return btoa(unescape(encodeURIComponent(s)));
  }
  function defaultFor() { return { items: [] }; }

  /* 零配置本地模式：未配置 GitHub 时，数据存浏览器 localStorage（工作电脑不留文件） */
  function loadLocalAll(cb) {
    var pending = COLLECTIONS.length;
    function finish() { S._ai_ready = false; cb && cb(true); }
    COLLECTIONS.forEach(function (name) {
      var raw = localStorage.getItem("wb_" + name);
      if (raw) {
        try { S[name] = JSON.parse(raw); } catch (e) { S[name] = defaultFor(); }
        if (--pending === 0) finish();
        return;
      }
      // 首次打开：尝试从站点同目录 data/<name>.json 一次性恢复（作为云端备份种子）
      fetch("data/" + name + ".json")
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j) { S[name] = j; try { localStorage.setItem("wb_" + name, JSON.stringify(j)); } catch (e) {} }
          else { S[name] = defaultFor(); }
        })
        .catch(function () { S[name] = defaultFor(); })
        .finally(function () { if (--pending === 0) finish(); });
    });
  }
  function saveLocal(name, cb) {
    try { localStorage.setItem("wb_" + name, JSON.stringify(S[name], null, 2)); cb && cb(true); }
    catch (e) { toast("本地保存失败：浏览器存储空间不足"); cb && cb(false); }
  }
  function mode() { return cfg ? "github" : "local"; }

  /* 全量加载（首次无 etag 即全量；之后带 etag 条件刷新，未变文件跳过） */
  async function loadAll(cb) {
    if (needCfg()) { return loadLocalAll(cb); }
    var authFail = false;
    await Promise.all(COLLECTIONS.map(async function (name) {
      try {
        var headers = {};
        if (etagMap[name]) headers["If-None-Match"] = etagMap[name];
        var r = await api(dataApiPath(name), { headers: headers });
        if (r.status === 304) return;                 // 未变化，保留内存中的 S[name]
        if (r.status === 200) {
          var j = await r.json();
          try { S[name] = JSON.parse(b64decode(j.content)); }
          catch (e) { S[name] = defaultFor(); }
          shaMap[name] = j.sha;
          etagMap[name] = r.headers.get("ETag");
          return;
        }
        if (r.status === 404) { S[name] = defaultFor(); return; }
        if (r.status === 401 || r.status === 403) { authFail = true; return; }
        // 其它异常：保留原值
      } catch (e) { /* 网络错误 */ }
    }));
    S._ai_ready = false;   // 静态版无后端 AI 代理，永远走半自动模式
    cb && cb(!authFail, authFail ? "auth" : null);
  }

  /* 保存单个集合（带冲突重试） */
  async function save(name, cb, _attempt) {
    _attempt = _attempt || 0;
    if (needCfg()) { return saveLocal(name, cb); }
    var content = b64encode(JSON.stringify(S[name], null, 2));
    var body = {
      message: "工作台更新 " + name + " · " + new Date().toISOString().slice(0, 19).replace("T", " "),
      content: content,
      branch: cfg.branch || "main"
    };
    if (shaMap[name]) body.sha = shaMap[name];
    try {
      var r = await api("/repos/" + cfg.owner + "/" + cfg.repo + "/contents/data/" + name + ".json", {
        method: "PUT",
        body: JSON.stringify(body)
      });
      if (r.status === 200 || r.status === 201) {
        var j = await r.json();
        shaMap[name] = j.content.sha;
        etagMap[name] = r.headers.get("ETag");
        cb && cb(true);
        return;
      }
      if (r.status === 409 || r.status === 404) {
        // 冲突或文件不存在：重新取 sha（或清除）后重试一次
        if (_attempt < 1) {
          try {
            var cur = await api(dataApiPath(name));
            if (cur.status === 200) { var cj = await cur.json(); shaMap[name] = cj.sha; }
            else { delete shaMap[name]; }
          } catch (e) {}
          return save(name, cb, _attempt + 1);
        }
      }
      var txt = await r.text().catch(function () { return ""; });
      console.error("GH save failed", r.status, txt);
      toast("保存失败（" + r.status + "），请检查 Token 或网络");
      cb && cb(false);
    } catch (e) {
      toast("保存失败：网络异常");
      cb && cb(false);
    }
  }

  /* 图片：本地压缩为 data URL，直接内联进 JSON（私有仓库无需额外图床） */
  function upload(file) {
    return resizeImage(file, 1280);
  }
  function resizeImage(file, maxDim) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf("image/") !== 0) { reject("not image"); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.width, h = img.height;
          var scale = Math.min(1, maxDim / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement("canvas");
          canvas.width = cw; canvas.height = ch;
          canvas.getContext("2d").drawImage(img, 0, 0, cw, ch);
          URL.revokeObjectURL(url);
          // 透明 PNG 保留，照片用 JPEG 压缩
          var isPng = (file.type === "image/png");
          resolve(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.85));
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject("decode error"); };
      img.src = url;
    });
  }

  /* 连接测试：检查 token 是否可访问该数据仓库 */
  async function test(c) {
    var save = cfg; cfg = c;
    try {
      var r = await api("/repos/" + c.owner + "/" + c.repo);
      var privateRepo = false;
      if (r.status === 200) {
        try { privateRepo = !!(await r.json()).private; } catch (e) {}
        cfg = save; return { ok: true, private: privateRepo };
      }
      cfg = save;
      return { ok: false, status: r.status };
    } catch (e) { cfg = save; return { ok: false, status: 0 }; }
  }

  return {
    COLLECTIONS: COLLECTIONS,
    loadCfg: loadCfg, saveCfg: saveCfg, clearCfg: clearCfg,
    needCfg: needCfg, config: config, mode: mode,
    loadAll: loadAll, save: save, upload: upload, test: test
  };
})();
