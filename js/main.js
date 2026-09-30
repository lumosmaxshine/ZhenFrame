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
      if (e.target.closest(".id-link") && window.DAWN_CONTENT?.resume?.cvUrl) {
        window.open(window.DAWN_CONTENT.resume.cvUrl, "_blank", "noopener");
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
})();
