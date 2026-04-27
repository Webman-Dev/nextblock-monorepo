"use client";

import { useEffect, useState, type ComponentType } from "react";

type SpeedInsightsComponent = ComponentType<Record<string, never>>;
type IdleCallbackHandle = number;
type IdleCapableWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => IdleCallbackHandle;
    cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
  };

export function DeferredSpeedInsights() {
  const [SpeedInsights, setSpeedInsights] =
    useState<SpeedInsightsComponent | null>(null);

  useEffect(() => {
    const browserWindow = window as IdleCapableWindow;
    let isMounted = true;
    let idleCallbackId: IdleCallbackHandle | null = null;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

    function loadSpeedInsights() {
      void import("@vercel/speed-insights/next").then(({ SpeedInsights }) => {
        if (isMounted) {
          setSpeedInsights(() => SpeedInsights as SpeedInsightsComponent);
        }
      });
    }

    function scheduleLoad() {
      if (typeof browserWindow.requestIdleCallback === "function") {
        idleCallbackId = browserWindow.requestIdleCallback(loadSpeedInsights, {
          timeout: 3_000,
        });
        return;
      }

      timeoutId = globalThis.setTimeout(loadSpeedInsights, 1_500);
    }

    if (document.readyState === "complete") {
      scheduleLoad();
    } else {
      window.addEventListener("load", scheduleLoad, { once: true });
    }

    return () => {
      isMounted = false;
      window.removeEventListener("load", scheduleLoad);

      if (
        idleCallbackId !== null &&
        typeof browserWindow.cancelIdleCallback === "function"
      ) {
        browserWindow.cancelIdleCallback(idleCallbackId);
      }

      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, []);

  return SpeedInsights ? <SpeedInsights /> : null;
}
