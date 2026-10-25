(() => {
  function setExternalTarget(anchor) {
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("target")) return;

    anchor.target = "_blank";
    const relValues = new Set(anchor.rel.split(/\s+/).filter(Boolean));
    relValues.add("noopener");
    relValues.add("noreferrer");
    anchor.rel = [...relValues].join(" ");
  }

  function processNode(node) {
    if (!(node instanceof Element)) return;
    if (node.matches("a")) setExternalTarget(node);
    node.querySelectorAll("a").forEach(setExternalTarget);
  }

  document.querySelectorAll("a").forEach(setExternalTarget);
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach(processNode);
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
