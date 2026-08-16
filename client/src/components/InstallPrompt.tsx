import { Button } from "@/components/ui/button";
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "benchlens.install.dismissed";
/** Shown once per session at most, and never within the first few seconds. */
const SEEN_KEY = "benchlens.install.seen";
const APPEAR_DELAY_MS = 4000;
/** Auto-collapse to a bare pill so the prompt stops covering a row. */
const COLLAPSE_AFTER_MS = 9000;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes this instead of display-mode.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * Install affordance for the mobile form factor.
 *
 * Chromium fires `beforeinstallprompt`, so we can offer a real one-tap install.
 * iOS Safari never fires it and has no install API at all, so the only honest
 * thing to do there is show the actual manual steps rather than a button that
 * silently does nothing.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");
  /* Gate on a timer so the prompt never competes with first paint, and collapse
     it afterwards: an install banner that permanently covers the last row of a
     list is a worse offence than never offering the install at all. */
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(SEEN_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS never fires beforeinstallprompt, so it gets the manual steps instead.
    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        setReady(true);
        sessionStorage.setItem(SEEN_KEY, "1");
        if (isIos()) setShowIosHint(true);
      }, APPEAR_DELAY_MS),
    );
    timers.push(window.setTimeout(() => setCollapsed(true), APPEAR_DELAY_MS + COLLAPSE_AFTER_MS));

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  const visible = ready && !dismissed && (deferred !== null || showIosHint);
  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  /* Collapsed state: a single pill pinned to the right, clear of the list. */
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="anim-install fixed right-3 z-50 flex items-center gap-1.5 rounded-full hair-all bg-paper px-3 py-1.5 text-[11px] text-ink-600 shadow-frost"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 68px)" }}
      >
        <Download className="size-3 text-frost-qing" />
        安装
      </button>
    );
  }

  return (
    <div
      className="anim-install fixed inset-x-3 z-50 rounded-sm hair-all bg-paper p-3 shadow-frost"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
    >
      <div className="flex items-start gap-2.5">
        <div className="grid size-8 shrink-0 place-items-center rounded-sm bg-frost-qing/12">
          <Download className="size-4 text-frost-qing" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px]">添加到主屏幕</p>
          {deferred ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">
              安装后全屏运行，离线可查看上次加载的成绩与出处。
            </p>
          ) : (
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] leading-relaxed text-ink-500">
              在 Safari 中点按
              <Share className="inline size-3 text-ink-900" />
              分享，然后选择「添加到主屏幕」。
            </p>
          )}
          {deferred && (
            <Button
              size="sm"
              className="mt-2 h-7 gap-1 px-2.5 text-[11px]"
              onClick={async () => {
                await deferred.prompt();
                const choice = await deferred.userChoice;
                if (choice.outcome === "accepted") dismiss();
                setDeferred(null);
              }}
            >
              <Download className="size-3" />
              安装
            </Button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="关闭安装提示"
          className="-m-1 shrink-0 rounded p-1 text-ink-500 transition-colors hover:text-ink-900"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Registers the service worker in production only, and actively tears down any
 * leftover registration in development.
 *
 * A dev-registered SW is a trap: Vite's module URLs are not content-addressed,
 * so a cache-first worker will keep serving a bundle from hours ago while the
 * source on disk has moved on — the page silently reverts to an old design and
 * calls APIs whose shape has changed. Failures are non-fatal by design.
 */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (import.meta.env.DEV) {
    navigator.serviceWorker
      .getRegistrations()
      .then(regs => Promise.all(regs.map(r => r.unregister())))
      .then(() =>
        "caches" in window
          ? caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
          : undefined,
      )
      .catch(() => undefined);
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
