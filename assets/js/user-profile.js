(() => {
  const AUTH_STORAGE_KEY = "alchemist-forum-authenticated";
  const UNLOCKED_USERS_STORAGE_KEY = "alchemist-forum-unlocked-users";
  const projectRoot = new URL("../../", document.currentScript.src);
  const profile = document.querySelector("#user-profile");

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  async function fetchJson(url, description) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${description}读取失败（HTTP ${response.status}）`);
    }
    return response.json();
  }

  function getUnlockedUserIds() {
    const storedValue = localStorage.getItem(UNLOCKED_USERS_STORAGE_KEY);
    if (storedValue === null) return new Set();

    let userIds;
    try {
      userIds = JSON.parse(storedValue);
    } catch {
      throw new Error("已解锁用户记录格式错误，请清除浏览器中的论坛解锁记录后重试。");
    }

    if (!Array.isArray(userIds) || userIds.some((id) => !Number.isInteger(id) || id < 1)) {
      throw new Error("已解锁用户记录格式错误，请清除浏览器中的论坛解锁记录后重试。");
    }

    return new Set(userIds);
  }

  function getUserGender(gender) {
    return ({ female: "女", male: "男", other: "其他" })[gender] ?? gender ?? "未填写";
  }

  function validatePostIndex(index) {
    if (!index || typeof index !== "object" || Array.isArray(index)) {
      throw new Error("帖子清单格式错误：内容必须是对象。");
    }

    const entries = Object.entries(index);
    if (entries.some(([id, filename]) => (
      !/^[\da-f]{12}$/i.test(id)
      || typeof filename !== "string"
      || !/^post-[\w-]+\.json$/i.test(filename)
    ))) {
      throw new Error("帖子清单格式错误：ID 或文件名格式无效。");
    }

    return entries;
  }

  async function loadAuthoredPosts(userId) {
    const postIndex = await fetchJson(
      new URL("texts/posts/index.json", projectRoot),
      "帖子清单"
    );
    const entries = validatePostIndex(postIndex);
    const posts = await Promise.all(entries.map(async ([id, filename]) => {
      const post = await fetchJson(
        new URL(`texts/posts/${encodeURIComponent(filename)}`, projectRoot),
        `帖子 ${filename}`
      );
      if (!post || !post.meta || typeof post.meta !== "object") {
        throw new Error(`帖子 ${filename} 的格式错误：缺少 meta 元数据。`);
      }
      return { ...post, id };
    }));

    return posts.filter((post) => Number(post.meta.author_id) === userId);
  }

  function renderAvatar(user) {
    const profileAttributes = `data-profile-user-id="${Number(user.id)}" title="查看${escapeHTML(user.nickname)}的个人主页"`;
    if (user.avatar_path) {
      const avatarUrl = escapeHTML(new URL(user.avatar_path, projectRoot).href);
      return `<img class="user-profile-avatar" src="${avatarUrl}" alt="${escapeHTML(user.nickname)}" ${profileAttributes}>`;
    }
    return `
      <span class="user-profile-avatar user-profile-avatar--fallback" aria-hidden="true" ${profileAttributes}>
        ${escapeHTML((user.nickname ?? "?").slice(0, 1))}
      </span>
    `;
  }

  function renderPosts(posts) {
    if (posts.length === 0) {
      return '<p class="user-posts-empty">该用户还没有发表过帖子。</p>';
    }

    return `
      <div class="user-post-list">
        ${posts.map((post) => {
          const postUrl = new URL("pages/post.html", projectRoot);
          postUrl.searchParams.set("p", post.id);
          const replyCount = Array.isArray(post.replies) ? post.replies.length : 0;
          return `
            <article class="user-post-row">
              <div class="user-post-copy">
                <span class="post-tag">${escapeHTML(post.meta.board || "未分类")}</span>
                <a class="user-post-title" href="${escapeHTML(postUrl.href)}">
                  ${escapeHTML(post.meta.title || "未命名帖子")}
                </a>
              </div>
              <span class="user-post-count">${replyCount} 回复</span>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  async function initialize() {
    if (localStorage.getItem(AUTH_STORAGE_KEY) !== "true") {
      window.location.replace(new URL("pages/log_in.html", projectRoot).href);
      return;
    }

    const rawUserId = new URLSearchParams(window.location.search).get("id");
    const userId = rawUserId === null || rawUserId.trim() === "" ? NaN : Number(rawUserId);
    if (!Number.isInteger(userId)) {
      profile.innerHTML = '<div class="error-row">未指定有效用户。<a href="../index.html">返回论坛主页</a></div>';
      return;
    }

    try {
      const userConfig = await fetchJson(new URL("configs/users.json", projectRoot), "用户资料");
      if (!userConfig || typeof userConfig !== "object" || Array.isArray(userConfig)) {
        throw new Error("用户资料格式错误：内容必须是对象。");
      }

      const user = Object.values(userConfig).find((candidate) => Number(candidate.id) === userId);
      if (!user) throw new Error("找不到该用户。");

      if (userId >= 1 && userId <= 6 && !getUnlockedUserIds().has(userId)) {
        profile.innerHTML = `
          <div class="error-row">
            该用户的资料尚未解锁。<a href="user_search.html">前往解锁用户信息</a>
          </div>
        `;
        return;
      }

      const posts = await loadAuthoredPosts(userId);
      const messagesUrl = new URL("pages/messages.html", projectRoot);
      messagesUrl.searchParams.set("id", String(user.id));
      const details = [
        ["性别", getUserGender(user.gender)],
        ["年龄", user.age === undefined ? "未填写" : `${user.age} 岁`],
        ["家乡", user.home || "未填写"],
        ["职业", user.job || "未填写"]
      ];

      profile.innerHTML = `
        <section class="user-profile-hero">
          ${renderAvatar(user)}
          <h1>${escapeHTML(user.nickname ?? "未命名用户")}</h1>
        </section>
        <section class="user-profile-info" aria-label="个人资料">
          ${details.map(([label, value]) => `
            <div class="user-profile-info-item">
              <span>${escapeHTML(label)}</span>
              <strong>${escapeHTML(value)}</strong>
            </div>
          `).join("")}
        </section>
        <section class="user-posts-section" aria-labelledby="user-posts-heading">
          <div class="user-posts-heading">
            <h2 id="user-posts-heading">发表的帖子</h2>
            <span>${posts.length} 篇</span>
          </div>
          ${renderPosts(posts)}
        </section>
        <div class="user-profile-actions">
          <a class="tool-button tool-button--secondary profile-messages-link" href="${escapeHTML(messagesUrl.href)}">
            查看私信（仅管理员可用）
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      `;
      document.title = `${user.nickname} — 炼金术师论坛`;
    } catch (error) {
      profile.innerHTML = `<div class="error-row">${escapeHTML(error.message)}<br><a href="../index.html">返回论坛主页</a></div>`;
    }
  }

  initialize();
})();
