# ZhenFrame 作品集

访客打开的是公开网站。只有你登录后才能改文字、图片和视频。图片和视频存在云端，不放进 GitHub。以后要放进网站的素材，放在 `assets` 文件夹。

登录后：首页会出现「保存到网上」。点页面上的文字就能改；点头像和二维码会换图。作品详情里可以加图片或视频。手机浏览器打开同一网址也可以。完整后台在 `admin.html`。

## 1. 开通免费云端（一次）

1. 打开 [https://supabase.com](https://supabase.com) 注册，新建项目。
2. 在 Project Settings → API 里复制 Project URL 和 anon public key。
3. 填进 `js/config.js`，或在 GitHub 仓库 Secrets 里加 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`。
4. 打开 SQL Editor，把 `supabase/schema.sql` 全部粘贴并执行。
5. Authentication → Providers：只留 Email，并关闭 Confirm email。
6. Authentication → Settings：关掉公开注册。
7. Authentication → Users → Add user：用你的邮箱和密码添加唯一账号。

anon key 会出现在网页里。没有你的账号就不能写入，访客只能看。

## 2. 发布到 GitHub Pages

仓库：`lumosmaxshine/ZhenFrame`。Settings → Pages → Source 选 **GitHub Actions**。

公开地址：

`https://lumosmaxshine.github.io/ZhenFrame/`

后台：

`https://lumosmaxshine.github.io/ZhenFrame/admin.html`

## 3. 在自己电脑上看

双击或在这个文件夹里运行 `preview.ps1`，然后打开：

- http://127.0.0.1:5173/
- http://127.0.0.1:5173/admin.html

## 4. 图片和视频

- 图片用 JPG 或 WebP，尽量小于 5MB
- 视频先压缩，单个小于 45MB
