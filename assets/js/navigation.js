(() => {
  const projectRoot = new URL("../../", document.currentScript.src);
  const navigationHost = document.querySelector("#site-navigation");

  if (!navigationHost) {
    throw new Error("Navigation component host #site-navigation was not found.");
  }

  navigationHost.innerHTML = `
    <header class="site-header">
      <a class="brand" href="${projectRoot.href}" aria-label="炼金术师论坛主页">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="brand-copy"><strong>炼金术师论坛</strong></span>
      </a>
      <div class="account-menu">
        <button class="account-trigger" type="button" aria-expanded="false">
          <img src="${new URL("assets/images/rabbit_avatar.jpg", projectRoot).href}" alt="">
          <span class="account-name">【管理员】萌萌小兔兔宝宝</span>
          <span class="chevron" aria-hidden="true">⌄</span>
        </button>
        <div class="account-dropdown">
          <a href="#profile" data-unavailable>个人主页 <span>↗</span></a>
          <a href="#admin" data-unavailable>管理员功能 <span>↗</span></a>
          <button type="button" data-logout>退出登录 <span>⇥</span></button>
        </div>
      </div>
    </header>
  `;

  const accountMenu = navigationHost.querySelector(".account-menu");
  const accountTrigger = navigationHost.querySelector(".account-trigger");

  accountTrigger.addEventListener("click", () => {
    const isOpen = accountMenu.classList.toggle("is-open");
    accountTrigger.setAttribute("aria-expanded", String(isOpen));
  });

  navigationHost.querySelector("[data-logout]").addEventListener("click", () => {
    localStorage.removeItem("alchemist-forum-authenticated");
    window.location.replace(new URL("pages/log_in.html", projectRoot).href);
  });

  navigationHost.querySelectorAll("[data-unavailable]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const toast = document.querySelector(".toast");
      if (!toast) return;

      toast.textContent = "该页面正在建设中，先看看论坛主页吧。";
      toast.classList.add("is-visible");
      window.clearTimeout(window.navigationToastTimeout);
      window.navigationToastTimeout = window.setTimeout(() => {
        toast.classList.remove("is-visible");
      }, 2600);
    });
  });
})();
