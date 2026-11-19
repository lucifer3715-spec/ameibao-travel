# 🦭 阿咩豹的旅行手账 · 自有服务器部署指南

本项目采用**零第三方依赖**设计，不需要 `npm install` 一堆复杂包，也不用连接外部云服务，所有照片与文字都稳稳保存在你自己的服务器硬盘上。默认端口设为 `8799`（如果你服务器上同时跑了 `8788` 端口的阿咩豹菜谱，两个网站可以完美并存互不冲突）。

---

## 方式一：Node.js 直接部署（最轻量推荐）

### 1. 上传文件夹到服务器
把电脑上的 `ameibao-travel` 整个文件夹上传到服务器（例如 `/opt/ameibao-travel`）：

- **宝塔 / 1Panel 面板**：打开文件管理，进入 `/opt`，把 `ameibao-travel` 压缩成 zip 上传并解压。
- **PowerShell 命令行上传**：
  ```powershell
  scp -r "C:\Users\lucif\Documents\ChatGPT\New project\ameibao-travel" root@你的服务器IP:/opt/
  ```

### 2. 设置你们两个人的专属暗号
SSH 登录服务器后执行：
```bash
cd /opt/ameibao-travel
cp .env.example .env
nano .env
```
修改 `.env` 中的密码：
```ini
TRAVEL_PASSWORD=改成你们两个人的专属暗号
HOST=0.0.0.0
PORT=8799
DATA_DIR=./travel-data
```

### 3. 配置后台开机自启（systemd）
确保服务器装有 Node.js 18+（运行 `node -v` 检查），然后执行下面整段命令：

```bash
sudo tee /etc/systemd/system/ameibao-travel.service > /dev/null <<'EOF'
[Unit]
Description=Ameibao Couple Travel Journal
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/ameibao-travel
ExecStart=/usr/bin/node /opt/ameibao-travel/server.mjs
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ameibao-travel
sudo systemctl status ameibao-travel
```
> 如果 `which node` 显示的路径不是 `/usr/bin/node`（例如 `/usr/local/bin/node`），将上方 `ExecStart=` 后的路径替换为实际路径即可。

---

## 方式二：Docker 一键启动（可选）

如果你的服务器习惯用 Docker / 1Panel 容器管理：
```bash
cd /opt/ameibao-travel
TRAVEL_PASSWORD="你们的暗号" docker compose up -d --build
```
数据会自动持久化挂载在 `/opt/ameibao-travel/travel-data` 目录中。

---

## 绑定域名与 HTTPS（手机主屏幕全屏体验更佳）

- **宝塔 / 1Panel**：新建网站 / 反向代理，目标填 `http://127.0.0.1:8799`，一键开启免费 Let's Encrypt HTTPS 证书即可。
> 注意：如果使用 Nginx / 宝塔反代，建议在站点配置中把上传大小限制调到 `client_max_body_size 50m;`，这样一次上传 9 张高清旅行照也畅通无阻。
- **Caddy 极简反代**：
  ```text
  travel.你的域名.com {
      reverse_proxy 127.0.0.1:8799
  }
  ```
- **手机变成专属小 App**：用 iPhone Safari 或安卓浏览器打开网址后，点击「分享 -> 添加到主屏幕」，桌面上就会出现戴着小旅行帽、露着豆豆眉和胖嘴筒子的阿咩豹图标啦！
