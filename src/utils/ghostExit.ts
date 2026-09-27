// Exit animation for conditionally-mounted overlays. React removes a closed
// dialog in a single commit, so ~40 `{open && <Modal />}` call sites vanish
// with no exit. Instead of giving each one a closing state, one observer
// re-inserts an inert clone of any overlay React just removed, plays the
// `.ghost-exit` animation on it (index.css), then deletes the clone.
// Overlays that run their own exit (settings drawer, `.is-exiting`) are skipped.

const OVERLAY_SELECTOR =
  '.modal-overlay, .modal-backdrop, .wa-action-sheet-backdrop, .note-modal-backdrop, ' +
  '.ops-drawer-overlay, .ops-drawer-backdrop, .ops-overlay';
const MAX_GHOST_MS = 450;

export function installGhostExit(): () => void {
  // A detached node reports scrollTop 0, so remember scroll positions while
  // the overlay is still live and restore them on the clone -- otherwise a
  // scrolled sheet would jump to its top as it animates out.
  const scrollTops = new WeakMap<Element, number>();
  const onScroll = (e: Event) => {
    if (e.target instanceof Element) scrollTops.set(e.target, e.target.scrollTop);
  };
  document.addEventListener('scroll', onScroll, true);

  const ghost = (node: HTMLElement, parent: Node, before: Node | null) => {
    const clone = node.cloneNode(true) as HTMLElement;
    // Iframes would reload and media would replay; a blank gap for 200ms is fine.
    clone.querySelectorAll('iframe, video, audio, canvas').forEach((el) => el.remove());
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    clone.removeAttribute('id');
    clone.classList.add('ghost-exit');
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    parent.insertBefore(clone, before && before.parentNode === parent ? before : null);

    const srcEls = node.querySelectorAll('*');
    const dstEls = clone.querySelectorAll('*');
    if (srcEls.length === dstEls.length) {
      srcEls.forEach((el, i) => {
        const top = scrollTops.get(el);
        if (top) dstEls[i].scrollTop = top;
      });
    }

    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      clone.remove();
    };
    clone.addEventListener('animationend', (e) => {
      if (e.target === clone) remove();
    });
    window.setTimeout(remove, MAX_GHOST_MS);
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (!record.target.isConnected) continue;
      record.removedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        // isConnected: React moved the node rather than unmounting it.
        if (node.isConnected || !node.matches(OVERLAY_SELECTOR)) return;
        if (node.classList.contains('ghost-exit') || node.classList.contains('is-exiting') || node.hasAttribute('data-no-ghost')) return;
        ghost(node, record.target, record.nextSibling);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    document.removeEventListener('scroll', onScroll, true);
  };
}
