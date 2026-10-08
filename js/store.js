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
    const payload = clone(content);
    delete payload._source;
    const { error } = await sb.from("site_content").upsert({
      id: "default",
      data: payload,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
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
  };
})();
