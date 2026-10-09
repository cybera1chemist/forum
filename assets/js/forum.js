const LOGIN_USERNAME = "888888";
const LOGIN_PASSWORD = "888888";

const AUTH_STORAGE_KEY = "alchemist-forum-authenticated";
const projectRoot = new URL("../../", document.currentScript.src);

function showToast(message) {
  const toast = document.querySelector(".toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

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

function initializeLoginPage() {
  if (localStorage.getItem(AUTH_STORAGE_KEY) === "true") {
    window.location.replace("../index.html");
    return;
  }

  const form = document.querySelector("[data-login-form]");
  const message = document.querySelector("[data-login-message]");
  const successOverlay = document.querySelector("[data-login-success]");
  const passwordInput = document.querySelector("#password");
  const passwordToggle = document.querySelector("[data-password-toggle]");

  passwordToggle.addEventListener("click", () => {
    const reveal = passwordInput.type === "password";
    passwordInput.type = reveal ? "text" : "password";
    passwordToggle.textContent = reveal ? "隐藏" : "显示";
    passwordToggle.setAttribute("aria-label", reveal ? "隐藏密码" : "显示密码");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    message.classList.remove("is-success");

    const formData = new FormData(form);
    const username = formData.get("username");
    const password = formData.get("password");

    if (username !== LOGIN_USERNAME || password !== LOGIN_PASSWORD) {
      message.textContent = "账号或密码不正确，请检查后重试。";
      return;
    }

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, "true");
    } catch {
      message.textContent = "浏览器无法保存登录状态，请检查隐私或存储设置后重试。";
      return;
    }

    message.textContent = "身份验证通过，正在建立安全连接。";
    message.classList.add("is-success");
    successOverlay.hidden = false;
    window.setTimeout(() => window.location.replace("../index.html"), 1000);
  });
}

async function loadRecentPosts() {
  const postList = document.querySelector("#recent-posts");

  try {
    const [manifestResponse, usersResponse, anonymousResponse] = await Promise.all([
      fetch(new URL("texts/posts/index.json", projectRoot)),
      fetch(new URL("configs/users.json", projectRoot)),
      fetch(new URL("configs/anonymous.json", projectRoot))
    ]);
    if (!manifestResponse.ok) throw new Error(`帖子清单读取失败（HTTP ${manifestResponse.status}）`);
    if (!usersResponse.ok) throw new Error(`用户资料读取失败（HTTP ${usersResponse.status}）`);
    if (!anonymousResponse.ok) throw new Error(`匿名身份读取失败（HTTP ${anonymousResponse.status}）`);

    const [filenames, users, anonymousIdentities] = await Promise.all([
      manifestResponse.json(),
      usersResponse.json(),
      anonymousResponse.json()
    ]);
    if (!Array.isArray(filenames)) {
      throw new Error("帖子清单格式错误：内容必须是文件名数组。");
    }
    if (!Array.isArray(anonymousIdentities)) {
      throw new Error("匿名身份配置格式错误：内容必须是数组。");
    }
    validateAnonymousIdentities(anonymousIdentities);

    const posts = await Promise.all(filenames.map(async (filename) => {
      if (typeof filename !== "string" || !filename.endsWith(".json")) {
        throw new Error("帖子清单格式错误：每项都必须是 JSON 文件名。");
      }
      const response = await fetch(new URL(`texts/posts/${encodeURIComponent(filename)}`, projectRoot));
      if (!response.ok) {
        throw new Error(`帖子 ${filename} 读取失败（HTTP ${response.status}）`);
      }
      const post = await response.json();
      validateAnonymousMapping(post, filename, anonymousIdentities);
      return { ...post, filename };
    }));

    return { posts, users, anonymousIdentities };
  } catch (error) {
    postList.innerHTML = `<div class="error-row">${escapeHTML(error.message)}<br>请通过静态网页服务器打开论坛，以允许浏览器读取 JSON 文件。</div>`;
    return null;
  }
}

function validateAnonymousMapping(post, filename, anonymousIdentities) {
  if (!post.meta?.isAnonymous) return;

  const identityIds = new Set(anonymousIdentities.map((identity) => Number(identity.id)));
  const mapping = post.anonymousIdentities;
  if (
    !Array.isArray(mapping)
    || mapping.length !== 6
    || mapping.some((identityId) => !Number.isInteger(identityId) || !identityIds.has(identityId))
  ) {
    throw new Error(`帖子 ${filename} 的匿名身份映射格式错误：必须包含 6 个有效匿名身份 ID。`);
  }
}

function validateAnonymousIdentities(anonymousIdentities) {
  if (
    !Array.isArray(anonymousIdentities)
    || anonymousIdentities.some((identity) => (
      !identity || typeof identity.color !== "string" || !/^#[\da-f]{6}$/i.test(identity.color)
    ))
  ) {
    throw new Error("匿名身份配置格式错误：每个身份都必须包含有效的六位十六进制颜色。");
  }
}

