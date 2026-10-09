(() => {
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
    const work = window.DawnWorks?.active?.();
    if (work) {
      document.querySelectorAll("[data-work-field]").forEach((el) => {
        work[el.dataset.workField] = el.innerText.trim();
      });
    }
    if (window.DawnWorks?.list) content.works = window.DawnWorks.list();
    return content;
  };

  const enableInline = () => {
    document.querySelectorAll("[data-bind], [data-work-field]").forEach((el) => {
      if (el.id === "brandMenuBtn") return;
      el.contentEditable = "true";
      el.classList.add("is-editable");
      el.addEventListener("mousedown", (e) => e.stopPropagation());
      el.addEventListener("click", (e) => e.stopPropagation());
    });
    document.querySelectorAll("[data-edit-media]").forEach((el) => {
      el.classList.add("is-swappable");
    });
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
    if (menu) menu.hidden = true;
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

    const rect = btn.getBoundingClientRect();
    menu.hidden = false;
    menu.dataset.open = "1";
    menu.style.left = `${Math.min(rect.left, window.innerWidth - 240)}px`;
    menu.style.top = `${rect.bottom + 8}px`;
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
    const wrap = document.createElement("div");
    wrap.id = "settingsPanel";
    wrap.className = "settings-panel";
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
        <p class="settings-muted">已登录。点页面文字可改，点头像/二维码可换图。</p>
        <div class="settings-actions">
          <button type="button" id="settingsSave">保存到网上</button>
          <button type="button" id="settingsLogout" class="is-ghost">退出登录</button>
        </div>
        <a class="settings-link" href="admin.html">打开完整后台</a>`;
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
    // 不再用右下角大按钮；编辑入口在设置里
    document.getElementById("editorBar")?.remove();
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
          const url = await DawnStore.upload(file, slot.dataset.editMedia);
          const key = slot.dataset.editMedia;
          window.DAWN_CONTENT.contact = window.DAWN_CONTENT.contact || {};
          if (key === "portrait") window.DAWN_CONTENT.contact.portrait = url;
          if (key === "wechatQr") window.DAWN_CONTENT.contact.wechatQr = url;
          if (key === "rednoteQr") window.DAWN_CONTENT.contact.rednoteQr = url;
          window.DawnRender?.apply(window.DAWN_CONTENT);
          enableInline();
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
