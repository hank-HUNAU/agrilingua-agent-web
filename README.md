# 神农语智免登录手机 App

部署方式：

```text
GitHub Pages 静态前端
        ↓
Supabase Edge Function 安全代理
        ↓
扣子 API
        ↓
神农语智智能体
```

最终手机地址形如：

```text
https://你的GitHub用户名.github.io/仓库名/
```

用户不需要登录扣子。扣子的 Access Token 只保存在 Supabase Secrets。

界面固定使用英文，回答语言默认英文，可在顶部切换为中文或日文。

## 一、先确认扣子 API

1. 打开神农语智智能体。
2. 点击“发布”。
3. 在“发布渠道 → API”中勾选 API 并发布。
4. 进入扣子开放平台并创建个人访问令牌：

```text
权限：chat
权限：file upload / files
```

5. 获取智能体 `bot_id`。

不要在本项目的任何文件中填写 Token。

## 二、创建 Supabase 项目

1. 登录 [Supabase](https://supabase.com/)。
2. 新建项目，选择距离目标用户较近的区域。
3. 记录：

```text
Project URL
anon public key
project-ref
```

4. 打开 Supabase SQL Editor，执行：

```text
supabase/rate_limit.sql
```

## 三、部署 Edge Function

### 方法 A：Supabase 网页端

1. 打开 Supabase 项目。
2. 进入：

```text
Edge Functions → Deploy a new function
```

3. 函数名称填写：

```text
agrilingua
```

4. 把 `supabase/functions/agrilingua/index.ts` 的全部内容粘贴进去。
5. 在 Edge Function 的 Secrets 页面添加：

```text
COZE_API_TOKEN
COZE_BOT_ID
ALLOWED_ORIGIN
RATE_LIMIT_ENABLED
RATE_LIMIT_PER_DAY
```

6. 将 `RATE_LIMIT_ENABLED` 设为 `true`。
7. 将 `RATE_LIMIT_PER_DAY` 设为 `60`。
8. `ALLOWED_ORIGIN` 填 GitHub Pages 的网站源，不带仓库路径：

```text
https://你的GitHub用户名.github.io
```

9. 关闭“Verify JWT”，否则浏览器匿名请求会被拦截。
10. 部署函数。

部署后的函数地址为：

```text
https://你的ProjectRef.supabase.co/functions/v1/agrilingua
```

### 方法 B：Supabase CLI

在项目目录打开 PowerShell：

```powershell
cd E:\学术英语跟读app\AgriLingua_Web
npx supabase login
npx supabase link --project-ref 你的ProjectRef
```

设置 Secrets：

```powershell
npx supabase secrets set COZE_API_TOKEN=你的扣子访问令牌
npx supabase secrets set COZE_BOT_ID=你的扣子bot_id
npx supabase secrets set ALLOWED_ORIGIN=https://你的GitHub用户名.github.io
npx supabase secrets set RATE_LIMIT_ENABLED=true
npx supabase secrets set RATE_LIMIT_PER_DAY=60
```

部署：

```powershell
npx supabase functions deploy agrilingua --no-verify-jwt
```

`--no-verify-jwt` 允许未登录浏览器的匿名请求；服务端已配置访问次数限制。不要把 Supabase `service_role` Key 放到网页。

## 四、配置 GitHub Pages

编辑：

```text
public/config.js
```

填入：

```js
window.AGRI_CONFIG = {
  supabaseUrl: "https://你的ProjectRef.supabase.co",
  supabaseAnonKey: "你的Supabase anon public key",
  functionName: "agrilingua"
};
```

这里的 `anon public key` 可以公开；不要填写 `service_role` key。

把整个 `AgriLingua_Web` 目录推送至 GitHub 仓库的 `main` 分支。

如果 GitHub Pages 使用普通公开仓库，直接在仓库页面上传这些文件即可。不要把任何 Token 加到 GitHub 仓库、Actions Secrets 之外的 Issue、README 或提交记录中。

在 GitHub：

```text
Settings → Pages → Build and deployment
Source = Deploy from a branch
Branch = gh-pages / (root)
```

`main` 分支保存源码。发布前将 `public` 中的静态文件同步到 `docs`，再将 `docs`
的内容推送到 `gh-pages` 分支。当前项目不依赖 GitHub Actions 自动部署。

部署后打开：

```text
https://你的GitHub用户名.github.io/仓库名/
```

## 五、安装为手机 App

项目已启用 PWA。使用 HTTPS 地址首次打开后：

- Android Chrome：点击页面顶部 `Install`，或在浏览器菜单中选择“安装应用”。
- iPhone Safari：点击分享按钮，再选择“添加到主屏幕”。
- 安装后会以全屏 App 形式启动，并使用品牌图标。

PWA 相关文件：

```text
public/manifest.webmanifest
public/sw.js
public/icons/
```

断网时可以重新打开 App 外壳；照片识别、问答和语音生成仍需要网络。

## 六、测试

### 默认界面

首次打开应为英文界面，回答语言默认选择 `English`。

### 中文文字

```text
葡萄修剪一般什么时候进行？
```

### 中文图片

上传 1～2 张葡萄照片，输入：

```text
第一张是葡萄叶背，第二张是霉层特写。请分析并给出今天和未来7天的处理建议。
```

### 英文

```text
When should I prune my grapevines?
```

### 日语

```text
ブドウの剪定はいつ行うべきですか？
```

检查：

- 回复语言正确。
- 有图片时至少返回中文、英文或日文图文建议。
- 有语音时页面出现播放器。
- 没有向页面泄露 Coze Token。
- 调用次数上限生效。

## 七、安全措施

- 服务端限制最多两张图片，单张不超过 8 MB。
- 限制问题最长 3000 字符。
- 按 IP 和浏览器实例执行每日次数限制。
- 前端只保存 Supabase anon key、随机会话 ID 和当前对话 ID。
- 服务端日志不得记录扣子 Token 或图片内容。
- 公开上线前检查 Supabase、GitHub Pages 和目标手机网络是否可访问。

## 八、能力边界

本版本支持：

```text
文字输入
一张或两张图片上传
中文、英文、日文回答
英文界面
可安装 PWA 手机 App
手机拍照入口
上下文与阶段式诊断进度
Markdown 图文卡
audio_url 语音播放
多轮对话
```

浏览器语音输入使用 Web Speech API。支持情况取决于手机浏览器；不支持时会自动隐藏麦克风按钮，文字和图片仍可正常使用。

图片支持 JPG、PNG、WebP、HEIC/HEIF 和 AVIF。浏览器能够解码 HEIC/HEIF 时会自动转换为 JPEG；
若浏览器本身无法解码该格式，会提示用户改用 JPG 或先将照片导出为 JPG。

