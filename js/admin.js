(() => {
  const main = document.getElementById("main");
  const status = document.getElementById("status");
  const logoutBtn = document.getElementById("logoutBtn");
  let content = null;
  let tab = "copy";

  const say = (msg) => {
    status.textContent = msg || "";
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
      <button type="button" data-tab="board" class="${tab === "board" ? "is-on" : ""}">洞板卡片</button>
      <button type="button" data-tab="works" class="${tab === "works" ? "is-on" : ""}">作品 / 媒体</button>
      <button type="button" data-tab="contact" class="${tab === "contact" ? "is-on" : ""}">联系与二维码</button>
    </nav>
    <div id="panel"></div>
    <button class="btn" id="saveBtn" type="button">保存到网站</button>`;

  const field = (label, key, value, area = false) => `
    <label>${label}</label>
    ${
      area
        ? `<textarea data-path="${key}">${esc(value)}</textarea>`
        : `<input data-path="${key}" value="${esc(value)}" />`
    }`;

  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");

  const getPath = (obj, path) =>
    String(path || "")
      .split(".")
      .reduce((o, k) => {
        if (o == null) return o;
        return o[/^\d+$/.test(k) ? Number(k) : k];
      }, obj);

  const setPath = (obj, path, value) => {
    const keys = path.split(".");
    let cur = obj;
    keys.forEach((k, i) => {
      const last = i === keys.length - 1;
      const key = /^\d+$/.test(k) ? Number(k) : k;
      if (last) {
        cur[key] = value;
        return;
      }
      if (cur[key] == null || typeof cur[key] !== "object") {
        cur[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      }
      cur = cur[key];
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
      <h3>侧栏</h3>
      ${field("品牌名", "brand", content.brand)}
      ${field("英文标语", "tagline", content.tagline)}
      ${field("侧栏宣言", "manifesto", content.manifesto, true)}
      ${field("底部号召语", "cta", content.cta)}
      ${field("CONNECT 标题", "connectLabel", content.connectLabel)}
      ${field("状态左", "statusLabel", content.statusLabel)}
      ${field("状态右", "statusText", content.statusText)}
      ${field("图例标题", "legendTitle", content.legendTitle)}
      ${field("提示标题", "hintTitle", content.hintTitle)}
      ${field("提示悬停", "hintHover", content.hintHover)}
      ${field("提示点击", "hintClick", content.hintClick)}
    </section>
    <section class="card">
      <h3>图例（左右文字）</h3>
      ${(content.legend || [])
        .map(
          (row, i) => `
        <div class="row">
          <div>${field("左", `legend.${i}.left`, row.left)}</div>
          <div>${field("右", `legend.${i}.right`, row.right)}</div>
        </div>`
        )
        .join("")}
    </section>
    <section class="card">
      <h3>简介弹窗</h3>
      ${field("标题", "modalTitles.about", content.modalTitles?.about)}
      ${field("简介中文", "about.zh", content.about?.zh, true)}
      ${field("简介英文", "about.en", content.about?.en, true)}
    </section>
    <section class="card">
      <h3>动态 UPDATES</h3>
      ${field("弹窗标题", "modalTitles.updates", content.modalTitles?.updates)}
      ${field("洞板便利贴标题", "updatesTitle", content.updatesTitle)}
      ${field("洞板便利贴正文", "updatesBlurb", content.updatesBlurb, true)}
      ${(content.updates || [])
        .map(
          (u, i) => `
        <div class="row row--with-del">
          <div>${field("日期", `updates.${i}.date`, u.date)}</div>
          <div>${field("内容", `updates.${i}.text`, u.text)}</div>
          <button type="button" class="btn btn--danger btn--tiny" data-del-item="updates:${i}">删</button>
        </div>`
        )
        .join("")}
      <button class="btn btn--ghost" type="button" id="addUpdate">＋ 增加一条动态</button>
    </section>
    <section class="card">
      <h3>简历</h3>
      ${field("弹窗标题", "modalTitles.resume", content.modalTitles?.resume)}
      ${field("经历小标题", "modalTitles.experience", content.modalTitles?.experience)}
      ${field("学历小标题", "modalTitles.education", content.modalTitles?.education)}
      ${(content.resume?.experience || [])
        .map(
          (u, i) => `
        <div class="row row--with-del">
          <div>${field("时间", `resume.experience.${i}.when`, u.when)}</div>
          <div>${field("经历", `resume.experience.${i}.what`, u.what)}</div>
          <button type="button" class="btn btn--danger btn--tiny" data-del-item="resume.experience:${i}">删</button>
        </div>`
        )
        .join("")}
      <button class="btn btn--ghost" type="button" data-add-item="resume.experience">＋ 加经历</button>
      ${(content.resume?.education || [])
        .map(
          (u, i) => `
        <div class="row row--with-del">
          <div>${field("时间", `resume.education.${i}.when`, u.when)}</div>
          <div>${field("学校", `resume.education.${i}.what`, u.what)}</div>
          <button type="button" class="btn btn--danger btn--tiny" data-del-item="resume.education:${i}">删</button>
        </div>`
        )
        .join("")}
      <button class="btn btn--ghost" type="button" data-add-item="resume.education">＋ 加学历</button>
      ${field("简历备注", "resume.note", content.resume?.note, true)}
      ${field("CV 链接（上传后自动填）", "resume.cvUrl", content.resume?.cvUrl)}
      <label class="file-btn btn btn--ghost">上传 CV PDF
        <input type="file" accept="application/pdf" data-upload="cv" />
      </label>
    </section>`;

  const boardPanel = () => `
    <section class="card">
      <h3>01 个人简介卡</h3>
      ${field("编号", "cards.about.num", content.cards?.about?.num)}
      ${field("英文标题", "cards.about.title", content.cards?.about?.title)}
      ${field("中文标题", "cards.about.titleZh", content.cards?.about?.titleZh)}
      ${field("说明", "cards.about.desc", content.cards?.about?.desc, true)}
    </section>
    <section class="card">
      <h3>02 作品卡</h3>
      ${field("编号", "cards.works.num", content.cards?.works?.num)}
      ${field("英文标题", "cards.works.title", content.cards?.works?.title)}
      ${field("中文标题", "cards.works.titleZh", content.cards?.works?.titleZh)}
      ${field("说明", "cards.works.desc", content.cards?.works?.desc, true)}
      <h4>作品分类列表（文字 + 缩略图）</h4>
      ${(content.boardTags || [])
        .map(
          (tag, i) => `
        <div class="board-tag-edit">
          <div class="row">
            <div>${field("英文", `boardTags.${i}.en`, tag.en)}</div>
            <div>${field("中文", `boardTags.${i}.zh`, tag.zh)}</div>
          </div>
          ${tag.image ? `<img class="admin-thumb" src="${esc(tag.image)}" alt="" />` : `<p class="hint">还没上传缩略图</p>`}
          <label class="file-btn btn btn--ghost">上传缩略图
            <input type="file" accept="image/*" data-upload="boardTag:${i}" />
          </label>
          <button type="button" class="btn btn--danger btn--tiny" data-del-item="boardTags:${i}">删除这一行</button>
        </div>`
        )
        .join("")}
      <button class="btn btn--ghost" type="button" data-add-item="boardTags">＋ 加分类</button>
    </section>
    <section class="card">
      <h3>03 简历卡</h3>
      ${field("编号行", "cards.resume.num", content.cards?.resume?.num)}
      ${field("中文竖排", "cards.resume.titleZh", content.cards?.resume?.titleZh, true)}
      ${field("左说明", "cards.resume.meta1", content.cards?.resume?.meta1)}
      ${field("右说明", "cards.resume.meta2", content.cards?.resume?.meta2)}
      ${field("底部链接字", "cards.resume.link", content.cards?.resume?.link)}
    </section>
    <section class="card">
      <h3>04 技能卡 / 弹窗</h3>
      ${field("洞板标题", "cards.skills.title", content.cards?.skills?.title)}
      ${field("洞板中文", "cards.skills.titleZh", content.cards?.skills?.titleZh)}
      ${field("弹窗标题", "modalTitles.skills", content.modalTitles?.skills)}
      ${(content.skills || [])
        .map(
          (s, i) => `
        <div class="board-tag-edit">
          ${field("技能名", `skills.${i}.name`, s.name)}
          ${s.photo ? `<img class="admin-thumb" src="${esc(s.photo)}" alt="" />` : ""}
          <label class="file-btn btn btn--ghost">为「${esc(s.name || "技能")}」上传图片
            <input type="file" accept="image/*" data-upload="skill:${i}" />
          </label>
          <button type="button" class="btn btn--danger btn--tiny" data-del-item="skills:${i}">删除</button>
        </div>`
        )
        .join("")}
      <button class="btn btn--ghost" type="button" data-add-item="skills">＋ 加技能</button>
    </section>
    <section class="card">
      <h3>05 联系邮票卡</h3>
      ${field("标题", "cards.contact.title", content.cards?.contact?.title)}
      ${field("中文", "cards.contact.titleZh", content.cards?.contact?.titleZh)}
      ${field("二维码提示", "cards.contact.qrHint", content.cards?.contact?.qrHint)}
      ${field("志号", "cards.contact.serial", content.cards?.contact?.serial)}
      ${field("放大图说明", "lightboxCaption", content.lightboxCaption)}
    </section>`;

  const contactPanel = () => `
    <section class="card">
      <h3>联系方式（洞板 + 弹窗共用，改一处两边一起变）</h3>
      ${field("邮箱", "contact.email", content.contact?.email)}
      ${field("电话", "contact.phone", content.contact?.phone)}
      <div class="row">
        <div>${field("城市中文", "contact.city", content.contact?.city)}</div>
        <div>${field("城市英文", "contact.cityEn", content.contact?.cityEn)}</div>
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
      <h3>联系弹窗标签文字</h3>
      ${field("微信正面", "contactLabels.wechatFace", content.contactLabels?.wechatFace)}
      ${field("微信底栏", "contactLabels.wechat", content.contactLabels?.wechat)}
      ${field("小红书正面", "contactLabels.redFace", content.contactLabels?.redFace)}
      ${field("小红书底栏", "contactLabels.red", content.contactLabels?.red)}
      ${field("城市正面备注", "contactLabels.cityNote", content.contactLabels?.cityNote)}
      ${field("城市底栏", "contactLabels.city", content.contactLabels?.city)}
      ${field("电话底栏", "contactLabels.phone", content.contactLabels?.phone)}
      ${field("邮箱底栏", "contactLabels.email", content.contactLabels?.email)}
    </section>`;

  const worksPanel = () => `
    <section class="card">
      <h3>作品页头图文</h3>
      ${field("标题", "worksHero.title", content.worksHero?.title)}
      ${field("简介", "worksHero.desc", content.worksHero?.desc, true)}
    </section>
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
          ${(w.media || [])
            .map((m, i) => ((m.kind === "image" || m.kind === "video") && m.src ? mediaThumb(m, w.id, i) : ""))
            .join("")}
        </div>
        <label class="file-btn btn btn--ghost">上传照片
          <input type="file" accept="image/*" data-upload="work-image:${w.id}" />
        </label>
        <label class="file-btn btn btn--ghost">上传视频
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
      setPath(content, path, el.value);
    });
  };

  const ensureShapes = () => {
    content.cards = content.cards || {};
    content.contactLabels = content.contactLabels || {};
    content.modalTitles = content.modalTitles || {};
    content.legend = content.legend || [];
    content.boardTags = content.boardTags || [];
    content.skills = content.skills || [];
    content.updates = content.updates || [];
    content.resume = content.resume || { experience: [], education: [] };
    content.resume.experience = content.resume.experience || [];
    content.resume.education = content.resume.education || [];
    content.contact = content.contact || {};
    content.about = content.about || {};
    content.worksHero = content.worksHero || {};
    content.works = content.works || [];
  };

  const drawPanel = () => {
    const panel = document.getElementById("panel");
    if (!panel) return;
    ensureShapes();
    if (tab === "copy") panel.innerHTML = copyPanel();
    if (tab === "board") panel.innerHTML = boardPanel();
    if (tab === "contact") panel.innerHTML = contactPanel();
    if (tab === "works") panel.innerHTML = worksPanel();
  };

  const draw = async () => {
    const sess = DawnStore.configured() ? await DawnStore.session() : null;
    if (!sess) {
      main.innerHTML = loginView();
      logoutBtn.hidden = true;
      if (!DawnStore.configured()) {
        say("还没读到云端配置。请用 Ctrl+F5 强制刷新本页。若打开的是网上地址，需要先把配置推到 GitHub。");
      }
      return;
    }
    logoutBtn.hidden = false;
    if (!content) {
      say("读取网站内容…");
      content = await DawnStore.load();
      ensureShapes();
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
        content.skills[i] = content.skills[i] || { name: "", photo: "" };
        content.skills[i].photo = await DawnStore.upload(file, "skills");
      } else if (kind.startsWith("boardTag:")) {
        const i = Number(kind.split(":")[1]);
        content.boardTags[i] = content.boardTags[i] || { en: "", zh: "", image: "" };
        content.boardTags[i].image = await DawnStore.upload(file, "board");
      } else if (kind.startsWith("work-image:")) {
        const id = kind.split(":")[1];
        const url = await DawnStore.upload(file, `works/${id}`);
        const work = content.works.find((w) => w.id === id);
        work.media = (work.media || []).filter((m) => (m.kind === "image" || m.kind === "video") && m.src);
        work.media.push({ kind: "image", src: url });
      } else if (kind.startsWith("work-video:")) {
        const id = kind.split(":")[1];
        const url = await DawnStore.upload(file, `works/${id}`);
        const work = content.works.find((w) => w.id === id);
        work.media = (work.media || []).filter((m) => (m.kind === "image" || m.kind === "video") && m.src);
        work.media.push({ kind: "video", src: url });
      }
      say("上传完成，记得点「保存到网站」。");
      drawPanel();
    } catch (err) {
      say(err.message || String(err));
    }
  };

  const delItem = (spec) => {
    const cut = spec.lastIndexOf(":");
    if (cut < 0) return;
    const path = spec.slice(0, cut);
    const idx = Number(spec.slice(cut + 1));
    const arr = getPath(content, path);
    if (!Array.isArray(arr) || Number.isNaN(idx)) return;
    arr.splice(idx, 1);
  };

  main.addEventListener("click", async (e) => {
    const t = e.target.closest("button, [data-tab], [data-del-item], [data-add-item], [data-del-work], [data-del-media]") || e.target;
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
    if (t.dataset?.tab) {
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
    if (t.dataset?.addItem) {
      collectFields();
      const kind = t.dataset.addItem;
      if (kind === "resume.experience") content.resume.experience.push({ when: "", what: "" });
      if (kind === "resume.education") content.resume.education.push({ when: "", what: "" });
      if (kind === "boardTags") content.boardTags.push({ en: "NEW", zh: "新分类", image: "" });
      if (kind === "skills") content.skills.push({ name: "NEW SKILL", photo: "" });
      drawPanel();
    }
    if (t.dataset?.delItem) {
      collectFields();
      if (confirm("确定删除？")) {
        delItem(t.dataset.delItem);
        drawPanel();
      }
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
    if (t.dataset?.delWork) {
      collectFields();
      if (confirm("删除这个作品？媒体文件仍会留在云端，可稍后在 Supabase 清理。")) {
        content.works = content.works.filter((w) => w.id !== t.dataset.delWork);
        drawPanel();
      }
    }
    if (t.dataset?.delMedia) {
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

  if (!DawnStore.configured()) {
    main.innerHTML = setupView();
  }
  draw();
})();
