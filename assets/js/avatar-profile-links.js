(() => {
  const UNLOCKED_USERS_STORAGE_KEY = "alchemist-forum-unlocked-users";
  const projectRoot = new URL("../../", document.currentScript.src);

  function showToast(message) {
    const toast = document.querySelector(".toast");
    if (!toast) {
      throw new Error("Avatar profile links require a .toast status element.");
    }

    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  function isUserProfileAvailable(userId) {
    if (userId === 0 || userId > 6) return true;

    let storedValue;
    try {
      storedValue = localStorage.getItem(UNLOCKED_USERS_STORAGE_KEY);
    } catch {
      return null;
    }
    if (storedValue === null) return false;

    let unlockedUserIds;
    try {
      unlockedUserIds = JSON.parse(storedValue);
    } catch {
      return null;
    }
    if (
      !Array.isArray(unlockedUserIds)
      || unlockedUserIds.some((id) => !Number.isInteger(id) || id < 1)
    ) {
      return null;
    }

    return unlockedUserIds.includes(userId);
  }

  function openUserProfile(avatar) {
    const userId = Number(avatar.dataset.profileUserId);
    if (!Number.isInteger(userId) || userId < 0) return;

    const available = isUserProfileAvailable(userId);
    if (available === null) {
      showToast("无法确认用户解锁状态，请刷新页面后重试。");
      return;
    }
    if (!available) {
      showToast("暂时无法查看此用户的个人主页。");
      return;
    }

    const profileUrl = new URL("pages/user.html", projectRoot);
    profileUrl.searchParams.set("id", String(userId));
    window.location.assign(profileUrl.href);
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const avatar = target.closest("[data-profile-user-id]");
    if (!avatar) return;

    event.preventDefault();
    event.stopPropagation();
    openUserProfile(avatar);
  });
})();
