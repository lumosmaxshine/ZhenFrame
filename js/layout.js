(() => {
  const SNAP = 6;
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
      if (el.matches(".list-del, .move-handle, .modal__close, button, .marquee-box, .group-move-handle, .align-guides, .align-guide")) {
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

  const snapMove = (stage, el, left, top, ignoreEls = []) => {
    const ignore = new Set(ignoreEls);
    const sr = stage.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
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

  const ensureAbsolute = (el, stage) => {
    if (el.classList.contains("is-moved")) return;
    const box = relBox(el, stage);
    placeAbsolute(el, stage, box.left, box.top);
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
        content.moves[id] = {
          l: `${((el.offsetLeft / sw) * 100).toFixed(2)}%`,
          t: `${((el.offsetTop / sh) * 100).toFixed(2)}%`,
        };
      });
    });
    return content;
  };

  const noteSaved = () => {
    window.DAWN_CONTENT = window.DAWN_CONTENT || {};
    harvest(window.DAWN_CONTENT);
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
    stage.classList.add("has-moves");
    const selected = [...getSelected(stage)].filter((el) => stage.contains(el));
    if (!selected.length && leadEl) selected.push(leadEl);
    if (!selected.length) return;

    selected.forEach((el) => ensureAbsolute(el, stage));
    const startX = e.clientX;
    const startY = e.clientY;
    const origins = selected.map((el) => ({ el, l: el.offsetLeft, t: el.offsetTop }));
    selected.forEach((el) => el.classList.add("is-dragging"));

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let guides = [];
      origins.forEach(({ el, l, t }, i) => {
        if (i === 0) {
          const snapped = snapMove(stage, el, l + dx, t + dy, selected);
          const odx = snapped.left - l;
          const ody = snapped.top - t;
          origins.forEach(({ el: other, l: ol, t: ot }) => {
            placeAbsolute(other, stage, ol + odx, ot + ody);
          });
          guides = snapped.guides;
        }
      });
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
    handle.title = "拖这里移动；按住 Ctrl 可多选";
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
      stage.classList.add("has-moves");
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
      if (e.target.closest(".move-handle, .group-move-handle, [contenteditable='true'], .is-editable, [data-edit-media], .list-del, button, a, input, textarea")) {
        return;
      }
      // 点在可移动块上：单击选中；Ctrl 加减选
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
      stage.querySelectorAll(".pill-row").forEach((row) => row.classList.add("pill-row--free"));
      itemsIn(stage).forEach((el) => {
        if (!el.dataset.moveId) el.dataset.moveId = moveIdOf(el);
        attachHandle(el);
      });
      stage.querySelectorAll(".skill-ovals > figure").forEach((fig, i) => {
        if (!fig.dataset.moveId) fig.dataset.moveId = `skillFigure.${i}`;
        fig.dataset.moveItem = "1";
        attachHandle(fig);
      });
      attachMarquee(stage);
    });
  };

  window.DawnLayout = { apply, enable, harvest };
})();
