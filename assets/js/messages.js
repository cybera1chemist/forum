const MESSAGE_SHARED_LINK_URL = "https://cybera1chemist.github.io/palandu/";

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
      || !Array.isArray(dialog.content)
      || dialog.content.length === 0
      || dialog.content.some((entry) => {
        if (!entry || typeof entry.content !== "string") return true;
        if (entry.type === "notice") return "speaker" in entry;
        if (entry.type === "link") {
          return ![message.speaker1, message.speaker2].includes(entry.speaker)
            || entry.content !== "[分享链接：帕拉恩度]"
            || entry.link_text !== "帕拉恩度"
            || entry.href !== MESSAGE_SHARED_LINK_URL;
        }
        return entry.type !== undefined
          || ![message.speaker1, message.speaker2].includes(entry.speaker);
      })
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
  const profileAttributes = `data-profile-user-id="${Number(user.id)}" data-profile-route-id="${escapeHTML(user.route_id)}" title="查看${escapeHTML(user.nickname)}的个人主页"`;
  const avatarUrl = user.avatar_path
    ? escapeHTML(new URL(user.avatar_path, projectRoot).href)
    : "";
  if (avatarUrl) {
    return `<img class="message-avatar" src="${avatarUrl}" alt="" ${profileAttributes}>`;
  }
  return `<span class="message-avatar message-avatar--fallback" aria-hidden="true" ${profileAttributes}>${escapeHTML(user.nickname.slice(0, 1))}</span>`;
}

function renderConversation(message, viewerId) {
  const speaker1 = message.speaker1User;
  const speaker2 = message.speaker2User;
  const dialogs = message.dialogs.map((dialog) => {
    return `
      <section class="message-dialog">
        <h2 class="message-time">${escapeHTML(dialog.time)}</h2>
        <div class="message-dialog-list">
          ${dialog.content.map((entry) => {
            if (entry.type === "notice") {
              return `<p class="message-notice">${escapeHTML(entry.content)}</p>`;
            }

            const sender = entry.speaker === message.speaker1 ? speaker1 : speaker2;
            const isViewer = Number(sender.id) === viewerId;
            const content = entry.type === "link"
              ? `<a class="message-shared-link" href="${MESSAGE_SHARED_LINK_URL}">${escapeHTML(entry.link_text)}</a>`
              : formatPostText(entry.content);
            return `
              <article class="message-line${isViewer ? " message-line--right" : " message-line--left"}">
                ${renderMessageAvatar(sender)}
                <div class="message-bubble-wrap">
                  ${isViewer ? "" : `<span class="message-sender">${escapeHTML(sender.nickname)}</span>`}
                  <p class="message-bubble">${content}</p>
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
    const preview = lastDialog.content[lastDialog.content.length - 1].content;
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
  panel.scrollTop = panel.scrollHeight;

  const url = new URL(window.location.href);
  url.searchParams.set("m", messageId);
  window.history.replaceState(null, "", url.href);
}

async function initializeMessagesPage() {
  if (!requireAuthentication()) return;

  const target = document.querySelector("#messages-content");
  const userRouteId = new URLSearchParams(window.location.search).get("u");
  if (!/^[\da-f]{12}$/i.test(userRouteId ?? "")) {
    target.innerHTML = '<div class="error-row">未指定有效用户。<a href="../index.html">返回论坛主页</a></div>';
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
    const user = Object.values(userConfig).find((candidate) => candidate.route_id === userRouteId);
    if (!user) throw new Error("找不到该用户。");
    const viewerId = Number(user.id);
    if (!Number.isInteger(viewerId) || viewerId < 0) {
      throw new Error("用户资料格式错误：用户 ID 无效。");
    }

    if (viewerId === 0) {
      target.innerHTML = `
        <section class="messages-empty">
          <h1>管理员私信</h1>
          <p>收件箱目前没有私信。</p>
        </section>
      `;
      return;
    }

    const entries = Object.entries(messageIndex);
    if (entries.some(([messageId, filename]) => (
      !/^[\da-f]{12}$/i.test(messageId)
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
          <h1>私信暂不可查看</h1>
          <p>只有对话双方的匿名状态都解除后，管理员才能查看这段私信。</p>
          <a class="tool-button" href="user_search.html">前往解锁用户信息</a>
        </section>
      `;
      return;
    }

    if (visibleConversations.length === 0) {
      target.innerHTML = `
        <section class="messages-empty">
          <h1>${escapeHTML(user.nickname)} 的私信</h1>
          <p>暂时没有可显示的对话。</p>
          <a class="message-back-link" href="user.html?u=${encodeURIComponent(user.route_id)}">返回用户主页</a>
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
          <h1>${escapeHTML(user.nickname)} 的私信</h1>
        </div>
        <a class="message-back-link" href="user.html?u=${encodeURIComponent(user.route_id)}">返回用户主页</a>
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
    target.innerHTML = `<div class="error-row">${escapeHTML(error.message)}<br><a href="user.html?u=${encodeURIComponent(userRouteId)}">返回用户主页</a></div>`;
  }
}

initializeMessagesPage();
