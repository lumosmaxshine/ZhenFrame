(() => {
  const STORAGE_KEY = "dawn_shortcuts_v1";
  const MAX_UNDO = 40;

  const defaults = () => ({
    save: "Control+s",
    undo: "Control+z",
    redo: "Control+y",
  });

  let map = { ...defaults() };
  const undoStack = [];
  const redoStack = [];

  const clone = (obj) => JSON.parse(JSON.stringify(obj || {}));

  const loadMap = (content) => {
    map = { ...defaults(), ...(content?.shortcuts || {}) };
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      map = { ...map, ...local };
    } catch {
      /* ignore */
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
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!["Control", "Alt", "Shift", "Meta"].includes(key)) parts.push(key);
    return parts.join("+");
  };

  const match = (e, name) => {
    const want = String(map[name] || "")
      .toLowerCase()
      .replace(/\s+/g, "");
    const got = comboFromEvent(e).toLowerCase().replace(/\s+/g, "");
    return want && want === got;
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

  const bind = () => {
    if (document.body.dataset.shortcutsBound === "1") return;
    document.body.dataset.shortcutsBound = "1";
    document.addEventListener(
      "keydown",
      async (e) => {
        if (!document.body.classList.contains("is-owner")) return;
        const tag = (e.target?.tagName || "").toLowerCase();
        const typing =
          e.target?.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";

        if (match(e, "save")) {
          e.preventDefault();
          document.getElementById("settingsSave")?.click();
          if (!document.getElementById("settingsSave")) {
            document.dispatchEvent(new CustomEvent("dawn:shortcut-save"));
          }
          return;
        }

        // 输入文字时不抢 Ctrl+Z（留给系统撤销打字）
        if (typing && (match(e, "undo") || match(e, "redo"))) return;

        if (match(e, "undo")) {
          e.preventDefault();
          if (undo()) {
            const say = document.getElementById("settingsStatus");
            if (say) say.textContent = "已撤回一步排版（记得保存到网上）";
          }
          return;
        }
        if (match(e, "redo")) {
          e.preventDefault();
          if (redo()) {
            const say = document.getElementById("settingsStatus");
            if (say) say.textContent = "已重做一步排版（记得保存到网上）";
          }
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

  const getMap = () => ({ ...map });

  window.DawnShortcuts = { loadMap, bind, push, undo, redo, setShortcut, getMap, defaults, comboFromEvent };
  window.DawnHistory = { push };
})();
