"use client";

import { useEffect } from "react";

/** Protects local form drafts from links, reloads, and browser Back/Forward. */
export function useUnsavedChangesGuard(dirty: boolean, message: string) {
  useEffect(() => {
    if (!dirty) return;

    const guardId = crypto.randomUUID();
    const url = window.location.href;
    const originalState = window.history.state;
    window.history.pushState({ ...originalState, blackfruitDraftGuard: guardId }, "", url);

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const linkClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || anchor.getAttribute("target") === "_blank") return;
      if (new URL(anchor.href).origin !== window.location.origin) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const popState = (event: PopStateEvent) => {
      if (event.state?.blackfruitDraftGuard === guardId) return;
      if (window.confirm(message)) {
        window.removeEventListener("popstate", popState);
        window.history.back();
      } else {
        window.history.pushState({ ...window.history.state, blackfruitDraftGuard: guardId }, "", url);
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", linkClick, true);
    window.addEventListener("popstate", popState);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", linkClick, true);
      window.removeEventListener("popstate", popState);
    };
  }, [dirty, message]);
}
