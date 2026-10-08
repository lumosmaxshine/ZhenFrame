(() => {
  const loader = document.getElementById("loader");
  const pctEl = document.getElementById("loaderPct");

  if (loader && pctEl) {
    let n = 0;
    const tick = () => {
      n += Math.random() * 18 + 8;
      if (n >= 100) {
        n = 100;
        pctEl.textContent = "100%";
        requestAnimationFrame(() => {
          loader.classList.add("is-done");
          setTimeout(() => loader.remove(), 600);
        });
        return;
      }
      pctEl.textContent = `${Math.floor(n)}%`;
      setTimeout(tick, 70 + Math.random() * 60);
    };
    tick();
  }

  const isCompact = () => window.matchMedia("(max-width: 980px)").matches;

  const fitStage = () => {
    const stage = document.getElementById("stage");
    const shell = document.getElementById("stageShell");
    const hint = document.getElementById("rotateHint");
    if (!stage) return;
    if (hint) hint.hidden = true;
    if (!isCompact()) {
      stage.style.cssText = "";
      if (shell) shell.style.cssText = "";
      document.body.classList.remove("is-force-landscape");
      return;
    }
    const designW = 1200;
    const designH = 800;
    const forceLand = document.body.classList.contains("is-force-landscape");
    const nativeLand = window.matchMedia("(orientation: landscape)").matches;
    const landscape = forceLand || nativeLand;
    const padX = landscape ? 4 : 12;
    const padY = landscape ? 4 : 10;
    const fabH = landscape ? 8 : 56;
    let availW = Math.max(280, window.innerWidth - padX * 2);
    let availH = Math.max(220, window.innerHeight - padY * 2 - fabH);

    // 竖屏点「横屏模式」时：按横屏可用区域计算，再整体旋转铺满
    if (forceLand && !nativeLand) {
      availW = Math.max(280, window.innerHeight - padY * 2 - fabH);
      availH = Math.max(220, window.innerWidth - padX * 2);
    }

    // 横屏：铺满屏幕（可略裁边）；竖屏：完整放入
    const scale = landscape
      ? Math.max(availW / designW, availH / designH)
      : Math.min(availW / designW, availH / designH);
    const showW = Math.floor(designW * scale);
    const showH = Math.floor(designH * scale);
    const frameW = landscape ? Math.floor(availW) : showW;
    const frameH = landscape ? Math.floor(availH) : showH;
    const offsetX = Math.floor((frameW - showW) / 2);
    const offsetY = Math.floor((frameH - showH) / 2);

    stage.style.width = `${designW}px`;
    stage.style.minWidth = `${designW}px`;
    stage.style.height = `${designH}px`;
    stage.style.minHeight = `${designH}px`;
    stage.style.transformOrigin = "top left";
    stage.style.transform = `scale(${scale})`;
    stage.style.position = "absolute";
    stage.style.left = `${offsetX}px`;
    stage.style.top = `${offsetY}px`;

    if (shell) {
      shell.style.display = "block";
      shell.style.position = "relative";
      shell.style.width = `${frameW}px`;
      shell.style.height = `${frameH}px`;
      shell.style.margin = "0 auto";
      shell.style.overflow = "hidden";
      shell.style.flex = "0 0 auto";
    }
  };

  const layoutBoard = () => {
    fitStage();
    const board = document.getElementById("board");
    if (!board) return;
    const sample = board.querySelector(".obj");
    if (!sample || getComputedStyle(sample).position !== "absolute") return;
    const grid = 26;
    const W = board.clientWidth;
    const H = board.clientHeight;
    if (W < 200 || H < 200) return;
    board.querySelectorAll(".obj").forEach((el) => {
      const px = Number(el.dataset.px);
      const py = Number(el.dataset.py);
      if (Number.isNaN(px) || Number.isNaN(py)) return;
      const w = el.offsetWidth || parseFloat(getComputedStyle(el).getPropertyValue("--w")) || 120;
      const h = el.offsetHeight || 160;
      let col = Math.round((px * W) / grid) + Number(el.dataset.dcol || 0);
      let row = Math.round((py * H) / grid) + Number(el.dataset.drow || 0);
      const minCol = Math.max(1, Math.round((w / 2) / grid));
      const maxCol = Math.max(minCol, Math.round((W - w / 2) / grid) - 1);
      const minRow = 1;
      const maxRow = Math.max(1, Math.round((H - h - 8) / grid));
      col = Math.min(Math.max(col, minCol), maxCol);
      row = Math.min(Math.max(row, minRow), maxRow);
      el.style.left = `${col * grid + grid / 2 - w / 2}px`;
      el.style.top = `${row * grid + grid / 2 - 7}px`;
    });
  };

  window.layoutBoard = layoutBoard;
  layoutBoard();
  requestAnimationFrame(layoutBoard);
  window.addEventListener("load", layoutBoard);
  window.addEventListener("resize", layoutBoard);
  window.addEventListener("orientationchange", () => setTimeout(layoutBoard, 120));
  setTimeout(layoutBoard, 80);
  setTimeout(layoutBoard, 400);

  const openModal = (id) => {
    const el = document.getElementById(`modal-${id}`);
    if (!el) return;
    el.hidden = false;
    document.body.style.overflow = "hidden";
  };

  const closeModal = (el) => {
    if (!el) return;
    el.hidden = true;
    if (![...document.querySelectorAll(".modal")].some((m) => !m.hidden)) {
      document.body.style.overflow = "";
    }
  };

  document.querySelectorAll("[data-modal]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (e.target.closest("[data-lightbox], .id-link, .contact-qr, .id-photo")) {
        if (e.target.closest(".id-link") && window.DAWN_CONTENT?.resume?.cvUrl) {
          window.open(window.DAWN_CONTENT.resume.cvUrl, "_blank", "noopener");
        }
        return;
      }
      openModal(btn.dataset.modal);
    });
  });

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.querySelectorAll("[data-close]").forEach((node) => {
      node.addEventListener("click", () => closeModal(modal));
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const light = document.getElementById("qrLightbox");
    if (light && !light.hidden) {
      light.hidden = true;
      return;
    }
    document.querySelectorAll(".modal").forEach((m) => {
      if (!m.hidden) closeModal(m);
    });
  });

  document.querySelectorAll(".obj").forEach((el) => {
    el.addEventListener("click", () => {
      el.classList.remove("is-gust");
      void el.offsetWidth;
      el.classList.add("is-gust");
      setTimeout(() => el.classList.remove("is-gust"), 1100);
    });
  });

  const accordion = document.getElementById("contactAccordion");
  if (accordion) {
    accordion.querySelectorAll("[data-acc]").forEach((card) => {
      card.addEventListener("click", () => {
        accordion.querySelectorAll(".acc-card").forEach((c) => c.classList.remove("is-open"));
        card.classList.add("is-open");
      });
    });
  }

  const lightbox = document.getElementById("qrLightbox");
  const lightboxImg = document.getElementById("qrLightboxImg");
  const openLightbox = (url) => {
    if (!lightbox || !lightboxImg || !url) return;
    lightboxImg.src = url;
    lightbox.hidden = false;
  };
  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.hidden = true;
    if (lightboxImg) lightboxImg.removeAttribute("src");
  };

  document.querySelectorAll("[data-close-lightbox]").forEach((el) => {
    el.addEventListener("click", closeLightbox);
  });

  document.addEventListener(
    "click",
    (e) => {
      const slot = e.target.closest("[data-lightbox='qr']");
      if (!slot) return;
      if (document.body.classList.contains("is-owner")) return;
      e.preventDefault();
      e.stopPropagation();
      const url =
        slot.style.backgroundImage?.match(/url\(["']?(.*?)["']?\)/)?.[1] ||
        window.DAWN_CONTENT?.contact?.wechatQr ||
        "";
      if (!url) {
        openModal("contact");
        return;
      }
      openLightbox(url);
    },
    true
  );
})();