function getAnonymousAssignments(post, anonymousIdentities) {
  const meta = post.meta ?? {};
  if (!meta.isAnonymous) return new Map();

  const identityById = new Map(anonymousIdentities.map((identity) => [Number(identity.id), identity]));
  const participantIds = [meta.author_id, ...(post.replies ?? []).map((reply) => reply.authorId)]
    .filter((id) => id !== undefined && id !== null)
    .map(String)
    .filter((id, index, ids) => ids.indexOf(id) === index);
  return new Map(participantIds.map((participantId) => {
    const anonymousIdentityId = post.anonymousIdentities[Number(participantId) - 1];
    return [participantId, identityById.get(anonymousIdentityId)];
  }));
}

function getAuthorIdentity(post, authorId, users, anonymousIdentities) {
  const author = Object.values(users).find((user) => Number(user.id) === Number(authorId));

  if (post.meta?.isAnonymous && Number(authorId) !== 0) {
    const assignedIdentity = getAnonymousAssignments(post, anonymousIdentities).get(String(authorId));
    return {
      name: assignedIdentity?.name ?? "匿名用户",
      avatarPath: assignedIdentity?.avatar_path ?? null,
      color: assignedIdentity?.color ?? null
    };
  }

  return {
    name: author?.nickname ?? "未知用户",
    avatarPath: author?.avatar_path ?? (Number(authorId) === 0 ? "assets/images/rabbit_avatar.jpg" : null)
  };
}

function getAuthorName(post, users, anonymousIdentities) {
  return getAuthorIdentity(post, post.meta?.author_id, users, anonymousIdentities).name;
}

function renderPosts(posts, selectedBoard, users, anonymousIdentities) {
  const postList = document.querySelector("#recent-posts");
  const filteredPosts = selectedBoard === "all"
    ? posts
    : posts.filter((post) => (post.meta?.board || "未分类") === selectedBoard);

  if (filteredPosts.length === 0) {
    const emptyMessage = selectedBoard === "all"
      ? "还没有近期讨论。"
      : `「${escapeHTML(selectedBoard)}」版块暂时还没有讨论。`;
    postList.innerHTML = `<div class="empty-row">${emptyMessage}</div>`;
    return;
  }

  postList.innerHTML = filteredPosts.map((post) => {
    const meta = post.meta ?? {};
    const title = escapeHTML(meta.title || "未命名帖子");
    const board = escapeHTML(meta.board || "未分类");
    const authorName = escapeHTML(getAuthorName(post, users, anonymousIdentities));
    const replyCount = Array.isArray(post.replies) ? post.replies.length : 0;
    const pinned = meta.pinned ? '<span class="post-tag post-tag--pinned">置顶</span>' : "";

    return `
      <article class="post-row">
        <div class="post-main">
          <div class="post-meta">${pinned}<span class="post-tag">${board}</span></div>
          <a class="post-title" href="pages/post.html?post=${encodeURIComponent(post.filename)}">${title}</a>
          <p class="post-author">楼主：${authorName}</p>
        </div>
        <span class="post-count">${replyCount} 回复</span>
      </article>
    `;
  }).join("");
}

function initializeHomePage() {
  if (localStorage.getItem(AUTH_STORAGE_KEY) !== "true") {
    window.location.replace("pages/log_in.html");
    return;
  }

  let posts = [];
  let users = {};
  let anonymousIdentities = [];
  let selectedBoard = "all";
  loadRecentPosts().then((loadedPosts) => {
    if (!loadedPosts) return;
    posts = loadedPosts.posts;
    users = loadedPosts.users;
    anonymousIdentities = loadedPosts.anonymousIdentities;
    renderPosts(posts, selectedBoard, users, anonymousIdentities);
  });

  document.querySelector("[data-search-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    showToast("搜索功能尚未开放，敬请期待。");
  });

  document.querySelectorAll(".board-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      selectedBoard = tab.dataset.board;
      document.querySelectorAll(".board-tab").forEach((otherTab) => {
        const isSelected = otherTab === tab;
        otherTab.classList.toggle("is-active", isSelected);
        otherTab.setAttribute("aria-selected", String(isSelected));
        otherTab.tabIndex = isSelected ? 0 : -1;
      });
      renderPosts(posts, selectedBoard, users, anonymousIdentities);
    });
  });
}

function renderAuthorAvatar(identity) {
  if (identity.avatarPath) {
    const avatarUrl = escapeHTML(new URL(identity.avatarPath, projectRoot).href);
    if (identity.color) {
      return `<span class="post-detail-avatar post-detail-avatar--anonymous" style="--avatar-color:${identity.color};--avatar-image:url('${avatarUrl}')" role="img" aria-label="${escapeHTML(identity.name)}"></span>`;
    }
    return `<img class="post-detail-avatar" src="${avatarUrl}" alt="">`;
  }

  return `<span class="post-detail-avatar post-detail-avatar--fallback" aria-hidden="true">${escapeHTML(identity.name.slice(0, 1))}</span>`;
}

