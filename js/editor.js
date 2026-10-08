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
    const el = document.getElementById("editorStatus");
    if (el) el.textContent = msg || "";
  };

  const ensureBar = () => {
    if (document.getElementById("editorBar")) return document.getElementById("editorBar");
    const bar = document.createElement("div");
    bar.id = "editorBar";
    bar.className = "editor-bar";
    document.body.appendChild(bar);
    return bar;
  };

  const loginPanel = () => {
    const wrap = document.createElement("div");
    wrap.id = "editorLogin";
    wrap.className = "editor-login";
    wrap.innerHTML = `
      <form class="editor-login__card">
        <p>仅本人可改作品集</p>
        <input id="editorEmail" type="email" autocomplete="username" placeholder="邮箱" />
        <input id="editorPass" type="password" autocomplete="current-password" placeholder="密码" />
        <button type="submit">登录后直接改这个网站</button>
        <a href="admin.html">打开完整后台（手机也可用）</a>
        <button type="button" id="editorLoginClose">取消</button>
      </form>`;
    document.body.appendChild(wrap);
    wrap.querySelector("#editorLoginClose").addEventListener("click", () => wrap.remove());
    wrap.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await DawnStore.login(
          wrap.querySelector("#editorEmail").value.trim(),
          wrap.querySelector("#editorPass").value
        );
        wrap.remove();
        location.reload();
      } catch (err) {
        say(err.message || "登录失败");
        alert(err.message || "登录失败");
      }
    });
  };

  const showOwnerBar = () => {
    document.body.classList.add("is-owner");
    const bar = ensureBar();
    bar.classList.remove("editor-bar--fab");
    bar.innerHTML = `
      <button type="button" id="editorSave">保存到网上</button>
      <a href="admin.html">后台</a>
      <span id="editorStatus">点文字即可改，点头像/二维码可换图</span>
      <button type="button" id="editorLogout">退出</button>
    `;
    bar.querySelector("#editorSave").addEventListener("click", async () => {
      try {
        say("保存中…");
        const next = harvest(window.DAWN_CONTENT || {});
        await DawnStore.save(next);
        say("已发布，访客会看到新内容");
      } catch (err) {
        say(err.message || String(err));
      }
    });
    bar.querySelector("#editorLogout").addEventListener("click", async () => {
      await DawnStore.logout();
      location.reload();
    });
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
          say("图已换上，点「保存到网上」才会公开");
        } catch (err) {
          say(err.message || String(err));
        }
      },
      true
    );

    document.addEventListener("dawn:work-media", async (e) => {
      const { action } = e.detail || {};
      if (!document.body.classList.contains("is-owner")) {
        say("请先点右下角「开通编辑」登录，才能上传照片和视频");
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
          say("已加入，记得保存");
        }
        if (action === "add-video") {
          const file = await pickFile("video/*");
          if (!file) return;
          say("上传视频（请小于 45MB）…");
          const src = await DawnStore.upload(file, `works/${work.id}`);
          window.DawnWorks.addMedia({ kind: "video", src });
          say("已加入，记得保存");
        }
        if (action === "del-slide") {
          window.DawnWorks.removeCurrent();
          say("已从当前项目移除，记得保存");
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
    const bar = ensureBar();
    bar.classList.add("editor-bar--fab");
    bar.innerHTML = `<button type="button" id="editorEnter">开通编辑</button>`;
    bar.querySelector("#editorEnter").addEventListener("click", loginPanel);

    const sess = DawnStore.configured() ? await DawnStore.session() : null;
    if (sess) showOwnerBar();

    const params = new URLSearchParams(location.search);
    if (params.get("edit") === "1" && !(await DawnStore.session())) loginPanel();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
