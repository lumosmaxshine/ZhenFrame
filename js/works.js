(() => {
  const list = document.getElementById("worksList");
  if (!list) return;

  let projects = [];
  let activeIndex = 0;
  let slideIndex = 0;
  let bound = false;

  const modal = document.getElementById("modal-project");
  const galleryMain = document.getElementById("galleryMain");
  const galleryThumbs = document.getElementById("galleryThumbs");
  const projectSide = document.getElementById("projectSide");
  const projMeta = document.getElementById("projMeta");
  const projTitle = document.getElementById("projTitle");
  const projName = document.getElementById("projName");
  const projYear = document.getElementById("projYear");
  const projDesc = document.getElementById("projDesc");

  const mediaOf = (p) => {
    const list = p?.media || [];
    const real = list.filter((m) => (m.kind === "image" || m.kind === "video") && m.src);
    return real;
  };

  const previewStyle = (p) => {
    const first = mediaOf(p)[0];
    if (first?.kind === "image") return `background-image:url('${first.src}');background-size:cover;background-position:center`;
    if (first?.kind === "video") return `background:#1a1a1a`;
    return `background:${p.color || "#d8d2c6"}`;
  };

  const slideHtml = (item) => {
    if (item.kind === "video") {
      return `<video class="gallery-slide gallery-slide--media" src="${item.src}" controls playsinline></video>`;
    }
    return `<img class="gallery-slide gallery-slide--media" src="${item.src}" alt="" />`;
  };

  const emptyHtml = () => {
    const owner = document.body.classList.contains("is-owner");
    return `
      <div class="gallery-empty">
        <p>还没有照片或视频</p>
        <p>${owner ? "点下面的按钮，把作品图或短视频加进来" : "登录后可以在这里上传照片和视频"}</p>
      </div>`;
  };

  const thumbStyle = (item) => {
    if (item.kind === "image") return `background-image:url('${item.src}');background-size:cover;background-position:center`;
    return `background:#111`;
  };

  const renderList = () => {
    list.innerHTML = projects
      .map(
        (p, i) => `
      <button class="work-row" type="button" data-index="${i}">
        <span class="work-row__year">${p.year || ""}</span>
        <span class="work-row__name">${p.name || ""}</span>
        <span class="work-row__cat">${p.category || ""}</span>
        <span class="work-row__type">${p.type || ""}</span>
        <span class="work-row__preview" style="${previewStyle(p)}" aria-hidden="true"></span>
      </button>`
      )
      .join("");
  };

  const paintSlides = (project) => {
    const media = mediaOf(project);
    const ownerBar = document.getElementById("galleryOwner");
    const delBtn = document.getElementById("galleryDel");
    if (ownerBar) ownerBar.hidden = false;
    if (!media.length) {
      galleryMain.innerHTML = emptyHtml();
      galleryThumbs.innerHTML = "";
      if (delBtn) delBtn.hidden = true;
    } else {
      slideIndex = Math.min(slideIndex, media.length - 1);
      const item = media[slideIndex] || media[0];
      galleryMain.innerHTML = slideHtml(item);
      galleryThumbs.innerHTML = media
        .map(
          (m, i) =>
            `<button type="button" data-slide="${i}" class="${i === slideIndex ? "is-active" : ""} ${m.kind === "video" ? "is-video" : ""}" style="${thumbStyle(m)}" aria-label="${m.kind === "video" ? "视频" : "图片"} ${i + 1}"></button>`
        )
        .join("");
      if (delBtn) delBtn.hidden = false;
    }
  };

  const openProject = (index) => {
    if (!projects.length) return;
    activeIndex = (index + projects.length) % projects.length;
    slideIndex = 0;
    const p = projects[activeIndex];
    projMeta.textContent = `${p.year || ""} / PROJECT`;
    projTitle.textContent = p.name || "";
    projName.textContent = p.name || "";
    projYear.textContent = p.year || "";
    projDesc.textContent = p.desc || "";
    projectSide.classList.toggle("is-alt", p.side === "alt");
    projectSide.style.background = p.side === "alt" ? "#2f3e46" : p.color || "#c45c4a";
    paintSlides(p);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (document.body.classList.contains("is-owner")) {
      document.querySelectorAll("[data-work-field]").forEach((el) => {
        el.contentEditable = "true";
        el.classList.add("is-editable");
      });
    }
  };

  const bindOnce = () => {
    if (bound) return;
    bound = true;
    list.addEventListener("click", (e) => {
      const row = e.target.closest("[data-index]");
      if (!row) return;
      openProject(Number(row.dataset.index));
    });
    document.getElementById("galleryPrev")?.addEventListener("click", () => {
      const media = mediaOf(projects[activeIndex]);
      if (!media.length) return;
      slideIndex = (slideIndex - 1 + media.length) % media.length;
      paintSlides(projects[activeIndex]);
    });
    document.getElementById("galleryNext")?.addEventListener("click", () => {
      const media = mediaOf(projects[activeIndex]);
      if (!media.length) return;
      slideIndex = (slideIndex + 1) % media.length;
      paintSlides(projects[activeIndex]);
    });
    galleryThumbs?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-slide]");
      if (!btn) return;
      slideIndex = Number(btn.dataset.slide);
      paintSlides(projects[activeIndex]);
    });
    document.getElementById("projPrev")?.addEventListener("click", () => openProject(activeIndex - 1));
    document.getElementById("projNext")?.addEventListener("click", () => openProject(activeIndex + 1));
    modal?.addEventListener("click", (e) => {
      const act = e.target.closest("[data-owner]")?.dataset.owner;
      if (!act) return;
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent("dawn:work-media", { detail: { action: act } }));
    });
  };

  const start = (works) => {
    projects = works || [];
    bindOnce();
    renderList();
  };

  document.addEventListener("dawn:content", (e) => start(e.detail.works));
  if (window.DAWN_CONTENT?.works) start(window.DAWN_CONTENT.works);

  window.DawnWorks = {
    list: () => projects,
    active: () => projects[activeIndex],
    activeIndex: () => activeIndex,
    slideIndex: () => slideIndex,
    refresh() {
      renderList();
      if (modal && !modal.hidden && projects[activeIndex]) {
        const p = projects[activeIndex];
        projMeta.textContent = `${p.year || ""} / PROJECT`;
        projTitle.textContent = p.name || "";
        projName.textContent = p.name || "";
        projYear.textContent = p.year || "";
        projDesc.textContent = p.desc || "";
        paintSlides(p);
      }
    },
    addMedia(item) {
      const p = projects[activeIndex];
      if (!p) return;
      const current = mediaOf(p);
      p.media = current.concat(item);
      slideIndex = p.media.length - 1;
      this.refresh();
    },
    removeCurrent() {
      const p = projects[activeIndex];
      if (!p) return;
      p.media = mediaOf(p);
      if (!p.media.length) return;
      p.media.splice(slideIndex, 1);
      slideIndex = Math.max(0, slideIndex - 1);
      this.refresh();
    },
  };
})();
