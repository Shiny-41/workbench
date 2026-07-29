/* ===== 启动 ===== */
document.querySelectorAll('.nav-item').forEach(function (n) {
  n.addEventListener('click', function () { go(n.dataset.view); });
});

/* 顶栏日期 */
(function () {
  var d = new Date();
  var wk = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  var el = $('#tbDate');
  if (el) el.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + wk;
})();

/* 齿轮：打开 GitHub 设置（修改 Token / 数据仓库） */
$('#tbGear').addEventListener('click', function () { showSetup(); });

loadAll(function () { render(); });

/* 每60秒静默刷新数据（ETag 条件刷新，未变文件不重复拉取） */
setInterval(function () {
  if ($('#modalMask').style.display !== 'none') return;
  if (document.activeElement && document.activeElement.id === 'cmdInput' && document.activeElement.value) return;
  loadAll(function () { render(); });
}, 60000);
