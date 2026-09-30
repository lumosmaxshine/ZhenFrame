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
    if (p.media?.length) return p.media;
    if (p.slides?.length) return p.slides.map((color) => ({ kind: "color", color }));
    return [{ kind: "color", color: p.color || "#ccc" }];
  };

  const previewStyle = (p) => {
    const first = mediaOf(p)[0];
    if (first?.kind === "image") return `background-image:url('${first.src}');background-size:cover;background-position:center`;
    return `background:${p.color || first?.color || "#ccc"}`;
  };

  const slideHtml = (item) => {
    if (item.kind === "video") {
      return `<video class="gallery-slide gallery-slide--media" src="${item.src}" controls playsinline></video>`;
    }
    if (item.kind === "image") {
      return `<img class="gallery-slide gallery-slide--media" src="${item.src}" alt="" />`;
    }
    return `<div class="gallery-slide" style="background:${item.color || "#ccc"}"></div>`;
  };

  const thumbStyle = (item) => {
    if (item.kind === "image") return `background-image:url('${item.src}');background-size:cover`;
    if (item.kind === "video") return `background:#111`;
    return `background:${item.color || "#ccc"}`;
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
    if (!media.length) {
      galleryMain.innerHTML = `<div class="gallery-slide" style="background:${project.color || "#ccc"}"></div>`;
      galleryThumbs.innerHTML = "";
    } else {
      slideIndex = Math.min(slideIndex, media.length - 1);
      const item = media[slideIndex] || media[0];
      galleryMain.innerHTML = slideHtml(item);
      galleryThumbs.innerHTML = media
        .map(
          (m, i) =>
            `<button type="button" data-slide="${i}" class="${i === slideIndex ? "is-active" : ""}" style="${thumbStyle(m)}" aria-label="Slide ${i + 1}"></button>`
        )
        .join("");
    }
    let tools = galleryMain.parentElement.querySelector(".gallery-owner");
    if (document.body.classList.contains("is-owner")) {
      if (!tools) {
        tools = document.createElement("div");
        tools.className = "gallery-owner";
        tools.innerHTML = `
          <button type="button" data-owner="add-image">+ 图片</button>
          <button type="button" data-owner="add-video">+ 视频</button>
          <button type="button" data-owner="del-slide">删除当前</button>`;
        galleryMain.parentElement.appendChild(tools);
      }
    } else if (tools) {
      tools.remove();
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
      slideIndex = (slideIndex - 1 + media.length) % media.length;
      paintSlides(projects[activeIndex]);
    });
    document.getElementById("galleryNext")?.addEventListener("click", () => {
      const media = mediaOf(projects[activeIndex]);
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
      const current = p.media?.length ? p.media : mediaOf(p);
      const onlyColors = current.every((m) => m.kind === "color" && !m.src);
      p.media = onlyColors ? [item] : current.concat(item);
      slideIndex = p.media.length - 1;
      this.refresh();
    },
    removeCurrent() {
      const p = projects[activeIndex];
      if (!p?.media?.length) return;
      p.media.splice(slideIndex, 1);
      slideIndex = Math.max(0, slideIndex - 1);
      this.refresh();
    },
  };
})();
