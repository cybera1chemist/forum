const LOGIN_USERNAME = "888888";
const LOGIN_PASSWORD = "888888";

const AUTH_STORAGE_KEY = "alchemist-forum-authenticated";
const UNLOCKED_USERS_STORAGE_KEY = "alchemist-forum-unlocked-users";
const projectRoot = new URL("../../", document.currentScript.src);

const HOME_OPTIONS = [
  ["安徽", "安徽省"],
  ["澳门", "澳门特别行政区"],
  ["北京", "北京市"],
  ["重庆", "重庆市"],
  ["福建", "福建省"],
  ["甘肃", "甘肃省"],
  ["广东", "广东省"],
  ["广西", "广西壮族自治区"],
  ["贵州", "贵州省"],
  ["海南", "海南省"],
  ["河北", "河北省"],
  ["河南", "河南省"],
  ["黑龙江", "黑龙江省"],
  ["湖北", "湖北省"],
  ["湖南", "湖南省"],
  ["吉林", "吉林省"],
  ["江苏", "江苏省"],
  ["江西", "江西省"],
  ["辽宁", "辽宁省"],
  ["内蒙古", "内蒙古自治区"],
  ["宁夏", "宁夏回族自治区"],
  ["青海", "青海省"],
  ["陕西", "陕西省"],
  ["山东", "山东省"],
  ["上海", "上海市"],
  ["山西", "山西省"],
  ["四川", "四川省"],
  ["台湾", "台湾省"],
  ["天津", "天津市"],
  ["香港", "香港特别行政区"],
  ["新疆", "新疆维吾尔自治区"],
  ["西藏", "西藏自治区"],
  ["云南", "云南省"],
  ["浙江", "浙江省"]
];

const PROFESSION_CATEGORIES = [
  {
    name: "文化与创作",
    options: [
      "漫画家", "小说家", "音乐制作人", "摄影师", "导演", "演员", "记者",
      "翻译", "文物修复师", "游戏制作人"
    ]
  },
  {
    name: "科技与研究",
    options: [
      "程序员", "社会科学家", "数据分析师", "天文学家", "生物学家",
      "地质学家", "考古学家", "历史学家", "气象学家", "食品安全检验员"
    ]
  },
  {
    name: "商业与组织",
    options: [
      "企业家", "会计师", "金融分析师", "银行柜员", "市场营销专员",
      "人力资源专员", "销售代表", "公关专员", "行政专员", "采购专员",
      "客服专员", "产品经理"
    ]
  },
  {
    name: "医疗与健康",
    options: [
      "医生", "护士", "药剂师", "兽医", "营养师",
      "物理治疗师", "验光师", "助产士"
    ]
  },
  {
    name: "法律与公共服务",
    options: [
      "律师", "法官", "警察", "消防员", "军人", "社会工作者",
      "外交官", "公证员"
    ]
  },
  {
    name: "教育与知识服务",
    options: [
      "中小学教师", "图书管理员", "职业规划师", "博物馆讲解员",
      "心理咨询师", "玄学顾问", "情感导师", "培训机构老师"
    ]
  },
  {
    name: "餐饮与生活服务",
    options: [
      "厨师", "咖啡师", "茶艺师", "餐厅服务员", "宠物美容师",
      "理发师", "家政服务员", "导游", "健身教练"
    ]
  },
  {
    name: "交通与物流",
    options: [
      "飞行员", "船员", "铁路调度员", "物流专员", "空中交通管制员"
    ]
  },
  {
    name: "工程与维修",
    options: [
      "汽车维修技师", "电工", "建筑工人", "焊接技师", "电梯维修技师"
    ]
  }
];

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

function formatPostText(value) {
  return escapeHTML(value).replace(/\*([^*\r\n]+)\*/g, "<strong>$1</strong>");
}