function renderPostDetails(post, users, anonymousIdentities) {
  const target = document.querySelector("#post-detail");
  const meta = post.meta;
  const title = escapeHTML(meta.title || "未命名帖子");
  const board = escapeHTML(meta.board || "未分类");
  const author = getAuthorIdentity(post, meta.author_id, users, anonymousIdentities);
  const authorName = escapeHTML(author.name);
  const pinned = meta.pinned ? '<span class="post-tag post-tag--pinned">置顶</span>' : "";
  const replies = Array.isArray(post.replies) ? post.replies : [];

  document.title = `${meta.title || "帖子详情"} — 炼金术师论坛`;
  target.innerHTML = `
    <nav class="post-breadcrumb" aria-label="面包屑导航">
      <a href="../index.html">论坛主页</a><span aria-hidden="true">/</span><span>${board}</span>
    </nav>
    <article class="post-detail-card">
      <header class="post-detail-heading">
        <div class="post-detail-tags">${pinned}<span class="post-tag">${board}</span></div>
        <h1>${title}</h1>
        <div class="post-detail-author">
          ${renderAuthorAvatar(author)}
          <div><strong>${authorName}</strong><span>楼主</span></div>
        </div>
      </header>
      <div class="post-detail-content">${escapeHTML(post.content || "")}</div>
    </article>
    <section class="post-replies" aria-labelledby="reply-heading">
      <div class="post-replies-heading">
        <h2 id="reply-heading">全部回复</h2>
        <span>${replies.length} 条回复</span>
      </div>
      <div class="post-reply-list">
        ${replies.length
          ? replies.map((reply, index) => {
            const identity = getAuthorIdentity(post, reply.authorId, users, anonymousIdentities);
            return `
              <article class="post-reply">
                <div class="post-detail-author">
                  ${renderAuthorAvatar(identity)}
                  <div><strong>${escapeHTML(identity.name)}</strong><span>${index + 2} 楼</span></div>
                </div>
                <p>${escapeHTML(reply.content || "")}</p>
              </article>
            `;
          }).join("")
          : '<p class="post-replies-empty">暂时还没有回复。</p>'}
      </div>
    </section>
    <form class="reply-composer">
      <label for="reply-content">参与讨论</label>
      <textarea id="reply-content" placeholder="管理员已暂时关闭本站的回复功能~"></textarea>
      <button type="button" disabled>发表回复</button>
    </form>
  `;
}

async function initializePostPage() {
  if (localStorage.getItem(AUTH_STORAGE_KEY) !== "true") {
    window.location.replace(new URL("pages/log_in.html", projectRoot).href);
    return;
  }

  const target = document.querySelector("#post-detail");
  const filename = new URLSearchParams(window.location.search).get("post");
  if (!filename) {
    target.innerHTML = '<div class="error-row">未指定帖子。<a href="../index.html">返回论坛主页</a></div>';
    return;
  }

  try {
    const [filenames, users, anonymousIdentities] = await Promise.all([
      fetchJson(new URL("texts/posts/index.json", projectRoot), "帖子清单"),
      fetchJson(new URL("configs/users.json", projectRoot), "用户资料"),
      fetchJson(new URL("configs/anonymous.json", projectRoot), "匿名身份")
    ]);
    if (!Array.isArray(filenames) || !filenames.every((item) => typeof item === "string")) {
      throw new Error("帖子清单格式错误：内容必须是文件名数组。");
    }
    if (!filenames.includes(filename)) {
      throw new Error("找不到这篇帖子，请从论坛主页重新选择。");
    }
    if (!Array.isArray(anonymousIdentities)) {
      throw new Error("匿名身份配置格式错误：内容必须是数组。");
    }
    validateAnonymousIdentities(anonymousIdentities);

    const post = await fetchJson(
      new URL(`texts/posts/${encodeURIComponent(filename)}`, projectRoot),
      `帖子 ${filename}`
    );
    validateAnonymousMapping(post, filename, anonymousIdentities);
    if (!post.meta || !Array.isArray(post.replies) || typeof post.content !== "string") {
      throw new Error(`帖子 ${filename} 的内容格式错误。`);
    }
    renderPostDetails(post, users, anonymousIdentities);
  } catch (error) {
    target.innerHTML = `<div class="error-row">${escapeHTML(error.message)}<br><a href="../index.html">返回论坛主页</a></div>`;
  }
}

const pageType = document.body.dataset.page;
if (pageType === "login") initializeLoginPage();
if (pageType === "home") initializeHomePage();
if (pageType === "post") initializePostPage();
