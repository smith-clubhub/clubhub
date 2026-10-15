"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus, X } from "lucide-react";
import { BrandMark } from "@/components/ig/brand";

/** Registers public/sw.js in production builds (dev keeps it off so HMR never serves stale code). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "clubhub.install-dismissed-at";
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

/**
 * "Install ClubHub" card. Android/Chrome: one-tap install via the browser's
 * prompt. iPhone Safari (no install API): Share → Add to Home Screen steps.
 * Hidden once installed, on desktop, or for 14 days after a dismiss.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIOS && isSafari) setMode("ios");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setMode("hidden");
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage blocked -- it just shows again next visit.
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setMode("hidden");
    else dismiss();
  }

  if (mode === "hidden") return null;

  return (
    <div className="relative mx-3 my-3 flex items-center gap-3 rounded-3xl border bg-card p-3 pr-10 shadow-sm md:hidden">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-[32%] brand-gradient text-white">
        <BrandMark size={28} />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Get the ClubHub app</p>
        {mode === "ios" ? (
          <p className="text-muted-foreground">
            Tap <Share className="inline size-4 align-text-bottom text-primary" /> then{" "}
            <span className="whitespace-nowrap font-semibold text-foreground">
              Add to Home Screen <SquarePlus className="inline size-4 align-text-bottom" />
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground">Install it on your home screen — it&apos;s free.</p>
        )}
      </div>
      {mode === "android" && (
        <button onClick={install} className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Install
        </button>
      )}
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 p-1.5 text-muted-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}
