const LOGIN_USERNAME = "888888";
const LOGIN_PASSWORD = "888888";

const AUTH_STORAGE_KEY = "alchemist-forum-authenticated";

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
      fetch("texts/posts/index.json"),
      fetch("configs/users.json"),
      fetch("configs/anonymous.json")
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

    const posts = await Promise.all(filenames.map(async (filename) => {
      const response = await fetch(`texts/posts/${encodeURIComponent(filename)}`);
      if (!response.ok) {
        throw new Error(`帖子 ${filename} 读取失败（HTTP ${response.status}）`);
      }
      return response.json();
    }));

    return { posts, users, anonymousIdentities };
  } catch (error) {
    postList.innerHTML = `<div class="error-row">${escapeHTML(error.message)}<br>请通过静态网页服务器打开论坛，以允许浏览器读取 JSON 文件。</div>`;
    return null;
  }
}

function getAnonymousAssignments(post, anonymousIdentities) {
  const meta = post.meta ?? {};
  if (!meta.isAnonymous) return new Map();

  const identityById = new Map(anonymousIdentities.map((identity) => [Number(identity.id), identity]));
  const configuredIds = Array.isArray(post.anonymousIdentities)
    ? post.anonymousIdentities.map(Number).filter((id) => identityById.has(id))
    : [];
  const candidates = configuredIds.length > 0
    ? configuredIds
    : anonymousIdentities.map((identity) => Number(identity.id));
  const participantIds = [meta.author_id, ...(post.replies ?? []).map((reply) => reply.authorId)]
    .filter((id) => id !== undefined && id !== null)
    .map(String)
    .filter((id, index, ids) => ids.indexOf(id) === index);
  const seedText = `${meta.title ?? ""}:${participantIds.join(",")}`;
  let seed = 2166136261;

  for (const character of seedText) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  }

  const shuffledIds = [...candidates];
  for (let index = shuffledIds.length - 1; index > 0; index -= 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const swapIndex = (seed >>> 0) % (index + 1);
    [shuffledIds[index], shuffledIds[swapIndex]] = [shuffledIds[swapIndex], shuffledIds[index]];
  }

  return new Map(participantIds.map((participantId, index) => [
    participantId,
    identityById.get(shuffledIds[index % shuffledIds.length])
  ]));
}

function getAuthorName(post, users, anonymousIdentities) {
  const meta = post.meta ?? {};
  const authorId = meta.author_id;
  const author = Object.values(users).find((user) => Number(user.id) === Number(authorId));

  if (meta.isAnonymous && Number(authorId) !== 0) {
    const assignedIdentity = getAnonymousAssignments(post, anonymousIdentities).get(String(authorId));
    return assignedIdentity?.name ?? "匿名用户";
  }

  return author?.nickname ?? "未知用户";
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
          <a class="post-title" href="#post" data-unavailable>${title}</a>
          <p class="post-author">楼主：${authorName}</p>
        </div>
        <span class="post-count">${replyCount} 回复</span>
      </article>
    `;
  }).join("");

  postList.querySelectorAll("[data-unavailable]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showToast("该页面正在建设中，先看看论坛主页吧。");
    });
  });
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

const pageType = document.body.dataset.page;
if (pageType === "login") initializeLoginPage();
if (pageType === "home") initializeHomePage();
