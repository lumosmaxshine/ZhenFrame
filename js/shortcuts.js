(() => {
  const STORAGE_KEY = "dawn_shortcuts_v1";
  const MAX_UNDO = 40;

  /** 和 WordPress / Webflow / Elementor / Figma 常见习惯对齐，再适配本站能做的操作 */
  const CATALOG = [
    {
      id: "save",
      label: "保存到网上",
      tip: "几乎所有网站后台、Word 都是这个键",
    },
    {
      id: "undo",
      label: "撤回",
      tip: "撤销上一步排版移动/改大小",
    },
    {
      id: "redo",
      label: "重做",
      tip: "把刚撤回的一步再做回来（行业里常用 Ctrl+Shift+Z）",
    },
    {
      id: "settings",
      label: "打开设置",
      tip: "很多编辑器也用 Ctrl+, 打开偏好设置",
    },
    {
      id: "help",
      label: "快捷键说明",
      tip: "弹出本页有哪些快捷键（Webflow 等也有类似）",
    },
    {
      id: "escape",
      label: "关闭 / 取消选中",
      tip: "关弹窗、关设置、取消多选",
    },
    {
      id: "bold",
      label: "加粗文字",
      tip: "选中一段字时生效（写简介常用）",
    },
    {
      id: "italic",
      label: "斜体文字",
      tip: "选中一段字时生效",
    },
    {
      id: "preview",
      label: "预览模式",
      tip: "暂时藏起红虚线和移动钮，像访客看到的一样",
    },
  ];

  const defaults = () => ({
    save: "Control+s",
    undo: "Control+z",
    redo: "Control+Shift+z",
    settings: "Control+,",
    help: "Control+/",
    escape: "Escape",
    bold: "Control+b",
    italic: "Control+i",
    preview: "Control+Shift+p",
  });

  let map = { ...defaults() };
  const undoStack = [];
  const redoStack = [];

  const clone = (obj) => JSON.parse(JSON.stringify(obj || {}));

  const pretty = (combo) =>
    String(combo || "")
      .replace(/Control/gi, "Ctrl")
      .replace(/Meta/gi, "Cmd")
      .replace(/\+/g, " + ")
      .replace(/\b([a-z])\b/g, (m) => m.toUpperCase());

  const loadMap = (content) => {
    map = { ...defaults(), ...(content?.shortcuts || {}) };
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      map = { ...map, ...local };
    } catch {
      /* ignore */
    }
    // 旧默认 redo 是 Control+y，保留兼容：若用户没改过仍可用 y
    if (!localStorage.getItem(STORAGE_KEY) && !content?.shortcuts?.redo) {
      map.redo = defaults().redo;
    }
  };

  const saveLocal = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  };

  const comboFromEvent = (e) => {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push("Control");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    let key = e.key;
    if (key === " ") key = "Space";
    else if (key.length === 1) key = key.toLowerCase();
    if (!["Control", "Alt", "Shift", "Meta"].includes(key)) parts.push(key);
    return parts.join("+");
  };

  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/cmd/g, "control")
      .replace(/meta/g, "control");

  const match = (e, name) => {
    const want = norm(map[name]);
    const got = norm(comboFromEvent(e));
    if (want && want === got) return true;
    // 重做：行业双习惯 Ctrl+Shift+Z 与 Ctrl+Y 都认（除非用户自定义成别的）
    if (name === "redo") {
      const def = norm(defaults().redo);
      if (want === def && (got === "control+y" || got === "control+shift+z")) return true;
    }
    return false;
  };

  const snapshot = (content) => ({
    moves: clone(content?.moves || {}),
    boxes: clone(content?.boxes || {}),
  });

  const applySnap = (snap) => {
    if (!snap || !window.DAWN_CONTENT) return;
    window.DAWN_CONTENT.moves = clone(snap.moves);
    window.DAWN_CONTENT.boxes = clone(snap.boxes);
    window.DawnRender?.apply(window.DAWN_CONTENT);
    window.DawnLayout?.apply?.(window.DAWN_CONTENT);
    if (document.body.classList.contains("is-owner")) {
      window.DawnLayout?.enable?.();
    }
  };

  const push = (content) => {
    const snap = snapshot(content);
    const last = undoStack[undoStack.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(snap)) return;
    undoStack.push(snap);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
  };

  const undo = () => {
    if (undoStack.length < 2) return false;
    const current = undoStack.pop();
    redoStack.push(current);
    applySnap(undoStack[undoStack.length - 1]);
    return true;
  };

  const redo = () => {
    if (!redoStack.length) return false;
    const snap = redoStack.pop();
    undoStack.push(snap);
    applySnap(snap);
    return true;
  };

  const say = (msg) => {
    const el = document.getElementById("settingsStatus");
    if (el) el.textContent = msg;
  };

  const closeHelp = () => document.getElementById("shortcutHelp")?.remove();

  const showHelp = () => {
    closeHelp();
    const layer = document.createElement("div");
    layer.id = "shortcutHelp";
    layer.className = "shortcut-help";
    layer.innerHTML = `
      <div class="shortcut-help__card" role="dialog" aria-label="快捷键说明">
        <header>
          <h3>常用快捷键</h3>
          <button type="button" class="shortcut-help__close" aria-label="关闭">×</button>
        </header>
        <p class="shortcut-help__lead">一般网站后台（WordPress、Webflow、Elementor）和设计工具（Figma）都用类似这套键。下面是本站已支持的，可在设置里改成你习惯的组合。</p>
        <ul>
          ${CATALOG.map((row) => {
            const combo = pretty(map[row.id] || defaults()[row.id]);
            return `<li><span>${row.label}</span><code>${combo}</code><small>${row.tip}</small></li>`;
          }).join("")}
        </ul>
        <p class="shortcut-help__foot">提示：框选要按住 Alt 再拖空白处；改键请到左上角 ZhenFrame → 设置。</p>
      </div>`;
    document.body.appendChild(layer);
    layer.addEventListener("click", (e) => {
      if (e.target === layer || e.target.closest(".shortcut-help__close")) closeHelp();
    });
  };

  const runFormat = (cmd) => {
    try {
      document.execCommand(cmd, false);
    } catch {
      /* ignore */
    }
  };

  const runEscape = () => {
    closeHelp();
    const panel = document.getElementById("settingsPanel");
    if (panel) {
      panel.remove();
      return;
    }
    let closed = false;
    document.querySelectorAll(".modal").forEach((m) => {
      if (!m.hidden) {
        m.hidden = true;
        closed = true;
      }
    });
    if (closed) {
      document.body.classList.remove("is-modal-open");
      return;
    }
    window.DawnLayout?.clearSelectionAll?.();
  };

  const bind = () => {
    if (document.body.dataset.shortcutsBound === "1") return;
    document.body.dataset.shortcutsBound = "1";
    document.addEventListener(
      "keydown",
      (e) => {
        if (!document.body.classList.contains("is-owner")) return;
        const tag = (e.target?.tagName || "").toLowerCase();
        const typing =
          e.target?.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";

        if (match(e, "help")) {
          e.preventDefault();
          showHelp();
          return;
        }

        if (match(e, "escape")) {
          // Escape 不 preventDefault 太多，但要拦住默认以免别的冲突
          e.preventDefault();
          runEscape();
          return;
        }

        if (match(e, "save")) {
          e.preventDefault();
          document.getElementById("settingsSave")?.click();
          if (!document.getElementById("settingsSave")) {
            document.dispatchEvent(new CustomEvent("dawn:shortcut-save"));
          }
          return;
        }

        if (match(e, "settings")) {
          e.preventDefault();
          document.dispatchEvent(new CustomEvent("dawn:shortcut-settings"));
          return;
        }

        if (match(e, "preview")) {
          e.preventDefault();
          document.body.classList.toggle("is-preview");
          say(document.body.classList.contains("is-preview") ? "预览模式：编辑框已隐藏，再按一次恢复" : "已退出预览模式");
          return;
        }

        if (typing && match(e, "bold")) {
          e.preventDefault();
          runFormat("bold");
          return;
        }
        if (typing && match(e, "italic")) {
          e.preventDefault();
          runFormat("italic");
          return;
        }

        // 输入文字时不抢撤回/重做（留给浏览器撤销打字）
        if (typing && (match(e, "undo") || match(e, "redo"))) return;

        if (match(e, "undo")) {
          e.preventDefault();
          if (undo()) say("已撤回一步排版（记得保存到网上）");
          return;
        }
        if (match(e, "redo")) {
          e.preventDefault();
          if (redo()) say("已重做一步排版（记得保存到网上）");
        }
      },
      true
    );
  };

  const setShortcut = (name, combo) => {
    map[name] = combo;
    saveLocal();
    if (window.DAWN_CONTENT) {
      window.DAWN_CONTENT.shortcuts = { ...map };
    }
  };

  const resetAll = () => {
    map = { ...defaults() };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (window.DAWN_CONTENT) window.DAWN_CONTENT.shortcuts = { ...map };
  };

  const getMap = () => ({ ...map });
  const catalog = () => CATALOG.map((row) => ({ ...row }));

  window.DawnShortcuts = {
    loadMap,
    bind,
    push,
    undo,
    redo,
    setShortcut,
    resetAll,
    getMap,
    defaults,
    catalog,
    pretty,
    comboFromEvent,
    showHelp,
  };
  window.DawnHistory = { push };
})();
