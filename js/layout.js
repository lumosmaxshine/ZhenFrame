(() => {
  const SNAP = 8;
  const GUIDE_COLOR = "#1a1a1a";
  /** @type {WeakMap<Element, Set<Element>>} */
  const selectedByStage = new WeakMap();

  const moveIdOf = (el) => el.dataset.moveId || el.dataset.bind || el.dataset.move || "";

  const stages = () => [...document.querySelectorAll("[data-move-stage]")];

  const getSelected = (stage) => {
    if (!selectedByStage.has(stage)) selectedByStage.set(stage, new Set());
    return selectedByStage.get(stage);
  };

  const itemsIn = (stage) =>
    [...stage.querySelectorAll("[data-move-id], [data-bind], [data-move-item]")].filter((el) => {
      if (el.closest("[data-move-stage]") !== stage) return false;
      if (el.id === "brandMenuBtn") return false;
      if (
        el.matches(
          ".list-del, .move-handle, .modal__close, button, .marquee-box, .group-move-handle, .align-guides, .align-guide, .group-select-chrome"
        )
      ) {
        return false;
      }
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

  const lockStageSize = (stage) => {
    if (stage.dataset.sizeLocked === "1") return;
    const h = Math.max(stage.getBoundingClientRect().height, 140);
    stage.style.minHeight = `${Math.ceil(h)}px`;
    stage.dataset.sizeLocked = "1";
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

  const nearResizeCorner = (e, el) => {
    const box = el.closest("[data-box]") || (el.matches?.("[data-box]") ? el : null);
    if (!box) return false;
    const r = box.getBoundingClientRect();
    return e.clientX >= r.right - 28 && e.clientY >= r.bottom - 28;
  };

  const snapMove = (stage, el, left, top, ignoreEls = []) => {
    const ignore = new Set(ignoreEls);
    const sr = stage.getBoundingClientRect();
    const w = el.offsetWidth || el.getBoundingClientRect().width;
    const h = el.offsetHeight || el.getBoundingClientRect().height;
    let L = left;
    let T = top;
    const guides = [];

    const targets = [{ l: 0, r: sr.width, t: 0, b: sr.height, cx: sr.width / 2, cy: sr.height / 2 }];
    itemsIn(stage).forEach((other) => {
      if (other === el || ignore.has(other)) return;
      targets.push(relBox(other, stage));
    });

    const candidatesX = [];
    const candidatesY = [];
    targets.forEach((t) => {
      candidatesX.push(
        { v: t.l, guide: t.l },
        { v: t.r - w, guide: t.r },
        { v: t.cx - w / 2, guide: t.cx }
      );
      candidatesY.push(
        { v: t.t, guide: t.t },
        { v: t.b - h, guide: t.b },
        { v: t.cy - h / 2, guide: t.cy }
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

    // 只软限制，避免把内容挤没；舞台不够高时自动加高
    if (T + h > sr.height - 4) {
      stage.style.minHeight = `${Math.ceil(T + h + 16)}px`;
    }
    L = Math.max(-8, Math.min(L, Math.max(8, sr.width - w * 0.3)));
    T = Math.max(-8, T);
    return { left: L, top: T, guides };
  };

  const placeAbsolute = (el, stage, left, top, size) => {
    lockStageSize(stage);
    stage.classList.add("has-moves");
    stage.querySelectorAll(".pill-row").forEach((row) => row.classList.add("pill-row--free"));
    const already = el.classList.contains("is-moved");
    // 已移动过的元素：移动时只改位置，保留用户拖大的宽高，避免内容被挤没
    const box = size || (already ? null : relBox(el, stage));
    el.classList.add("is-moved");
    el.style.position = "absolute";
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.margin = "0";
    el.style.zIndex = "4";
    if (box && box.width > 0) {
      el.style.width = `${Math.ceil(box.width)}px`;
      el.dataset.moveW = String(Math.ceil(box.width));
    } else if (!already && el.dataset.moveW) {
      el.style.width = `${el.dataset.moveW}px`;
    }
    if (box && box.height > 0) {
      const h = Math.ceil(box.height);
      el.style.height = `${h}px`;
      el.style.minHeight = `${h}px`;
      el.dataset.moveH = String(h);
    } else if (!already && el.dataset.moveH) {
      el.style.height = `${el.dataset.moveH}px`;
      el.style.minHeight = `${el.dataset.moveH}px`;
    }
  };

  const ensureAbsolute = (el, stage) => {
    if (el.classList.contains("is-moved")) return;
    const box = relBox(el, stage);
    placeAbsolute(el, stage, box.left, box.top, box);
  };

  const applyOne = (el, stage, pos) => {
    if (!pos || (pos.l == null && pos.t == null && pos.left == null && pos.top == null)) return;
    ensureStageStyle(stage);
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
    if (pos.w) el.dataset.moveW = String(parseFloat(pos.w) || "");
    if (pos.h) el.dataset.moveH = String(parseFloat(pos.h) || "");
    placeAbsolute(el, stage, left, top, {
      width: parseFloat(pos.w) || 0,
      height: parseFloat(pos.h) || 0,
    });
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
        const w = String(Math.round(el.offsetWidth || 0) || el.dataset.moveW || "");
        const h = String(Math.round(el.offsetHeight || 0) || el.dataset.moveH || "");
        if (w) el.dataset.moveW = w;
        if (h) el.dataset.moveH = h;
        content.moves[id] = {
          l: `${((el.offsetLeft / sw) * 100).toFixed(2)}%`,
          t: `${((el.offsetTop / sh) * 100).toFixed(2)}%`,
          w,
          h,
        };
      });
    });
    return content;
  };

  const noteSaved = () => {
    window.DAWN_CONTENT = window.DAWN_CONTENT || {};
    harvest(window.DAWN_CONTENT);
    window.DawnHistory?.push?.(window.DAWN_CONTENT);
    const say = document.getElementById("settingsStatus");
    if (say) say.textContent = "位置已记下，到设置里点「保存到网上」才会公开";
  };

  const updateGroupChrome = (stage) => {
    let chrome = stage.querySelector(":scope > .group-select-chrome");
    const selected = [...getSelected(stage)].filter((el) => stage.contains(el));
    selected.forEach((el) => el.classList.add("is-multi-selected"));
    itemsIn(stage).forEach((el) => {
      if (!getSelected(stage).has(el)) el.classList.remove("is-multi-selected");
    });

    if (selected.length < 2) {
      chrome?.remove();
      return;
    }

    if (!chrome) {
      chrome = document.createElement("div");
      chrome.className = "group-select-chrome";
      chrome.innerHTML = `<button type="button" class="group-move-handle" title="拖这里一起移动" aria-label="一起移动">✥</button>`;
      stage.appendChild(chrome);
      chrome.querySelector(".group-move-handle").addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        startGroupDrag(stage, e);
      });
    }

    let minL = Infinity;
    let minT = Infinity;
    let maxR = -Infinity;
    let maxB = -Infinity;
    selected.forEach((el) => {
      ensureAbsolute(el, stage);
      const b = relBox(el, stage);
      minL = Math.min(minL, b.left);
      minT = Math.min(minT, b.top);
      maxR = Math.max(maxR, b.right);
      maxB = Math.max(maxB, b.bottom);
    });
    chrome.style.left = `${minL}px`;
    chrome.style.top = `${minT}px`;
    chrome.style.width = `${maxR - minL}px`;
    chrome.style.height = `${maxB - minT}px`;
  };

  const clearSelection = (stage) => {
    getSelected(stage).clear();
    stage.querySelectorAll(".is-multi-selected").forEach((el) => el.classList.remove("is-multi-selected"));
    stage.querySelector(":scope > .group-select-chrome")?.remove();
  };

  const setSelection = (stage, els, { additive = false } = {}) => {
    const set = getSelected(stage);
    if (!additive) clearSelection(stage);
    els.forEach((el) => set.add(el));
    updateGroupChrome(stage);
  };

  const toggleSelection = (stage, el) => {
    const set = getSelected(stage);
    if (set.has(el)) set.delete(el);
    else set.add(el);
    updateGroupChrome(stage);
  };

  const startGroupDrag = (stage, e, leadEl = null) => {
    ensureStageStyle(stage);
    const selected = [...getSelected(stage)].filter((el) => stage.contains(el));
    if (!selected.length && leadEl) selected.push(leadEl);
    if (!selected.length) return;

    selected.forEach((el) => ensureAbsolute(el, stage));
    const startX = e.clientX;
    const startY = e.clientY;
    const origins = selected.map((el) => ({ el, l: el.offsetLeft, t: el.offsetTop }));
    selected.forEach((el) => el.classList.add("is-dragging"));

    const onMove = (ev) => {
      let guides = [];
      const { el, l, t } = origins[0];
      const snapped = snapMove(stage, el, l + (ev.clientX - startX), t + (ev.clientY - startY), selected);
      const odx = snapped.left - l;
      const ody = snapped.top - t;
      origins.forEach(({ el: other, l: ol, t: ot }) => {
        placeAbsolute(other, stage, ol + odx, ot + ody);
      });
      guides = snapped.guides;
      showGuides(stage, guides);
      updateGroupChrome(stage);
    };

    const onUp = () => {
      selected.forEach((el) => el.classList.remove("is-dragging"));
      clearGuides(stage);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      updateGroupChrome(stage);
      noteSaved();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const attachHandle = (el) => {
    if (el.querySelector(":scope > .move-handle")) return;
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "move-handle";
    handle.title = "拖这里移动；Ctrl 点击多选；Alt+拖空白处框选";
    handle.setAttribute("aria-label", "移动");
    handle.textContent = "✥";
    el.classList.add("is-movable");
    el.appendChild(handle);

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const stage = el.closest("[data-move-stage]");
      if (!stage) return;

      if (e.ctrlKey || e.metaKey) {
        toggleSelection(stage, el);
        return;
      }

      const set = getSelected(stage);
      if (!set.has(el)) setSelection(stage, [el]);

      if (set.size > 1 && set.has(el)) {
        startGroupDrag(stage, e, el);
        return;
      }

      ensureStageStyle(stage);
      ensureAbsolute(el, stage);

      const startX = e.clientX;
      const startY = e.clientY;
      const origL = el.offsetLeft;
      const origT = el.offsetTop;
      el.classList.add("is-dragging");

      const onMove = (ev) => {
        const snapped = snapMove(stage, el, origL + (ev.clientX - startX), origT + (ev.clientY - startY));
        placeAbsolute(el, stage, snapped.left, snapped.top);
        showGuides(stage, snapped.guides);
      };
      const onUp = () => {
        el.classList.remove("is-dragging");
        clearGuides(stage);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        noteSaved();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  };

  const attachMarquee = (stage) => {
    if (stage.dataset.marqueeBound === "1") return;
    stage.dataset.marqueeBound = "1";

    stage.addEventListener("mousedown", (e) => {
      if (!document.body.classList.contains("is-owner")) return;
      if (e.button !== 0) return;
      // 右下角留给改大小，不要抢
      if (nearResizeCorner(e, stage)) return;
      if (
        e.target.closest(
          ".move-handle, .group-move-handle, [contenteditable='true'], .is-editable, [data-edit-media], .list-del, button, a, input, textarea"
        )
      ) {
        return;
      }

      const hit = e.target.closest(".is-movable, [data-move-id], [data-move-item]");
      if (hit && itemsIn(stage).includes(hit)) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          toggleSelection(stage, hit);
        } else if (!getSelected(stage).has(hit)) {
          setSelection(stage, [hit]);
        }
        return;
      }

      // 只有按住 Alt 才框选，避免和拖大小、点空白冲突
      if (!e.altKey) {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) clearSelection(stage);
        return;
      }

      e.preventDefault();
      ensureStageStyle(stage);
      const sr = stage.getBoundingClientRect();
      const x0 = e.clientX - sr.left;
      const y0 = e.clientY - sr.top;
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) clearSelection(stage);

      let box = stage.querySelector(":scope > .marquee-box");
      if (!box) {
        box = document.createElement("div");
        box.className = "marquee-box";
        stage.appendChild(box);
      }
      box.hidden = false;
      box.style.left = `${x0}px`;
      box.style.top = `${y0}px`;
      box.style.width = "0px";
      box.style.height = "0px";

      const onMove = (ev) => {
        const x1 = ev.clientX - sr.left;
        const y1 = ev.clientY - sr.top;
        const l = Math.min(x0, x1);
        const t = Math.min(y0, y1);
        const w = Math.abs(x1 - x0);
        const h = Math.abs(y1 - y0);
        box.style.left = `${l}px`;
        box.style.top = `${t}px`;
        box.style.width = `${w}px`;
        box.style.height = `${h}px`;

        const hitEls = itemsIn(stage).filter((el) => {
          const b = relBox(el, stage);
          return !(b.right < l || b.left > l + w || b.bottom < t || b.top > t + h);
        });
        setSelection(stage, hitEls, { additive: e.shiftKey || e.ctrlKey || e.metaKey });
      };

      const onUp = () => {
        box.hidden = true;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        updateGroupChrome(stage);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  };

  const enable = () => {
    if (!document.body.classList.contains("is-owner")) return;
    stages().forEach((stage) => {
      ensureStageStyle(stage);
      itemsIn(stage).forEach((el) => {
        if (!el.dataset.moveId) el.dataset.moveId = moveIdOf(el);
        attachHandle(el);
      });
      stage.querySelectorAll(".skill-ovals > figure, :scope > figure").forEach((fig, i) => {
        if (!fig.dataset.moveId) fig.dataset.moveId = `skillFigure.${i}`;
        fig.dataset.moveItem = "1";
        attachHandle(fig);
      });
      // 只有已经自由排版过，才摊平 pill 行
      if (stage.classList.contains("has-moves")) {
        stage.querySelectorAll(".pill-row").forEach((row) => row.classList.add("pill-row--free"));
      }
      attachMarquee(stage);
    });
  };

  const clearSelectionAll = () => {
    stages().forEach((stage) => {
      clearSelection(stage);
      updateGroupChrome(stage);
    });
  };

  window.DawnLayout = { apply, enable, harvest, clearSelectionAll };
})();
