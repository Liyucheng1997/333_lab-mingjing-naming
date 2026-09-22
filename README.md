# 明境 · 八字起名

一个本地优先的中文八字起名网站：根据出生年月日时计算四柱与五行，生成中文名、对应英文名，并通过本机 Codex 订阅调用 Image Gen 设计中英文签名。

## 启动

```bash
npm install
npm run dev
```

开发地址为 `http://localhost:5173`。生产构建：

```bash
npm run build
npm start
```

生产地址为 `http://localhost:8787`。

## 工作方式

- 四柱：使用 `lunar-typescript` 按公历日期与时辰计算。
- 起名：服务端调用本机已登录的 `codex exec`，失败或超时时自动切换至本地文化词库。
- 签名：服务端让 Codex 使用 Image Gen 生成 PNG，并保存到 `public/generated/`。
- 风格：行云行书、雅正楷书、古意篆书、极简现代。

> 八字与五行内容属于传统文化体验，仅作命名灵感参考，不代表确定性判断。
