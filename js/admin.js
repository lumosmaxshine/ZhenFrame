(() => {
  const main = document.getElementById("main");
  const status = document.getElementById("status");
  const logoutBtn = document.getElementById("logoutBtn");
  let content = null;
  let tab = "copy";

  const say = (msg) => {
    status.textContent = msg || "";
  };

  const html = (strings, ...vals) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = String.raw(strings, ...vals);
    return wrap;
  };

  const setupView = () => `
    <section class="card setup">
      <h2>先开通云端（只需一次）</h2>
      <p>公开网站和手机编辑都走同一套云存储。图片、视频不放进 GitHub。</p>
      <ol>
        <li>打开 <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a> 注册并 New project。</li>
        <li>Project Settings → API，复制 Project URL 和 anon public key。</li>
        <li>把它们填进仓库里的 <code>js/config.js</code>，推送到 GitHub。</li>
        <li>SQL Editor 粘贴并运行 <code>supabase/schema.sql</code>。</li>
        <li>Authentication → Providers 只保留 Email。关闭 “Confirm email”（方便自己用）。</li>
        <li>Authentication → Users → Add user，用你的邮箱和密码添加<strong>唯一</strong>账号。不要打开公开注册。</li>
      </ol>
      <p>配好并重新打开本页后，即可登录。之后把 <code>admin.html</code> 添加到手机主屏幕，随时改作品。</p>
    </section>`;

  const loginView = () => `
    <section class="card">
      <h2>仅本人登录</h2>
      <label>邮箱</label>
      <input id="email" type="email" autocomplete="username" />
      <label>密码</label>
      <input id="password" type="password" autocomplete="current-password" />
      <button class="btn" id="loginBtn" type="button">进入编辑</button>
    </section>`;

  const editorView = () => `
    <nav class="tabs">
      <button type="button" data-tab="copy" class="${tab === "copy" ? "is-on" : ""}">文案</button>
      <button type="button" data-tab="works" class="${tab === "works" ? "is-on" : ""}">作品 / 媒体</button>
      <button type="button" data-tab="contact" class="${tab === "contact" ? "is-on" : ""}">联系与二维码</button>
    </nav>
    <div id="panel"></div>
    <button class="btn" id="saveBtn" type="button">保存到网站</button>`;

  const field = (label, key, value, area = false) => `
    <label>${label}</label>
    ${area
      ? `<textarea data-path="${key}">${esc(value)}</textarea>`
      : `<input data-path="${key}" value="${esc(value)}" />`}`;

  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");

  const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

  const setPath = (obj, path, value) => {
    const keys = path.split(".");
    let cur = obj;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) cur[k] = value;
      else {
        if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
        cur = cur[k];
      }
    });
  };

  const mediaThumb = (item, workId, idx) => {
    if (item.kind === "video") {
      return `<div class="media-item"><video src="${esc(item.src)}" muted></video><button type="button" data-del-media="${workId}:${idx}">×</button></div>`;
    }
    if (item.kind === "image") {
      return `<div class="media-item"><img src="${esc(item.src)}" alt="" /><button type="button" data-del-media="${workId}:${idx}">×</button></div>`;
    }
    return `<div class="media-item" style="background:${esc(item.color || "#ccc")}"><button type="button" data-del-media="${workId}:${idx}">×</button></div>`;
  };

  const copyPanel = () => `
    <section class="card">
      ${field("品牌名", "brand", content.brand)}
      ${field("英文标语", "tagline", content.tagline)}
      ${field("侧栏宣言", "manifesto", content.manifesto, true)}
      ${field("简介中文", "about.zh", content.about.zh, true)}
      ${field("简介英文", "about.en", content.about.en, true)}
      ${field("便利贴标题", "updatesTitle", content.updatesTitle)}
      ${field("便利贴正文", "updatesBlurb", content.updatesBlurb, true)}
    </section>
    <section class="card">
      <h3>动态</h3>
      ${(content.updates || [])
        .map(
          (u, i) => `
        <div class="row">
          <div>${field("日期", `updates.${i}.date`, u.date)}</div>
          <div>${field("内容", `updates.${i}.text`, u.text)}</div>
        </div>`
        )
        .join("")}
      <button class="btn btn--ghost" type="button" id="addUpdate">增加一条动态</button>
    </section>
    <section class="card">
      <h3>简历</h3>
      ${(content.resume.experience || [])
        .map(
          (u, i) => `
        <div class="row">
          <div>${field("时间", `resume.experience.${i}.when`, u.when)}</div>
          <div>${field("经历", `resume.experience.${i}.what`, u.what)}</div>
        </div>`
        )
        .join("")}
      ${(content.resume.education || [])
        .map(
          (u, i) => `
        <div class="row">
          <div>${field("时间", `resume.education.${i}.when`, u.when)}</div>
          <div>${field("学校", `resume.education.${i}.what`, u.what)}</div>
        </div>`
        )
        .join("")}
      ${field("简历备注", "resume.note", content.resume.note, true)}
      ${field("CV 链接（上传后自动填）", "resume.cvUrl", content.resume.cvUrl)}
      <label class="file-btn btn btn--ghost">上传 CV PDF
        <input type="file" accept="application/pdf" data-upload="cv" />
      </label>
    </section>`;

  const contactPanel = () => `
    <section class="card">
      ${field("邮箱", "contact.email", content.contact.email)}
      ${field("电话", "contact.phone", content.contact.phone)}
      <div class="row">
        <div>${field("城市", "contact.city", content.contact.city)}</div>
        <div>${field("城市英文", "contact.cityEn", content.contact.cityEn)}</div>
      </div>
      <label class="file-btn btn btn--ghost">上传证件照 / 头像
        <input type="file" accept="image/*" capture="environment" data-upload="portrait" />
      </label>
      <label class="file-btn btn btn--ghost">上传微信二维码
        <input type="file" accept="image/*" data-upload="wechat" />
      </label>
      <label class="file-btn btn btn--ghost">上传小红书二维码
        <input type="file" accept="image/*" data-upload="rednote" />
      </label>
    </section>
    <section class="card">
      <h3>技能（可配图）</h3>
      ${(content.skills || [])
        .map(
          (s, i) => `
        ${field("技能名", `skills.${i}.name`, s.name)}
        <label class="file-btn btn btn--ghost">为「${esc(s.name)}」上传图片
          <input type="file" accept="image/*" data-upload="skill:${i}" />
        </label>`
        )
        .join("")}
    </section>`;

  const worksPanel = () => `
    ${(content.works || [])
      .map(
        (w) => `
      <section class="card work-card" data-work="${esc(w.id)}">
        <h3>${esc(w.name)}</h3>
        <div class="row">
          <div>${field("年份", `work.${w.id}.year`, w.year)}</div>
          <div>${field("项目名", `work.${w.id}.name`, w.name)}</div>
        </div>
        <div class="row">
          <div>${field("品类", `work.${w.id}.category`, w.category)}</div>
          <div>${field("类型", `work.${w.id}.type`, w.type)}</div>
        </div>
        ${field("简介", `work.${w.id}.desc`, w.desc, true)}
        <div class="media-grid">
          ${(w.media || []).map((m, i) => mediaThumb(m, w.id, i)).join("")}
        </div>
        <label class="file-btn btn btn--ghost">添加图片
          <input type="file" accept="image/*" data-upload="work-image:${w.id}" />
        </label>
        <label class="file-btn btn btn--ghost">添加视频
          <input type="file" accept="video/*" data-upload="work-video:${w.id}" />
        </label>
        <button class="btn btn--danger" type="button" data-del-work="${esc(w.id)}">删除这个项目</button>
      </section>`
      )
      .join("")}
    <button class="btn btn--ghost" type="button" id="addWork">新增作品</button>`;

  const collectFields = () => {
    document.querySelectorAll("[data-path]").forEach((el) => {
      const path = el.dataset.path;
      if (path.startsWith("work.")) {
        const [, id, key] = path.split(".");
        const work = content.works.find((w) => w.id === id);
        if (work) work[key] = el.value;
        return;
      }
      if (/^\w+\.\d+\./.test(path) || path.includes(".")) {
        setPath(content, path, el.value);
        return;
      }
      content[path] = el.value;
    });
  };

  const drawPanel = () => {
    const panel = document.getElementById("panel");
    if (!panel) return;
    if (tab === "copy") panel.innerHTML = copyPanel();
    if (tab === "contact") panel.innerHTML = contactPanel();
    if (tab === "works") panel.innerHTML = worksPanel();
  };

  const draw = async () => {
    if (!DawnStore.configured()) {
      main.innerHTML = setupView();
      logoutBtn.hidden = true;
      return;
    }
    const sess = await DawnStore.session();
    if (!sess) {
      main.innerHTML = loginView();
      logoutBtn.hidden = true;
      return;
    }
    logoutBtn.hidden = false;
    if (!content) {
      say("读取网站内容…");
      content = await DawnStore.load();
      say("");
    }
    main.innerHTML = editorView();
    drawPanel();
  };

  const handleUpload = async (kind, file) => {
    say("上传中…");
    try {
      if (kind === "cv") {
        content.resume.cvUrl = await DawnStore.upload(file, "cv");
      } else if (kind === "portrait") {
        content.contact.portrait = await DawnStore.upload(file, "portrait");
      } else if (kind === "wechat") {
        content.contact.wechatQr = await DawnStore.upload(file, "qr");
      } else if (kind === "rednote") {
        content.contact.rednoteQr = await DawnStore.upload(file, "qr");
      } else if (kind.startsWith("skill:")) {
        const i = Number(kind.split(":")[1]);
        content.skills[i].photo = await DawnStore.upload(file, "skills");
      } else if (kind.startsWith("work-image:")) {
        const id = kind.split(":")[1];
        const url = await DawnStore.upload(file, `works/${id}`);
        const work = content.works.find((w) => w.id === id);
        work.media = work.media || [];
        work.media.push({ kind: "image", src: url });
      } else if (kind.startsWith("work-video:")) {
        const id = kind.split(":")[1];
        const url = await DawnStore.upload(file, `works/${id}`);
        const work = content.works.find((w) => w.id === id);
        work.media = work.media || [];
        work.media.push({ kind: "video", src: url });
      }
      say("上传完成，记得点「保存到网站」。");
      drawPanel();
    } catch (err) {
      say(err.message || String(err));
    }
  };

  main.addEventListener("click", async (e) => {
    const t = e.target;
    if (t.id === "loginBtn") {
      try {
        say("登录中…");
        await DawnStore.login(document.getElementById("email").value.trim(), document.getElementById("password").value);
        content = null;
        await draw();
        say("");
      } catch (err) {
        say(err.message || "登录失败");
      }
    }
    if (t.dataset.tab) {
      collectFields();
      tab = t.dataset.tab;
      drawPanel();
      main.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("is-on", b.dataset.tab === tab));
    }
    if (t.id === "saveBtn") {
      collectFields();
      try {
        say("保存中…");
        await DawnStore.save(content);
        say("已发布到线上网站。");
      } catch (err) {
        say(err.message || String(err));
      }
    }
    if (t.id === "addUpdate") {
      collectFields();
      content.updates.push({ date: "", text: "" });
      drawPanel();
    }
    if (t.id === "addWork") {
      collectFields();
      content.works.unshift({
        id: `work-${Date.now()}`,
        year: String(new Date().getFullYear()),
        name: "新项目",
        category: "",
        type: "Brand design",
        color: "#c45c4a",
        side: "",
        desc: "",
        media: [],
      });
      tab = "works";
      main.innerHTML = editorView();
      drawPanel();
    }
    if (t.dataset.delWork) {
      collectFields();
      if (confirm("删除这个作品？媒体文件仍会留在云端，可稍后在 Supabase 清理。")) {
        content.works = content.works.filter((w) => w.id !== t.dataset.delWork);
        drawPanel();
      }
    }
    if (t.dataset.delMedia) {
      const [id, idx] = t.dataset.delMedia.split(":");
      const work = content.works.find((w) => w.id === id);
      if (work) work.media.splice(Number(idx), 1);
      drawPanel();
    }
  });

  main.addEventListener("change", async (e) => {
    const input = e.target;
    if (input.dataset.upload && input.files?.[0]) {
      collectFields();
      await handleUpload(input.dataset.upload, input.files[0]);
      input.value = "";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await DawnStore.logout();
    content = null;
    await draw();
  });

  draw();
})();