async function fetchJson(url, description) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${description}读取失败（HTTP ${response.status}）`);
  }
  return response.json();
}

function getUnlockedUserIds() {
  let storedValue;
  try {
    storedValue = localStorage.getItem(UNLOCKED_USERS_STORAGE_KEY);
  } catch {
    throw new Error("浏览器无法读取解锁状态，请检查隐私或存储设置后重试。");
  }
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

function unlockUser(userId) {
  const unlockedUserIds = getUnlockedUserIds();
  unlockedUserIds.add(Number(userId));
  try {
    localStorage.setItem(
      UNLOCKED_USERS_STORAGE_KEY,
      JSON.stringify([...unlockedUserIds].sort((first, second) => first - second))
    );
  } catch {
    throw new Error("浏览器无法保存解锁状态，请检查隐私或存储设置后重试。");
  }
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

async function loadForumData() {
  const [postIndex, users, anonymousIdentities] = await Promise.all([
    fetchJson(new URL("texts/posts/index.json", projectRoot), "帖子清单"),
    fetchJson(new URL("configs/users.json", projectRoot), "用户资料"),
    fetchJson(new URL("configs/anonymous.json", projectRoot), "匿名身份")
  ]);
  const postEntries = validatePostIndex(postIndex);
  if (!Array.isArray(anonymousIdentities)) {
    throw new Error("匿名身份配置格式错误：内容必须是数组。");
  }
  validateAnonymousIdentities(anonymousIdentities);

  const posts = await Promise.all(postEntries.map(async ({ id, filename }) => {
    const post = await fetchJson(
      new URL(`texts/posts/${encodeURIComponent(filename)}`, projectRoot),
      `帖子 ${filename}`
    );
    if (typeof post.meta?.["search-only"] !== "boolean") {
      throw new Error(`帖子 ${filename} 的格式错误：meta["search-only"] 必须是布尔值。`);
    }
    validateAnonymousMapping(post, filename, anonymousIdentities);
    return { ...post, id, filename };
  }));

  return { posts, users, anonymousIdentities };
}

function validatePostIndex(postIndex) {
  if (
    !postIndex
    || typeof postIndex !== "object"
    || Array.isArray(postIndex)
    || Object.keys(postIndex).length === 0
    || Object.entries(postIndex).some(([id, filename]) => (
      !/^[\da-f]{12}$/i.test(id)
      || typeof filename !== "string"
      || !filename.endsWith(".json")
    ))
  ) {
    throw new Error("帖子清单格式错误：必须是由 12 位十六进制帖子 ID 映射到 JSON 文件名的对象。");
  }

  return Object.entries(postIndex).map(([id, filename]) => ({ id, filename }));
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

  if (
    post.meta?.isAnonymous
    && Number(authorId) !== 0
    && !getUnlockedUserIds().has(Number(authorId))
  ) {
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
  const filteredPosts = posts
    .filter((post) => post.meta?.["search-only"] === false)
    .filter((post) => selectedBoard === "all" || (post.meta?.board || "未分类") === selectedBoard);

  if (filteredPosts.length === 0) {
    const emptyMessage = selectedBoard === "all"
      ? "还没有近期讨论。"
      : `「${escapeHTML(selectedBoard)}」版块暂时还没有讨论。`;
    postList.innerHTML = `<div class="empty-row">${emptyMessage}</div>`;
    return;
  }

  renderPostList(postList, filteredPosts, users, anonymousIdentities);
}

function renderPostList(postList, posts, users, anonymousIdentities) {
  postList.innerHTML = posts.map((post) => {
    const meta = post.meta ?? {};
    const title = escapeHTML(meta.title || "未命名帖子");
    const board = escapeHTML(meta.board || "未分类");
    const authorName = escapeHTML(getAuthorName(post, users, anonymousIdentities));
    const replyCount = Array.isArray(post.replies) ? post.replies.length : 0;
    const pinned = meta.pinned ? '<span class="post-tag post-tag--pinned">置顶</span>' : "";
    const postUrl = new URL("pages/post.html", projectRoot);
    postUrl.searchParams.set("p", post.id);

    return `
      <article class="post-row">
        <div class="post-main">
          <div class="post-meta">${pinned}<span class="post-tag">${board}</span></div>
          <a class="post-title" href="${escapeHTML(postUrl.href)}">${title}</a>
          <p class="post-author">楼主：${authorName}</p>
        </div>
        <span class="post-count">${replyCount} 回复</span>
      </article>
    `;
  }).join("");
}

function normalizeSearchText(value) {
  return String(value ?? "").replace(/\s/gu, "").toLowerCase();
}

function searchPosts(posts, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return posts.filter((post) => Array.isArray(post.meta?.keywords)
    && post.meta.keywords.some((keyword) => (
      normalizeSearchText(keyword).includes(normalizedQuery)
    )));
}

function initializeSearchForm(form) {
  const input = form.querySelector('input[type="search"]');
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!normalizeSearchText(input.value)) {
      showToast("请输入要搜索的关键词。");
      input.focus();
      return;
    }

    const searchUrl = new URL("pages/search.html", projectRoot);
    searchUrl.searchParams.set("q", input.value.trim());
    window.location.assign(searchUrl.href);
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
  let selectedBoard = "兴趣爱好";
  loadForumData().then((loadedPosts) => {
    posts = loadedPosts.posts;
    users = loadedPosts.users;
    anonymousIdentities = loadedPosts.anonymousIdentities;
    renderPosts(posts, selectedBoard, users, anonymousIdentities);
  }).catch((error) => {
    document.querySelector("#recent-posts").innerHTML = `<div class="error-row">${escapeHTML(error.message)}<br>请通过静态网页服务器打开论坛，以允许浏览器读取 JSON 文件。</div>`;
  });

  initializeSearchForm(document.querySelector("[data-search-form]"));

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

async function initializeSearchPage() {
  if (localStorage.getItem(AUTH_STORAGE_KEY) !== "true") {
    window.location.replace(new URL("pages/log_in.html", projectRoot).href);
    return;
  }

  const form = document.querySelector("[data-search-form]");
  const input = form.querySelector('input[type="search"]');
  const summary = document.querySelector("#search-summary");
  const results = document.querySelector("#search-results");
  const query = new URLSearchParams(window.location.search).get("q") ?? "";
  input.value = query;
  initializeSearchForm(form);

  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    summary.textContent = "请输入关键词，搜索相关帖子。";
    results.innerHTML = '<div class="empty-row">输入关键词后即可查找帖子。</div>';
    return;
  }
  summary.textContent = `与「${query.trim()}」有关的帖子有：`;

  try {
    const { posts, users, anonymousIdentities } = await loadForumData();
    const matches = searchPosts(posts, query);
    if (matches.length === 0) {
      results.innerHTML = '<div class="empty-row">没有找到包含该关键词的帖子。</div>';
      return;
    }
    renderPostList(results, matches, users, anonymousIdentities);
  } catch (error) {
    results.innerHTML = `<div class="error-row">${escapeHTML(error.message)}<br>请通过静态网页服务器打开论坛，以允许浏览器读取 JSON 文件。</div>`;
  }
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
  const title = formatPostText(meta.title || "未命名帖子");
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
      <div class="post-detail-content">${formatPostText(post.content || "")}</div>
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
                <p>${formatPostText(reply.content || "")}</p>
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
  const postId = new URLSearchParams(window.location.search).get("p");
  if (!postId) {
    target.innerHTML = '<div class="error-row">未指定帖子。<a href="../index.html">返回论坛主页</a></div>';
    return;
  }

  try {
    const [postIndex, users, anonymousIdentities] = await Promise.all([
      fetchJson(new URL("texts/posts/index.json", projectRoot), "帖子清单"),
      fetchJson(new URL("configs/users.json", projectRoot), "用户资料"),
      fetchJson(new URL("configs/anonymous.json", projectRoot), "匿名身份")
    ]);
    const postEntries = validatePostIndex(postIndex);
    const postEntry = postEntries.find((entry) => entry.id === postId);
    if (!postEntry) {
      throw new Error("找不到这篇帖子，请从论坛主页重新选择。");
    }
    if (!Array.isArray(anonymousIdentities)) {
      throw new Error("匿名身份配置格式错误：内容必须是数组。");
    }
    validateAnonymousIdentities(anonymousIdentities);

    const post = await fetchJson(
      new URL(`texts/posts/${encodeURIComponent(postEntry.filename)}`, projectRoot),
      `帖子 ${postEntry.filename}`
    );
    validateAnonymousMapping(post, postEntry.filename, anonymousIdentities);
    if (!post.meta || !Array.isArray(post.replies) || typeof post.content !== "string") {
      throw new Error(`帖子 ${postEntry.filename} 的内容格式错误。`);
    }
    renderPostDetails(post, users, anonymousIdentities);
  } catch (error) {
    target.innerHTML = `<div class="error-row">${escapeHTML(error.message)}<br><a href="../index.html">返回论坛主页</a></div>`;
  }
}

function requireAuthentication() {
  if (localStorage.getItem(AUTH_STORAGE_KEY) === "true") return true;
  window.location.replace(new URL("pages/log_in.html", projectRoot).href);
  return false;
}

async function loadUsersForQuery() {
  const userConfig = await fetchJson(new URL("configs/users.json", projectRoot), "用户资料");
  if (!userConfig || typeof userConfig !== "object" || Array.isArray(userConfig)) {
    throw new Error("用户资料格式错误：内容必须是对象。");
  }

  const users = Object.values(userConfig).filter((user) => Number(user?.id) !== 0);
  if (users.length === 0 || users.some((user) => (
    !user
    || !Number.isInteger(user.id)
    || typeof user.nickname !== "string"
    || typeof user.gender !== "string"
    || typeof user.home !== "string"
    || typeof user.job !== "string"
    || typeof user.avatar_path !== "string"
  ))) {
    throw new Error("用户资料格式错误：待查询用户必须包含昵称、性别、家乡、职业和头像路径。");
  }

  return users;
}

function normalizeGender(gender) {
  return ({ "女": "female", "男": "male", "其他": "other" })[gender] ?? gender;
}

function genderLabel(gender) {
  return ({ female: "女", male: "男", other: "其他" })[gender] ?? gender ?? "未填写";
}

function shuffleOptions(options) {
  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function populateSelect(select, options) {
  options.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  });
}

function renderProfessionOptions(container) {
  PROFESSION_CATEGORIES.forEach((category, categoryIndex) => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "profession-category";

    const legend = document.createElement("legend");
    legend.textContent = category.name;
    fieldset.append(legend);

    const choices = document.createElement("div");
    choices.className = "profession-choices";
    shuffleOptions(category.options).forEach((job) => {
      const optionId = `profession-${categoryIndex}-${category.options.indexOf(job)}`;
      const label = document.createElement("label");
      label.className = "profession-option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "job";
      input.value = job;
      input.id = optionId;
      input.required = categoryIndex === 0 && choices.childElementCount === 0;

      const indicator = document.createElement("span");
      indicator.className = "profession-option-indicator";
      indicator.setAttribute("aria-hidden", "true");

      const text = document.createElement("span");
      text.textContent = job;

      label.htmlFor = optionId;
      label.append(input, indicator, text);
      choices.append(label);
    });
    fieldset.append(choices);
    container.append(fieldset);
  });
}

function renderQueriedUser(user, result) {
  const profileUrl = new URL("pages/user.html", projectRoot);
  profileUrl.searchParams.set("id", String(user.id));
  const avatarUrl = escapeHTML(new URL(user.avatar_path, projectRoot).href);

  result.innerHTML = `
    <p class="query-success-note">资料匹配，已解除该用户的匿名状态。</p>
    <a class="queried-user-card" href="${escapeHTML(profileUrl.href)}">
      <img src="${avatarUrl}" alt="">
      <span>${escapeHTML(user.nickname)}</span>
      <span class="queried-user-arrow" aria-hidden="true">↗</span>
    </a>
  `;
  result.hidden = false;
}

function validateMessage(message, filename, usersByNickname) {
  if (
    !message
    || typeof message.speaker1 !== "string"
    || typeof message.speaker2 !== "string"
    || message.speaker1 === message.speaker2
    || !usersByNickname.has(message.speaker1)
    || !usersByNickname.has(message.speaker2)
    || !Array.isArray(message.dialogs)
  ) {
    throw new Error(`私信 ${filename} 的参与者或对话格式错误。`);
  }

  message.dialogs.forEach((dialog, index) => {
    if (
      !dialog
      || typeof dialog.time !== "string"
      || ![1, 2].includes(dialog.start_from_speaker)
      || !Array.isArray(dialog.content)
      || dialog.content.length === 0
      || dialog.content.some((content) => typeof content !== "string")
    ) {
      throw new Error(`私信 ${filename} 的第 ${index + 1} 段对话格式错误。`);
    }
  });

  return {
    ...message,
    speaker1User: usersByNickname.get(message.speaker1),
    speaker2User: usersByNickname.get(message.speaker2)
  };
}

function renderMessageAvatar(user) {
  const avatarUrl = user.avatar_path
    ? escapeHTML(new URL(user.avatar_path, projectRoot).href)
    : "";
  if (avatarUrl) {
    return `<img class="message-avatar" src="${avatarUrl}" alt="">`;
  }
  return `<span class="message-avatar message-avatar--fallback" aria-hidden="true">${escapeHTML(user.nickname.slice(0, 1))}</span>`;
}

function renderConversation(message, viewerId) {
  const speaker1 = message.speaker1User;
  const speaker2 = message.speaker2User;
  const dialogs = message.dialogs.map((dialog) => {
    const firstSpeakerId = dialog.start_from_speaker;
    const firstSpeaker = firstSpeakerId === 1 ? speaker1 : speaker2;
    return `
      <section class="message-dialog">
        <h2 class="message-time">${escapeHTML(dialog.time)}</h2>
        <div class="message-dialog-list">
          ${dialog.content.map((content, index) => {
            const sender = index % 2 === 0
              ? firstSpeaker
              : firstSpeaker === speaker1 ? speaker2 : speaker1;
            const isViewer = Number(sender.id) === viewerId;
            return `
              <article class="message-line${isViewer ? " message-line--right" : " message-line--left"}">
                ${renderMessageAvatar(sender)}
                <div class="message-bubble-wrap">
                  <span class="message-sender">${escapeHTML(sender.nickname)}</span>
                  <p class="message-bubble">${escapeHTML(content)}</p>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }).join("");

  return `<article class="message-conversation">${dialogs}</article>`;
}

function renderConversationList(conversations, viewerId, selectedId) {
  return conversations.map((message) => {
    const otherSpeaker = message.participants.find((participant) => (
      Number(participant.id) !== viewerId
    ));
    const lastDialog = message.dialogs[message.dialogs.length - 1];
    const preview = lastDialog.content[lastDialog.content.length - 1];
    const avatar = renderMessageAvatar(otherSpeaker);
    const selected = message.id === selectedId;
    return `
      <button
        class="conversation-tab${selected ? " is-active" : ""}"
        type="button"
        role="tab"
        id="conversation-tab-${escapeHTML(message.id)}"
        aria-selected="${selected}"
        aria-controls="message-conversation-panel"
        data-message-id="${escapeHTML(message.id)}"
      >
        ${avatar}
        <span class="conversation-tab-copy">
          <strong>${escapeHTML(otherSpeaker.nickname)}</strong>
          <small>${escapeHTML(preview)}</small>
        </span>
      </button>
    `;
  }).join("");
}

function selectConversation(conversations, viewerId, messageId) {
  const conversation = conversations.find((message) => message.id === messageId);
  if (!conversation) return;

  document.querySelectorAll(".conversation-tab").forEach((tab) => {
    const selected = tab.dataset.messageId === messageId;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  const panel = document.querySelector("#message-conversation-panel");
  panel.innerHTML = renderConversation(conversation, viewerId);
  panel.setAttribute("aria-labelledby", `conversation-tab-${messageId}`);

  const url = new URL(window.location.href);
  url.searchParams.set("m", messageId);
  window.history.replaceState(null, "", url.href);
}

function initializeAdminPage() {
  if (!requireAuthentication()) return;

  document.querySelectorAll("[data-admin-unavailable]").forEach((button) => {
    button.addEventListener("click", () => showToast("该功能暂时不可用。"));
  });
}

async function initializeUserSearchPage() {
  if (!requireAuthentication()) return;

  const form = document.querySelector("[data-user-query-form]");
  const message = document.querySelector("#user-query-message");
  const result = document.querySelector("#user-query-result");
  const homeSelect = form.querySelector('[name="home"]');
  const professionOptions = form.querySelector("#profession-options");
  const submitButton = form.querySelector("button[type='submit']");
  populateSelect(homeSelect, HOME_OPTIONS);
  renderProfessionOptions(professionOptions);

  try {
    const users = await loadUsersForQuery();
    submitButton.disabled = false;
    form.addEventListener("input", clearQueryResult);
    form.addEventListener("change", clearQueryResult);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      message.classList.remove("is-success");
      result.hidden = true;

      const formData = new FormData(form);
      const nickname = String(formData.get("nickname") ?? "").trim();
      const gender = String(formData.get("gender") ?? "");
      const home = String(formData.get("home") ?? "");
      const job = String(formData.get("job") ?? "");
      const user = users.find((candidate) => (
        candidate.nickname.trim() === nickname
        && normalizeGender(candidate.gender) === gender
        && candidate.home === home
        && candidate.job === job
      ));

      if (!user) {
        message.textContent = "查询信息不正确，请检查后重试。";
        return;
      }

      try {
        unlockUser(user.id);
      } catch (error) {
        message.textContent = error.message;
        return;
      }

      message.textContent = "";
      message.classList.add("is-success");
      renderQueriedUser(user, result);
    });
  } catch (error) {
    message.textContent = error.message;
    form.querySelector("button[type='submit']").disabled = true;
  }
}

function clearQueryResult() {
  const message = document.querySelector("#user-query-message");
  const result = document.querySelector("#user-query-result");
  message.textContent = "";
  message.classList.remove("is-success");
  result.hidden = true;
}

async function initializeUserPage() {
  if (!requireAuthentication()) return;

  const target = document.querySelector("#user-profile");
  const rawUserId = new URLSearchParams(window.location.search).get("id");
  const userId = rawUserId === null || rawUserId.trim() === "" ? NaN : Number(rawUserId);
  if (!Number.isInteger(userId)) {
    target.innerHTML = '<div class="error-row">未指定有效用户。<a href="../index.html">返回论坛主页</a></div>';
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
      target.innerHTML = `
        <div class="error-row">
          该用户的资料尚未解锁。<a href="user_search.html">前往查询用户</a>
        </div>
      `;
      return;
    }

    const avatarUrl = user.avatar_path
      ? escapeHTML(new URL(user.avatar_path, projectRoot).href)
      : "";
    const avatar = avatarUrl
      ? `<img class="user-profile-avatar" src="${avatarUrl}" alt="">`
      : `<span class="user-profile-avatar user-profile-avatar--fallback" aria-hidden="true">${escapeHTML((user.nickname ?? "?").slice(0, 1))}</span>`;
    const details = [
      ["性别", genderLabel(user.gender)],
      ["家乡", user.home],
      ["职业", user.job],
      ["年龄", user.age === undefined ? "" : `${user.age} 岁`]
    ].filter(([, value]) => value !== undefined && value !== "");

    target.innerHTML = `
      <div class="user-profile-card">
        <div class="user-profile-heading">
          ${avatar}
          <div><p class="tool-eyebrow">用户资料</p><h1>${escapeHTML(user.nickname ?? "未命名用户")}</h1></div>
        </div>
        <dl class="user-profile-details">
          ${details.map(([label, value]) => `
            <div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>
          `).join("")}
        </dl>
        <a class="tool-button tool-button--secondary profile-messages-link" data-profile-messages>
          查看私信（仅管理员可用）
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    `;
    const messagesUrl = new URL("pages/messages.html", projectRoot);
    messagesUrl.searchParams.set("id", String(user.id));
    target.querySelector("[data-profile-messages]").href = messagesUrl.href;
  } catch (error) {
    target.innerHTML = `<div class="error-row">${escapeHTML(error.message)}<br><a href="../index.html">返回论坛主页</a></div>`;
  }
}

async function initializeMessagesPage() {
  if (!requireAuthentication()) return;

  const target = document.querySelector("#messages-content");
  const rawUserId = new URLSearchParams(window.location.search).get("id");
  const viewerId = rawUserId === null || rawUserId.trim() === "" ? NaN : Number(rawUserId);
  if (!Number.isInteger(viewerId) || viewerId < 0) {
    target.innerHTML = '<div class="error-row">未指定有效用户。<a href="../index.html">返回论坛主页</a></div>';
    return;
  }

  if (viewerId === 0) {
    target.innerHTML = `
      <section class="messages-empty">
        <p class="tool-eyebrow">PRIVATE MESSAGES</p>
        <h1>管理员私信</h1>
        <p>收件箱目前没有私信。</p>
      </section>
    `;
    return;
  }

  try {
    const [userConfig, messageIndex] = await Promise.all([
      fetchJson(new URL("configs/users.json", projectRoot), "用户资料"),
      fetchJson(new URL("texts/messages/index.json", projectRoot), "私信清单")
    ]);
    if (!userConfig || typeof userConfig !== "object" || Array.isArray(userConfig)) {
      throw new Error("用户资料格式错误：内容必须是对象。");
    }
    if (!messageIndex || typeof messageIndex !== "object" || Array.isArray(messageIndex)) {
      throw new Error("私信清单格式错误：内容必须是对象。");
    }

    const usersByNickname = new Map(
      Object.values(userConfig).map((user) => [user.nickname, user])
    );
    const user = Object.values(userConfig).find((candidate) => Number(candidate.id) === viewerId);
    if (!user) throw new Error("找不到该用户。");

    const entries = Object.entries(messageIndex);
    if (entries.some(([messageId, filename]) => (
      !/^msg-[\da-z-]+$/i.test(messageId)
      || typeof filename !== "string"
      || !/^msg-[\da-z-]+\.json$/i.test(filename)
    ))) {
      throw new Error("私信清单格式错误：ID 或文件名格式无效。");
    }

    const conversations = await Promise.all(entries.map(async ([id, filename]) => {
      const rawMessage = await fetchJson(
        new URL(`texts/messages/${encodeURIComponent(filename)}`, projectRoot),
        `私信 ${filename}`
      );
      const message = validateMessage(rawMessage, filename, usersByNickname);
      return {
        id,
        ...message,
        participants: [message.speaker1User, message.speaker2User]
      };
    }));

    const userConversations = conversations.filter((message) => (
      message.participants.some((participant) => Number(participant.id) === viewerId)
    ));
    const unlockedUsers = getUnlockedUserIds();
    const visibleConversations = userConversations.filter((message) => (
      message.participants.every((participant) => (
        Number(participant.id) === 0 || unlockedUsers.has(Number(participant.id))
      ))
    ));

    if (visibleConversations.length === 0 && userConversations.length > 0) {
      target.innerHTML = `
        <section class="messages-locked">
          <p class="tool-eyebrow">PRIVATE MESSAGES</p>
          <h1>私信暂不可查看</h1>
          <p>只有对话双方的匿名状态都解除后，管理员才能查看这段私信。</p>
          <a class="tool-button" href="user_search.html">前往查询用户</a>
        </section>
      `;
      return;
    }

    if (visibleConversations.length === 0) {
      target.innerHTML = `
        <section class="messages-empty">
          <p class="tool-eyebrow">PRIVATE MESSAGES</p>
          <h1>${escapeHTML(user.nickname)} 的私信</h1>
          <p>暂时没有可显示的对话。</p>
          <a class="message-back-link" href="user.html?id=${viewerId}">返回用户主页</a>
        </section>
      `;
      return;
    }

    const requestedMessageId = new URLSearchParams(window.location.search).get("m");
    const selectedMessageId = visibleConversations.some((message) => message.id === requestedMessageId)
      ? requestedMessageId
      : visibleConversations[0].id;
    target.innerHTML = `
      <header class="messages-page-heading">
        <div>
          <p class="tool-eyebrow">PRIVATE MESSAGES</p>
          <h1>${escapeHTML(user.nickname)} 的私信</h1>
        </div>
        <a class="message-back-link" href="user.html?id=${viewerId}">返回用户主页</a>
      </header>
      <div class="messages-inbox-layout">
        <aside class="conversation-sidebar">
          <h2>对话 </h2>
          <div class="conversation-tabs" role="tablist" aria-label="选择私信对话">
            ${renderConversationList(visibleConversations, viewerId, selectedMessageId)}
          </div>
        </aside>
        <section
          id="message-conversation-panel"
          class="message-conversation-panel"
          role="tabpanel"
          aria-live="polite"
        ></section>
      </div>
    `;
    target.querySelectorAll(".conversation-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        selectConversation(visibleConversations, viewerId, tab.dataset.messageId);
      });
    });
    selectConversation(visibleConversations, viewerId, selectedMessageId);
    document.title = `${user.nickname} 的私信 — 炼金术师论坛`;
  } catch (error) {
    target.innerHTML = `<div class="error-row">${escapeHTML(error.message)}<br><a href="user.html?id=${viewerId}">返回用户主页</a></div>`;
  }
}

const pageType = document.body.dataset.page;
if (pageType === "login") initializeLoginPage();
if (pageType === "home") initializeHomePage();
if (pageType === "post") initializePostPage();
if (pageType === "search") initializeSearchPage();
if (pageType === "admin") initializeAdminPage();
if (pageType === "user-search") initializeUserSearchPage();
if (pageType === "user") initializeUserPage();
if (pageType === "messages") initializeMessagesPage();
