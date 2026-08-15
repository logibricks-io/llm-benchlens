import { Button } from "@/components/ui/button";
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "benchlens.install.dismissed";

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

  useEffect(() => {
    if (isStandalone()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS gets the manual instructions, but only after a beat so it does not
    // fight the first paint.
    let timer: number | undefined;
    if (isIos()) timer = window.setTimeout(() => setShowIosHint(true), 1200);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const visible = !dismissed && (deferred !== null || showIosHint);
  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      className="fixed inset-x-3 z-50 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
    >
      <div className="flex items-start gap-2.5">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15">
          <Download className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">添加到主屏幕</p>
          {deferred ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              安装后全屏运行，离线可查看上次加载的成绩与出处。
            </p>
          ) : (
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] leading-relaxed text-muted-foreground">
              在 Safari 中点按
              <Share className="inline size-3 text-foreground" />
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
          className="-m-1 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Registers the service worker. Failures are non-fatal by design. */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

