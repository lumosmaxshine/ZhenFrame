(() => {
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

  const pickFile = (accept) =>
    new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.addEventListener("change", () => resolve(input.files?.[0] || null), { once: true });
      input.click();
    });

  const harvest = (content) => {
    document.querySelectorAll("[data-bind]").forEach((el) => {
      setPath(content, el.dataset.bind, el.innerText.replace(/\u00a0/g, " ").trimEnd());
    });
    content.boxes = content.boxes || {};
    document.querySelectorAll("[data-box]").forEach((el) => {
      const id = el.dataset.box;
      if (!id) return;
      content.boxes[id] = {
        w: el.style.width || "",
        h: el.style.height || "",
      };
    });
    const work = window.DawnWorks?.active?.();
    if (work) {
      document.querySelectorAll("[data-work-field]").forEach((el) => {
        work[el.dataset.workField] = el.innerText.trim();
      });
    }
    if (window.DawnWorks?.list) content.works = window.DawnWorks.list();
    return content;
  };

  const getPath = (obj, path) =>
    String(path || "")
      .split(".")
      .reduce((o, k) => {
        if (o == null) return o;
        return o[/^\d+$/.test(k) ? Number(k) : k];
      }, obj);

  const syncSameBinds = (source) => {
    const path = source.dataset.bind;
    if (!path) return;
    const text = source.innerText.replace(/\u00a0/g, " ");
    document.querySelectorAll("[data-bind]").forEach((el) => {
      if (el === source || el.dataset.bind !== path) return;
      if (text.includes("\n")) {
        el.innerHTML = text.replace(/\n/g, "<br />");
      } else {
        el.textContent = text;
      }
    });
  };

  const showOwnerControls = () => {
    document.querySelectorAll("[data-owner-only]").forEach((el) => {
      el.hidden = false;
    });
    document.querySelectorAll(".list-del").forEach((el) => {
      el.hidden = false;
    });
  };

  const enableInline = () => {
    if (!document.body.classList.contains("is-owner")) return;
    document.querySelectorAll("[data-bind], [data-work-field]").forEach((el) => {
      if (el.id === "brandMenuBtn") return;
      el.contentEditable = "true";
      el.spellcheck = false;
      el.classList.add("is-editable");
      if (el.dataset.editBound === "1") return;
      el.dataset.editBound = "1";
      // 阻止点文字时打开弹窗 / 跳转，但不要 preventDefault，否则有的浏览器无法输入
      el.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (el.closest("a[href]")) e.preventDefault();
      });
      el.addEventListener("keydown", (e) => {
        e.stopPropagation();
      });
      el.addEventListener("input", () => syncSameBinds(el));
      el.addEventListener("blur", () => syncSameBinds(el));
    });
    document.querySelectorAll("[data-edit-media]").forEach((el) => {
      el.classList.add("is-swappable");
    });
    showOwnerControls();
  };

  const say = (msg) => {
    const el = document.getElementById("settingsStatus");
    if (el) el.textContent = msg || "";
  };

  const fmtTime = (iso) => {
    try {
      const d = new Date(iso);
      const p = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch {
      return iso || "";
    }
  };

  const icon = (path) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg>`;

  const closeBrandMenu = () => {
    const menu = document.getElementById("brandMenu");
    if (menu) {
      menu.hidden = true;
      menu.dataset.open = "0";
      menu.classList.remove("is-force-land");
      menu.style.transform = "";
    }
    const btn = document.getElementById("brandMenuBtn");
    if (btn) btn.setAttribute("aria-expanded", "false");
  };

  const closeSettings = () => {
    document.getElementById("settingsPanel")?.remove();
  };

  const goSection = (key) => {
    closeBrandMenu();
    if (key === "works") {
      location.href = "works.html";
      return;
    }
    const map = {
      about: "about",
      resume: "resume",
      skills: "skills",
      contact: "contact",
      updates: "updates",
    };
    const id = map[key];
    if (!id) return;
    const modal = document.getElementById(`modal-${id}`);
    const trigger = document.querySelector(`[data-modal="${id}"]`);
    if (trigger) trigger.click();
    else if (modal) {
      modal.hidden = false;
      document.body.style.overflow = "hidden";
    }
  };

  const openBrandMenu = async () => {
    const btn = document.getElementById("brandMenuBtn");
    if (!btn) return;
    let menu = document.getElementById("brandMenu");
    if (!menu) {
      menu = document.createElement("div");
      menu.id = "brandMenu";
      menu.className = "brand-menu";
      menu.setAttribute("role", "menu");
      document.body.appendChild(menu);
      document.addEventListener("click", (e) => {
        if (e.target.closest("#brandMenu") || e.target.closest("#brandMenuBtn")) return;
        closeBrandMenu();
      });
    }
    if (!menu.hidden && menu.dataset.open === "1") {
      closeBrandMenu();
      return;
    }
    const sess = DawnStore.configured() ? await DawnStore.session() : null;
    menu.innerHTML = `
      <button type="button" class="brand-menu__item" data-go="about" role="menuitem">
        ${icon("M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z")}简介 About
      </button>
      <button type="button" class="brand-menu__item" data-go="works" role="menuitem">
        ${icon("M4 5h16v3H4zm0 5h10v3H4zm0 5h14v3H4z")}作品 Works
      </button>
      <button type="button" class="brand-menu__item" data-go="resume" role="menuitem">
        ${icon("M7 3h10a2 2 0 0 1 2 2v14l-7-3-7 3V5a2 2 0 0 1 2-2z")}简历 Resume
      </button>
      <button type="button" class="brand-menu__item" data-go="skills" role="menuitem">
        ${icon("M12 2l2.4 7.2H22l-6 4.4 2.3 7L12 16.8 5.7 20.6 8 13.6 2 9.2h7.6z")}技能 Skills
      </button>
      <button type="button" class="brand-menu__item" data-go="contact" role="menuitem">
        ${icon("M4 5h16v14H4zm2 2v2h12V7zm0 4v2h8v-2zm0 4v2h10v-2z")}联系 Contact
      </button>
      <button type="button" class="brand-menu__item" data-go="updates" role="menuitem">
        ${icon("M5 4h14v2H5zm0 5h14v11H5zm3 3v2h8v-2z")}动态 Updates
      </button>
      <div class="brand-menu__sep"></div>
      <button type="button" class="brand-menu__item" data-act="settings" role="menuitem">
        ${icon("M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.1 7.1 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.77 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.6.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.23.1.48 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z")}
        ${sess ? "设置 / 保存" : "设置 / 登录"}
      </button>
      <a class="brand-menu__item" href="admin.html" role="menuitem">
        ${icon("M4 4h16v4H4zm0 6h10v4H4zm0 6h16v4H4z")}完整后台
      </a>
      ${
        sess
          ? `<button type="button" class="brand-menu__item" data-act="logout" role="menuitem">
        ${icon("M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M14 12H7m7-4l4 4-4 4")}退出登录
      </button>`
          : ""
      }`;

    const forceLand = document.body.classList.contains("is-force-landscape");
    menu.hidden = false;
    menu.dataset.open = "1";
    menu.classList.toggle("is-force-land", forceLand);
    if (forceLand) {
      // 跟洞板同一阅读方向：屏幕正中并旋转 90°
      menu.style.left = "50%";
      menu.style.top = "50%";
      menu.style.right = "auto";
      menu.style.transform = "translate(-50%, -50%) rotate(90deg)";
    } else {
      const rect = btn.getBoundingClientRect();
      menu.style.transform = "";
      menu.style.left = `${Math.min(rect.left, window.innerWidth - 240)}px`;
      menu.style.top = `${rect.bottom + 8}px`;
      menu.style.right = "auto";
    }
    btn.setAttribute("aria-expanded", "true");

    menu.querySelectorAll("[data-go]").forEach((el) => {
      el.addEventListener("click", () => goSection(el.dataset.go));
    });
    menu.querySelector("[data-act='settings']")?.addEventListener("click", () => {
      closeBrandMenu();
      openSettings();
    });
    menu.querySelector("[data-act='logout']")?.addEventListener("click", async () => {
      await DawnStore.logout();
      location.reload();
    });
  };

  const bindBrandMenu = () => {
    const btn = document.getElementById("brandMenuBtn");
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openBrandMenu();
    });
  };

  const applyContent = (content) => {
    window.DAWN_CONTENT = content;
    window.DawnRender?.apply(content);
    document.dispatchEvent(new CustomEvent("dawn:content", { detail: content }));
    if (document.body.classList.contains("is-owner")) enableInline();
    window.DawnWorks?.refresh?.();
  };

  const bindListActions = () => {
    if (document.body.dataset.listActionsBound === "1") return;
    document.body.dataset.listActionsBound = "1";
    document.addEventListener("click", (e) => {
      if (!document.body.classList.contains("is-owner")) return;
      const addBtn = e.target.closest("[data-list-add]");
      if (addBtn) {
        e.preventDefault();
        e.stopPropagation();
        const content = harvest(window.DAWN_CONTENT || {});
        const kind = addBtn.dataset.listAdd;
        if (kind === "updates") {
          content.updates = content.updates || [];
          content.updates.push({ date: "2026.01", text: "新动态" });
        } else if (kind === "resume.experience") {
          content.resume = content.resume || {};
          content.resume.experience = content.resume.experience || [];
          content.resume.experience.push({ when: "时间", what: "经历说明" });
        } else if (kind === "resume.education") {
          content.resume = content.resume || {};
          content.resume.education = content.resume.education || [];
          content.resume.education.push({ when: "时间", what: "学校 / 专业" });
        } else if (kind === "boardTags") {
          content.boardTags = content.boardTags || [];
          content.boardTags.push({ en: "NEW", zh: "新分类", image: "" });
        } else if (kind === "skills") {
          content.skills = content.skills || [];
          content.skills.push({ name: "NEW SKILL", photo: "" });
        }
        applyContent(content);
        say("已添加，到设置里点「保存到网上」才会公开");
        return;
      }
      const delBtn = e.target.closest("[data-list-del]");
      if (delBtn) {
        e.preventDefault();
        e.stopPropagation();
        const spec = delBtn.dataset.listDel || "";
        const cut = spec.lastIndexOf(":");
        if (cut < 0) return;
        const path = spec.slice(0, cut);
        const idx = Number(spec.slice(cut + 1));
        if (Number.isNaN(idx)) return;
        if (!confirm("确定删除这一条？")) return;
        const content = harvest(window.DAWN_CONTENT || {});
        const arr = getPath(content, path);
        if (!Array.isArray(arr)) return;
        arr.splice(idx, 1);
        applyContent(content);
        say("已删除，到设置里点「保存到网上」才会公开");
      }
    });
  };

  const bindOwnerLinkGuard = () => {
    if (document.body.dataset.linkGuardBound === "1") return;
    document.body.dataset.linkGuardBound = "1";
    document.addEventListener(
      "click",
      (e) => {
        if (!document.body.classList.contains("is-owner")) return;
        const link = e.target.closest("a.obj[href]");
        if (!link) return;
        // 登录编辑时：点文字/缩略图只改内容，不跳作品页；点空白处仍可进入
        if (
          e.target.closest(
            "[data-bind], [data-edit-media], .is-editable, .thumb, .list-del, [data-list-add], .owner-list-actions"
          )
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  };

  const renderHistory = async (box) => {
    if (!box) return;
    box.innerHTML = "";
    try {
      const list = await DawnStore.listHistory();
      if (!list.length) {
        box.innerHTML = "";
        return;
      }
      box.innerHTML = list
        .map(
          (item) => `
        <div class="settings-history__row">
          <div>
            <strong>${fmtTime(item.at)}</strong>
            <span>${item.note || "备份"}</span>
          </div>
          <button type="button" data-hist="${item.id}">恢复</button>
        </div>`
        )
        .join("");
      box.querySelectorAll("[data-hist]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            say("恢复中…");
            const cur = harvest(window.DAWN_CONTENT || {});
            DawnStore.pushHistory(cur, "恢复前备份");
            const hit = await DawnStore.getHistory(btn.dataset.hist);
            if (!hit?.data) throw new Error("找不到这条记录");
            applyContent({ ...hit.data, _source: "history" });
            say("已恢复到页面，确认无误再点「保存到网上」");
          } catch (err) {
            say(err.message || String(err));
            alert(err.message || "恢复失败");
          }
        });
      });
    } catch (err) {
      box.innerHTML = `<p class="settings-muted">${err.message || "读取失败"}</p>`;
    }
  };

  const openSettings = async () => {
    closeSettings();
    const sess = DawnStore.configured() ? await DawnStore.session() : null;
    const forceLand = document.body.classList.contains("is-force-landscape");
    const wrap = document.createElement("div");
    wrap.id = "settingsPanel";
    wrap.className = `settings-panel${forceLand ? " is-force-land" : ""}`;
    wrap.innerHTML = `
      <div class="settings-panel__card">
        <header class="settings-panel__head">
          <strong>设置</strong>
          <button type="button" id="settingsClose" aria-label="关闭">×</button>
        </header>
        <p class="settings-muted" id="settingsStatus"></p>
        <section class="settings-section" id="settingsAuth"></section>
        <section class="settings-section">
          <h3>历史记录</h3>
          <div id="settingsHistory" class="settings-history"></div>
        </section>
      </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) closeSettings();
    });
    wrap.querySelector("#settingsClose").addEventListener("click", closeSettings);

    const auth = wrap.querySelector("#settingsAuth");
    if (!DawnStore.configured()) {
      auth.innerHTML = `<p class="settings-muted">云端还没配好，暂时不能登录保存。</p>`;
    } else if (!sess) {
      auth.innerHTML = `
        <h3>登录编辑</h3>
        <form id="settingsLogin" class="settings-form">
          <input id="settingsEmail" type="email" autocomplete="username" placeholder="邮箱" required />
          <input id="settingsPass" type="password" autocomplete="current-password" placeholder="密码" required />
          <button type="submit">登录</button>
        </form>
        <a class="settings-link" href="admin.html">打开完整后台</a>`;
      auth.querySelector("#settingsLogin").addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          say("登录中…");
          await DawnStore.login(
            auth.querySelector("#settingsEmail").value.trim(),
            auth.querySelector("#settingsPass").value
          );
          location.reload();
        } catch (err) {
          say(err.message || "登录失败");
          alert(err.message || "登录失败");
        }
      });
    } else {
      auth.innerHTML = `
        <h3>编辑中</h3>
        <p class="settings-muted">已登录。点虚线框改字；拖文本框/弹窗右下角改大小；点图可换图；× 可删。改完点下方保存。</p>
        <div class="settings-actions">
          <button type="button" id="settingsSave">保存到网上</button>
          <button type="button" id="settingsLogout" class="is-ghost">退出登录</button>
        </div>
        <a class="settings-link" href="admin.html">打开完整后台（增删更方便）</a>`;
      auth.querySelector("#settingsSave").addEventListener("click", async () => {
        try {
          say("保存中…");
          const next = harvest(window.DAWN_CONTENT || {});
          await DawnStore.save(next);
          say("已发布，并留下一份历史");
          renderHistory(wrap.querySelector("#settingsHistory"));
        } catch (err) {
          say(err.message || String(err));
          alert(err.message || "保存失败");
        }
      });
      auth.querySelector("#settingsLogout").addEventListener("click", async () => {
        await DawnStore.logout();
        location.reload();
      });
    }

    renderHistory(wrap.querySelector("#settingsHistory"));
  };

  const showOwnerBar = () => {
    document.body.classList.add("is-owner");
    document.getElementById("editorBar")?.remove();
    bindListActions();
    bindOwnerLinkGuard();
    enableInline();
    window.DawnWorks?.refresh?.();
  };

  const bindMediaClicks = () => {
    document.addEventListener(
      "click",
      async (e) => {
        if (!document.body.classList.contains("is-owner")) return;
        const slot = e.target.closest("[data-edit-media]");
        if (!slot) return;
        e.preventDefault();
        e.stopPropagation();
        const file = await pickFile("image/*");
        if (!file) return;
        say("上传中…");
        try {
          const key = slot.dataset.editMedia;
          const folder = key.startsWith("boardTag:")
            ? "board"
            : key.startsWith("skill:")
              ? "skills"
              : key;
          const url = await DawnStore.upload(file, folder);
          const content = harvest(window.DAWN_CONTENT || {});
          content.contact = content.contact || {};
          if (key === "portrait") content.contact.portrait = url;
          else if (key === "wechatQr") content.contact.wechatQr = url;
          else if (key === "rednoteQr") content.contact.rednoteQr = url;
          else if (key.startsWith("boardTag:")) {
            const i = Number(key.split(":")[1]);
            content.boardTags = content.boardTags || [];
            content.boardTags[i] = content.boardTags[i] || { en: "", zh: "", image: "" };
            content.boardTags[i].image = url;
          } else if (key.startsWith("skill:")) {
            const i = Number(key.split(":")[1]);
            content.skills = content.skills || [];
            content.skills[i] = content.skills[i] || { name: "", photo: "" };
            content.skills[i].photo = url;
          }
          applyContent(content);
          say("图已换上，到设置里点「保存到网上」才会公开");
        } catch (err) {
          say(err.message || String(err));
        }
      },
      true
    );

    document.addEventListener("dawn:work-media", async (e) => {
      const { action } = e.detail || {};
      if (!document.body.classList.contains("is-owner")) {
        openSettings();
        say("请先在设置里登录，才能上传照片和视频");
        return;
      }
      const work = window.DawnWorks?.active?.();
      if (!work) return;
      try {
        if (action === "add-image") {
          const file = await pickFile("image/*");
          if (!file) return;
          say("上传图片…");
          const src = await DawnStore.upload(file, `works/${work.id}`);
          window.DawnWorks.addMedia({ kind: "image", src });
          say("已加入，到设置里保存");
        }
        if (action === "add-video") {
          const file = await pickFile("video/*");
          if (!file) return;
          say("上传视频（请小于 45MB）…");
          const src = await DawnStore.upload(file, `works/${work.id}`);
          window.DawnWorks.addMedia({ kind: "video", src });
          say("已加入，到设置里保存");
        }
        if (action === "del-slide") {
          window.DawnWorks.removeCurrent();
          say("已移除，到设置里保存");
        }
      } catch (err) {
        say(err.message || String(err));
      }
    });
  };

  const boot = async () => {
    try {
      const content = await DawnStore.load();
      window.DawnRender?.apply(content);
      document.dispatchEvent(new CustomEvent("dawn:content", { detail: content }));
    } catch (err) {
      console.warn(err);
    }

    bindMediaClicks();
    if (!window.DawnStore) return;

    document.getElementById("editorBar")?.remove();
    document.getElementById("settingsFab")?.remove();
    bindBrandMenu();

    const sess = DawnStore.configured() ? await DawnStore.session() : null;
    if (sess) showOwnerBar();

    const params = new URLSearchParams(location.search);
    if (params.get("edit") === "1" && !(await DawnStore.session())) openSettings();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
