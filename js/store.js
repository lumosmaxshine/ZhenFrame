(() => {
  const cfg = () => window.DAWN_CONFIG || {};
  const configured = () => {
    const url = String(cfg().supabaseUrl || "").trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
    const key = String(cfg().supabaseAnonKey || "").trim();
    if (url) cfg().supabaseUrl = url;
    return Boolean(url && key);
  };

  let client = null;
  const getClient = () => {
    if (!configured()) return null;
    if (client) return client;
    if (!window.supabase) return null;
    client = window.supabase.createClient(cfg().supabaseUrl, cfg().supabaseAnonKey);
    return client;
  };

  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  const HISTORY_KEY = "zhenframe_history_v1";
  const HISTORY_MAX = 15;

  const stripMeta = (content) => {
    const payload = clone(content || {});
    delete payload._source;
    return payload;
  };

  const readLocalHistory = () => {
    try {
      const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  };

  const writeLocalHistory = (list) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  };

  const pushHistory = (content, note = "保存") => {
    const payload = stripMeta(content);
    const list = readLocalHistory();
    list.unshift({
      id: `local_${Date.now()}`,
      at: new Date().toISOString(),
      note,
      data: payload,
    });
    writeLocalHistory(list);
    return list;
  };

  const listHistory = async () => {
    const local = readLocalHistory();
    const sb = getClient();
    if (!sb) return local;
    try {
      const { data, error } = await sb
        .from("site_content")
        .select("id, updated_at, data")
        .like("id", "hist_%")
        .order("updated_at", { ascending: false })
        .limit(HISTORY_MAX);
      if (error || !data?.length) return local;
      const cloud = data.map((row) => ({
        id: row.id,
        at: row.updated_at,
        note: "网上备份",
        data: row.data,
        cloud: true,
      }));
      const merged = [...local];
      cloud.forEach((item) => {
        if (!merged.some((m) => m.id === item.id)) merged.push(item);
      });
      merged.sort((a, b) => String(b.at).localeCompare(String(a.at)));
      return merged.slice(0, HISTORY_MAX);
    } catch {
      return local;
    }
  };

  const getHistory = async (id) => {
    const local = readLocalHistory().find((item) => item.id === id);
    if (local) return local;
    const sb = getClient();
    if (!sb || !String(id).startsWith("hist_")) return null;
    const { data, error } = await sb.from("site_content").select("id, updated_at, data").eq("id", id).maybeSingle();
    if (error || !data?.data) return null;
    return { id: data.id, at: data.updated_at, note: "网上备份", data: data.data, cloud: true };
  };

  const load = async () => {
    const fallback = clone(window.DAWN_DEFAULTS);
    const sb = getClient();
    if (!sb) return { ...fallback, _source: "local" };
    const { data, error } = await sb.from("site_content").select("data").eq("id", "default").maybeSingle();
    if (error || !data?.data) return { ...fallback, _source: "cloud-empty" };
    return { ...fallback, ...data.data, _source: "cloud" };
  };

  const save = async (content) => {
    const sb = getClient();
    if (!sb) throw new Error("还没有配置云端。请先打开 admin.html 查看设置步骤。");
    const payload = stripMeta(content);
    const now = new Date().toISOString();

    // 先把当前网上版本存进历史，方便后悔回退
    try {
      const { data: prev } = await sb.from("site_content").select("data").eq("id", "default").maybeSingle();
      if (prev?.data) {
        pushHistory(prev.data, "保存前备份");
        await sb.from("site_content").upsert({
          id: `hist_${Date.now()}`,
          data: prev.data,
          updated_at: now,
        });
      }
    } catch {
      /* 历史失败不影响本次保存 */
    }

    const { error } = await sb.from("site_content").upsert({
      id: "default",
      data: payload,
      updated_at: now,
    });
    if (error) throw error;
    pushHistory(payload, "已发布");
    return payload;
  };

  const upload = async (file, folder = "media") => {
    const sb = getClient();
    if (!sb) throw new Error("还没有配置云端存储。");
    if (file.size > 45 * 1024 * 1024) {
      throw new Error("单个文件请小于 45MB。视频可先压缩再上传。");
    }
    const safe = String(file.name || "file").replace(/[^\w.\-]+/g, "_");
    const path = `${folder}/${Date.now()}-${safe}`;
    const { error } = await sb.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    const { data } = sb.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  };

  const session = async () => {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session || null;
  };

  const login = async (email, password) => {
    const sb = getClient();
    if (!sb) throw new Error("还没有配置云端。");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  };

  const logout = async () => {
    const sb = getClient();
    if (sb) await sb.auth.signOut();
  };

  window.DawnStore = {
    configured,
    getClient,
    load,
    save,
    upload,
    session,
    login,
    logout,
    pushHistory,
    listHistory,
    getHistory,
  };
})();
