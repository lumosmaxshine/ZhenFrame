(() => {
  const getPath = (obj, path) =>
    String(path || "")
      .split(".")
      .reduce((o, k) => {
        if (o == null) return o;
        const key = /^\d+$/.test(k) ? Number(k) : k;
        return o[key];
      }, obj);

  const setText = (sel, value) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.textContent = value ?? "";
    });
  };

  const setHref = (sel, value) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (value) el.setAttribute("href", value);
    });
  };

  const fillQr = (el, url) => {
    if (!el) return;
    if (url) {
      el.style.backgroundImage = `url("${url}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundBlendMode = "normal";
      el.classList.add("has-media");
    } else {
      el.style.backgroundImage = "";
      el.style.backgroundBlendMode = "";
      el.classList.remove("has-media");
    }
  };

  const applyBoundText = (c) => {
    document.querySelectorAll("[data-bind]").forEach((el) => {
      const path = el.dataset.bind;
      if (!path) return;
      if (path === "manifesto") {
        el.innerHTML = String(c.manifesto || "").replace(/\n/g, "<br />");
        return;
      }
      const val = getPath(c, path);
      if (val == null) return;
      const text = String(val);
      if (text.includes("\n")) {
        el.innerHTML = text.replace(/\n/g, "<br />");
      } else {
        el.textContent = text;
      }
    });
  };

  const thumbStyle = (tag, i) => {
    if (tag?.image) {
      return `style="background-image:url('${tag.image}');background-size:cover;background-position:center"`;
    }
    return "";
  };

  const applyBoxes = (c) => {
    const boxes = c.boxes || {};
    document.querySelectorAll("[data-box]").forEach((el) => {
      const size = boxes[el.dataset.box];
      if (!size) return;
      if (size.w) el.style.width = size.w;
      else el.style.removeProperty("width");
      if (size.h) el.style.height = size.h;
      else el.style.removeProperty("height");
    });
  };

  const applyBoard = (c) => {
    applyBoundText(c);
    applyBoxes(c);
    window.DawnLayout?.apply?.(c);
    setHref("[data-bind-mailto]", c.contact?.email ? `mailto:${c.contact.email}` : "#");

    fillQr(document.querySelector(".qr-block:not(.qr-block--alt)"), c.contact?.wechatQr);
    fillQr(document.querySelector(".qr-block--alt"), c.contact?.rednoteQr);
    fillQr(document.querySelector(".contact-qr"), c.contact?.wechatQr);
    fillQr(document.querySelector(".acc-card--wechat .fake-qr"), c.contact?.wechatQr);
    fillQr(document.querySelector(".acc-card--red .fake-qr"), c.contact?.rednoteQr);
    fillQr(document.querySelector(".id-photo"), c.contact?.portrait);
    fillQr(document.querySelector(".works-foot__social .fake-qr"), c.contact?.wechatQr);

    const list = document.querySelector(".work-list");
    if (list && c.boardTags?.length) {
      list.innerHTML = c.boardTags
        .map((tag, i) => {
          const imgClass = tag.image ? " has-media" : "";
          return `<li>
            <span><span data-bind="boardTags.${i}.en">${tag.en || ""}</span> <em data-bind="boardTags.${i}.zh">${tag.zh || ""}</em></span>
            <span class="thumb thumb--${i % 5}${imgClass}" data-edit-media="boardTag:${i}" title="换缩略图" ${thumbStyle(tag, i)}></span>
            <button type="button" class="list-del" data-list-del="boardTags:${i}" title="删除" hidden aria-label="删除">×</button>
          </li>`;
        })
        .join("");
    }

    const pillRows = document.querySelectorAll(".obj--badge .pill-row");
    if (pillRows.length && c.skills?.length) {
      const names = c.skills.map((s) => s.name || "");
      if (pillRows[0]) {
        pillRows[0].innerHTML = names
          .slice(0, 4)
          .map((n, i) => `<span data-bind="skills.${i}.name">${n}</span>`)
          .join("");
      }
      if (pillRows[1]) {
        pillRows[1].innerHTML = names[4] != null ? `<span data-bind="skills.4.name">${names[4]}</span>` : "";
      }
    }

    const ovals = document.querySelector(".skill-ovals");
    if (ovals && c.skills) {
      ovals.innerHTML = c.skills
        .map((s, i) => {
          const bg = s.photo
            ? `style="background-image:url('${s.photo}');background-size:cover;background-position:center"`
            : "";
          return `<figure>
            <div class="oval oval--${(i % 5) + 1}" data-edit-media="skill:${i}" ${bg}></div>
            <figcaption data-bind="skills.${i}.name">${s.name || ""}</figcaption>
            <button type="button" class="list-del" data-list-del="skills:${i}" title="删除" hidden aria-label="删除">×</button>
          </figure>`;
        })
        .join("");
    }

    const exp = document.querySelector('.resume-grid [data-list="resume.experience"]') ||
      document.querySelector(".resume-grid div:first-child ul");
    const edu = document.querySelector('.resume-grid [data-list="resume.education"]') ||
      document.querySelector(".resume-grid div:last-child ul");
    if (exp && c.resume?.experience) {
      exp.innerHTML = c.resume.experience
        .map(
          (row, i) =>
            `<li>
              <strong data-bind="resume.experience.${i}.when">${row.when || ""}</strong>
              <span data-bind="resume.experience.${i}.what">${row.what || ""}</span>
              <button type="button" class="list-del" data-list-del="resume.experience:${i}" title="删除" hidden aria-label="删除">×</button>
            </li>`
        )
        .join("");
    }
    if (edu && c.resume?.education) {
      edu.innerHTML = c.resume.education
        .map(
          (row, i) =>
            `<li>
              <strong data-bind="resume.education.${i}.when">${row.when || ""}</strong>
              <span data-bind="resume.education.${i}.what">${row.what || ""}</span>
              <button type="button" class="list-del" data-list-del="resume.education:${i}" title="删除" hidden aria-label="删除">×</button>
            </li>`
        )
        .join("");
    }

    const cv = document.querySelector(".id-link");
    if (cv && c.resume?.cvUrl) {
      cv.dataset.cv = c.resume.cvUrl;
    }

    const updates = document.querySelector(".updates-list");
    if (updates && c.updates) {
      updates.innerHTML = c.updates
        .map(
          (u, i) =>
            `<li>
              <time data-bind="updates.${i}.date">${u.date || ""}</time>
              <span data-bind="updates.${i}.text">${u.text || ""}</span>
              <button type="button" class="list-del" data-list-del="updates:${i}" title="删除" hidden aria-label="删除">×</button>
            </li>`
        )
        .join("");
    }
  };

  const applyWorksPage = (c) => {
    setText(".works-hero h1", c.worksHero?.title);
    setText(".works-hero p", c.worksHero?.desc);
    setText(".works-mail", c.contact?.email);
    setHref(".works-mail", c.contact?.email ? `mailto:${c.contact.email}` : "#");
    const city = document.querySelector(".works-foot div:nth-child(2) p:first-child");
    if (city) {
      city.textContent = `${c.contact?.cityEn || c.contact?.city || ""}${c.contact?.city ? ", China" : ""}`.replace(
        "CHANG SHA, China",
        "Changsha, China"
      );
    }
  };

  window.DawnRender = {
    apply(content) {
      window.DAWN_CONTENT = content;
      const page = document.body?.dataset.page;
      applyBoard(content);
      if (page === "works") applyWorksPage(content);
    },
  };
})();
