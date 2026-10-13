(() => {
  const SNAP = 6;
  const GUIDE_COLOR = "#1a1a1a";

  const moveIdOf = (el) => el.dataset.moveId || el.dataset.bind || el.dataset.move || "";

  const stages = () => [...document.querySelectorAll("[data-move-stage]")];

  const itemsIn = (stage) =>
    [...stage.querySelectorAll("[data-move-id], [data-bind], [data-move-item]")].filter((el) => {
      if (el.closest("[data-move-stage]") !== stage) return false;
      if (el.id === "brandMenuBtn") return false;
      if (el.matches(".list-del, .move-handle, .modal__close, button")) return false;
      // 嵌套 data-bind：技能标题里的小 span 不单独拖，拖整块标题
      if (el.parentElement?.closest("[data-bind]")?.closest("[data-move-stage]") === stage) {
        const parentBind = el.parentElement.closest("[data-bind]");
        if (parentBind && parentBind !== el && parentBind.closest("[data-move-stage]") === stage) {
          return false;
        }
      }
      return Boolean(moveIdOf(el));
    });

  const ensureStageStyle = (stage) => {
    const cs = getComputedStyle(stage);
    if (cs.position === "static") stage.style.position = "relative";
    stage.classList.add("is-move-stage");
    if (!stage.querySelector(":scope > .align-guides")) {
      const g = document.createElement("div");
      g.className = "align-guides";
      g.setAttribute("aria-hidden", "true");
      stage.appendChild(g);
    }
  };

  const clearGuides = (stage) => {
    const g = stage.querySelector(":scope > .align-guides");
    if (g) g.innerHTML = "";
  };

  const showGuides = (stage, lines) => {
    const g = stage.querySelector(":scope > .align-guides");
    if (!g) return;
    g.innerHTML = lines
      .map((line) => {
        if (line.type === "h") {
          return `<i class="align-guide align-guide--h" style="top:${line.pos}px;background:${GUIDE_COLOR}"></i>`;
        }
        return `<i class="align-guide align-guide--v" style="left:${line.pos}px;background:${GUIDE_COLOR}"></i>`;
      })
      .join("");
  };

  const relBox = (el, stage) => {
    const er = el.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    return {
      left: er.left - sr.left,
      top: er.top - sr.top,
      right: er.right - sr.left,
      bottom: er.bottom - sr.top,
      width: er.width,
      height: er.height,
      cx: er.left - sr.left + er.width / 2,
      cy: er.top - sr.top + er.height / 2,
    };
  };

  const snapMove = (stage, el, left, top) => {
    const sr = stage.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let L = left;
    let T = top;
    const guides = [];

    const targets = [
      { l: 0, r: sr.width, t: 0, b: sr.height, cx: sr.width / 2, cy: sr.height / 2 },
    ];
    itemsIn(stage).forEach((other) => {
      if (other === el) return;
      const b = relBox(other, stage);
      targets.push(b);
    });

    const candidatesX = [];
    const candidatesY = [];
    targets.forEach((t) => {
      candidatesX.push(
        { v: t.l, guide: t.l },
        { v: t.r - w, guide: t.r },
        { v: t.cx - w / 2, guide: t.cx },
        { v: t.l - w, guide: t.l },
        { v: t.r, guide: t.r }
      );
      candidatesY.push(
        { v: t.t, guide: t.t },
        { v: t.b - h, guide: t.b },
        { v: t.cy - h / 2, guide: t.cy },
        { v: t.t - h, guide: t.t },
        { v: t.b, guide: t.b }
      );
    });

    let bestX = null;
    candidatesX.forEach((c) => {
      const d = Math.abs(L - c.v);
      if (d <= SNAP && (!bestX || d < bestX.d)) bestX = { d, v: c.v, guide: c.guide };
    });
    if (bestX) {
      L = bestX.v;
      guides.push({ type: "v", pos: bestX.guide });
    }

    let bestY = null;
    candidatesY.forEach((c) => {
      const d = Math.abs(T - c.v);
      if (d <= SNAP && (!bestY || d < bestY.d)) bestY = { d, v: c.v, guide: c.guide };
    });
    if (bestY) {
      T = bestY.v;
      guides.push({ type: "h", pos: bestY.guide });
    }

    L = Math.max(0, Math.min(L, sr.width - w));
    T = Math.max(0, Math.min(T, sr.height - h));
    return { left: L, top: T, guides };
  };

  const placeAbsolute = (el, stage, left, top) => {
    el.classList.add("is-moved");
    el.style.position = "absolute";
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.margin = "0";
    el.style.zIndex = "4";
  };

  const applyOne = (el, stage, pos) => {
    if (!pos || (pos.l == null && pos.t == null && pos.left == null && pos.top == null)) return;
    ensureStageStyle(stage);
    stage.classList.add("has-moves");
    const sr = stage.getBoundingClientRect();
    let left;
    let top;
    if (typeof pos.l === "string" && pos.l.endsWith("%")) {
      left = (parseFloat(pos.l) / 100) * sr.width;
    } else {
      left = parseFloat(pos.left ?? pos.l) || 0;
    }
    if (typeof pos.t === "string" && pos.t.endsWith("%")) {
      top = (parseFloat(pos.t) / 100) * sr.height;
    } else {
      top = parseFloat(pos.top ?? pos.t) || 0;
    }
    placeAbsolute(el, stage, left, top);
  };

  const apply = (content) => {
    const moves = content?.moves || {};
    stages().forEach((stage) => {
      ensureStageStyle(stage);
      const has = itemsIn(stage).some((el) => moves[moveIdOf(el)]);
      if (has) stage.classList.add("has-moves");
      itemsIn(stage).forEach((el) => {
        const id = moveIdOf(el);
        if (!id) return;
        if (!el.dataset.moveId) el.dataset.moveId = id;
        applyOne(el, stage, moves[id]);
      });
    });
  };

  const harvest = (content) => {
    content.moves = content.moves || {};
    stages().forEach((stage) => {
      const sw = stage.clientWidth || 1;
      const sh = stage.clientHeight || 1;
      itemsIn(stage).forEach((el) => {
        const id = moveIdOf(el);
        if (!id || !el.classList.contains("is-moved")) return;
        const left = el.offsetLeft;
        const top = el.offsetTop;
        content.moves[id] = {
          l: `${((left / sw) * 100).toFixed(2)}%`,
          t: `${((top / sh) * 100).toFixed(2)}%`,
        };
      });
    });
    return content;
  };

  const attachHandle = (el) => {
    if (el.querySelector(":scope > .move-handle")) return;
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "move-handle";
    handle.title = "拖这里移动位置";
    handle.setAttribute("aria-label", "移动");
    handle.textContent = "✥";
    el.classList.add("is-movable");
    el.appendChild(handle);

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const stage = el.closest("[data-move-stage]");
      if (!stage) return;
      ensureStageStyle(stage);
      stage.classList.add("has-moves");

      // 第一次拖：从当前位置改为绝对定位
      if (!el.classList.contains("is-moved")) {
        const box = relBox(el, stage);
        placeAbsolute(el, stage, box.left, box.top);
      }

      const startX = e.clientX;
      const startY = e.clientY;
      const origL = el.offsetLeft;
      const origT = el.offsetTop;
      el.classList.add("is-dragging");

      const onMove = (ev) => {
        const rawL = origL + (ev.clientX - startX);
        const rawT = origT + (ev.clientY - startY);
        const snapped = snapMove(stage, el, rawL, rawT);
        placeAbsolute(el, stage, snapped.left, snapped.top);
        showGuides(stage, snapped.guides);
      };
      const onUp = () => {
        el.classList.remove("is-dragging");
        clearGuides(stage);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        window.DAWN_CONTENT = window.DAWN_CONTENT || {};
        harvest(window.DAWN_CONTENT);
        const say = document.getElementById("settingsStatus");
        if (say) say.textContent = "位置已记下，到设置里点「保存到网上」才会公开";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  };

  const enable = () => {
    if (!document.body.classList.contains("is-owner")) return;
    stages().forEach((stage) => {
      ensureStageStyle(stage);
      // pill 行在自由排版时摊平，方便单独拖每颗标签
      stage.querySelectorAll(".pill-row").forEach((row) => row.classList.add("pill-row--free"));
      itemsIn(stage).forEach((el) => {
        if (!el.dataset.moveId) el.dataset.moveId = moveIdOf(el);
        attachHandle(el);
      });
      // 技能弹窗里整块 figure 可拖
      stage.querySelectorAll(".skill-ovals > figure").forEach((fig, i) => {
        if (!fig.dataset.moveId) fig.dataset.moveId = `skillFigure.${i}`;
        fig.dataset.moveItem = "1";
        attachHandle(fig);
      });
    });
  };

  window.DawnLayout = { apply, enable, harvest };
})();
