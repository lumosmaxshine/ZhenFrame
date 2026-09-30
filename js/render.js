(() => {
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
      el.classList.add("has-media");
    } else {
      el.style.backgroundImage = "";
      el.classList.remove("has-media");
    }
  };

  const applyBoard = (c) => {
    setText("[data-bind='brand']", c.brand);
    setText("[data-bind='tagline']", c.tagline);
    const manifesto = document.querySelector("[data-bind='manifesto']");
    if (manifesto) manifesto.innerHTML = String(c.manifesto || "").replace(/\n/g, "<br />");
    setText("[data-bind='cta']", c.cta);
    setText("[data-bind='about.zh']", c.about?.zh);
    setText("[data-bind='about.en']", c.about?.en);
    setText("[data-bind='contact.email']", c.contact?.email);
    setText("[data-bind='contact.phone']", c.contact?.phone);
    setText("[data-bind='updatesTitle']", c.updatesTitle);
    setText("[data-bind='updatesBlurb']", c.updatesBlurb);
    setHref("[data-bind-mailto]", c.contact?.email ? `mailto:${c.contact.email}` : "#");

    const city = document.querySelector("[data-bind='contact.city']");
    if (city) city.textContent = c.contact?.city || "";
    const cityEn = document.querySelector("[data-bind='contact.cityEn']");
    if (cityEn) cityEn.textContent = c.contact?.cityEn || "";

    fillQr(document.querySelector(".qr-block:not(.qr-block--alt)"), c.contact?.wechatQr);
    fillQr(document.querySelector(".qr-block--alt"), c.contact?.rednoteQr);
    fillQr(document.querySelector(".acc-card--wechat .fake-qr"), c.contact?.wechatQr);
    fillQr(document.querySelector(".acc-card--red .fake-qr"), c.contact?.rednoteQr);
    fillQr(document.querySelector(".id-photo"), c.contact?.portrait);
    fillQr(document.querySelector(".works-foot__social .fake-qr"), c.contact?.wechatQr);

    const list = document.querySelector(".work-list");
    if (list && c.boardTags) {
      list.innerHTML = c.boardTags
        .map(
          (tag, i) =>
            `<li><span>${String(i + 1).padStart(2, "0")} ${tag.en} <em>${tag.zh || ""}</em></span><span class="thumb thumb--${i % 5}"></span></li>`
        )
        .join("");
    }

    const pills = document.querySelector(".obj--badge .pill-row");
    const pills2 = document.querySelector(".pill-row--solo");
    if (pills && c.skills?.length) {
      const names = c.skills.map((s) => s.name);
      pills.innerHTML = names.slice(0, 4).map((n) => `<span>${n}</span>`).join("");
      if (pills2) {
        pills2.innerHTML = names[4] ? `<span>${names[4]}</span>` : "";
      }
    }

    const ovals = document.querySelector(".skill-ovals");
    if (ovals && c.skills) {
      ovals.innerHTML = c.skills
        .map((s, i) => {
          const bg = s.photo ? `style="background-image:url('${s.photo}');background-size:cover;background-position:center"` : "";
          return `<figure><div class="oval oval--${(i % 5) + 1}" ${bg}></div><figcaption>${s.name}</figcaption></figure>`;
        })
        .join("");
    }

    const exp = document.querySelector(".resume-grid div:first-child ul");
    const edu = document.querySelector(".resume-grid div:last-child ul");
    if (exp && c.resume?.experience) {
      exp.innerHTML = c.resume.experience.map((row) => `<li><strong>${row.when}</strong> ${row.what}</li>`).join("");
    }
    if (edu && c.resume?.education) {
      edu.innerHTML = c.resume.education.map((row) => `<li><strong>${row.when}</strong> ${row.what}</li>`).join("");
    }
    setText(".resume-note", c.resume?.note || "");
    const cv = document.querySelector(".id-link");
    if (cv && c.resume?.cvUrl) {
      cv.closest("button, a") || cv;
      cv.dataset.cv = c.resume.cvUrl;
    }

    const updates = document.querySelector(".updates-list");
    if (updates && c.updates) {
      updates.innerHTML = c.updates.map((u) => `<li><time>${u.date}</time><span>${u.text}</span></li>`).join("");
    }

    const contactLines = document.querySelector(".contact-lines");
    if (contactLines) {
      contactLines.innerHTML = `<span>${c.contact?.email || ""}</span><span>${c.contact?.phone || ""}</span><span>${c.contact?.cityEn || c.contact?.city || ""}</span>`;
    }
  };

  const applyWorksPage = (c) => {
    setText(".works-hero h1", c.worksHero?.title);
    setText(".works-hero p", c.worksHero?.desc);
    setText(".works-mail", c.contact?.email);
    setHref(".works-mail", c.contact?.email ? `mailto:${c.contact.email}` : "#");
    const city = document.querySelector(".works-foot div:nth-child(2) p:first-child");
    if (city) city.textContent = `${c.contact?.cityEn || c.contact?.city || ""}${c.contact?.city ? ", China" : ""}`.replace("CHANG SHA, China", "Changsha, China");
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
