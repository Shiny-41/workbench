# 41的工作台（纯前端 · 数据存 GitHub）

个人一体化工作台：**BJD 业务 + 眼镜业务 + 多台账记账 + 学习（国学/英语/阅读）+ 生活打卡**。
前端纯静态，数据自动同步到你自己的 **GitHub 私有仓库**，可部署到 GitHub Pages / Vercel / Netlify 等任意静态托管，多设备实时共享、不在任何电脑上长期留存。

## 原理
- 网页本身（HTML/JS/CSS）放在一个**公开**仓库，由 GitHub Pages 托管，得到永久稳定的网址。
- 所有业务数据（21 个 JSON 集合）放在另一个**私有**仓库，通过 GitHub API 读写；你浏览器里的 Token 仅存本机，不上传。
- 图片自动压缩为内联 data URL，无需额外图床。

## 一、一次性准备（在 github.com 网页上操作）
1. 新建一个**私有**仓库，建议名 `workbench-data`（数据仓库，存你的业务数据）。
2. 生成 Token：右上角头像 → Settings → Developer settings → Personal access tokens → Tokens (fine-grained 或 classic)。
   - classic 勾 `repo` 权限；fine-grained 选 `workbench-data` 仓库并勾 `Contents: Read and Write`。
   - 复制保存好，页面关闭后看不到第二次。
3. 新建一个**公开**仓库，建议名 `workbench`（放本项目的网页代码）。
4. 在该公开仓库：Settings → Pages → Source 选 `Deploy from a branch` → Branch 选 `main` / `(root)` → Save。
   - 几分钟后得到网址：`https://<你的用户名>.github.io/workbench/`

## 二、把代码推上去（在本机命令行）
```bash
git init
git add .
git commit -m "41工作台 静态版"
git branch -M main
git remote add origin https://github.com/<你的用户名>/workbench.git
git push -u origin main
```
> 推送时用户名填 GitHub 用户名，密码处填上面的 Token（不是账号密码）。

## 三、迁移旧数据（可选，仅首次）
如果你本地 `data/` 里已有数据想带过去：
1. 复制一份配置并填好（**含 Token，不会被 git 提交**）：
   ```json
   { "owner": "你的用户名", "repo": "workbench-data", "branch": "main", "token": "github_pat_xxx" }
   ```
   保存为 `migrate_config.json`。
2. 运行：`python push_data.py`，会把本地数据推送到私有仓库。

## 四、首次打开
用手机/电脑打开 Pages 网址 → 点右上角 ⚙️ → 填入：
- GitHub 用户名、数据仓库名（如 `workbench-data`）、分支（`main`）、Token。
- 保存并连接 → 数据加载完成，之后多设备用同一 Token 自动同步。

## 五、关于 AI 对话（半自动）
消息会先存档到你的数据仓库；国学导师（赛博神算子）/ 成长教练的回复由定时任务写入。
把数据迁到 GitHub 后，需要把原有的「AI 回复」自动化改写到 GitHub 数据仓库（联系 WorkBuddy 处理）。

## 目录
```
index.html  style.css  core.js  gh.js  ai_chat.js
view_work.js  view_ledger.js  view_todo.js  view_study.js  view_life.js
chatbox.js  boot.js  manifest.json  icon.png  apple-touch-icon.png
push_data.py        # 一次性迁移脚本（本地运行）
migrate_config.json # 迁移配置（含 Token，已被 .gitignore 忽略）
```
