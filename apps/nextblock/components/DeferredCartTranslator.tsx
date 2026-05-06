"use client";

import { useEffect, useState, type ComponentType } from "react";

type CartTranslatorComponent = ComponentType<Record<string, never>>;

function scheduleIdleWork(callback: () => void) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const browserWindow = window as Window & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (browserWindow.requestIdleCallback && browserWindow.cancelIdleCallback) {
    const idleId = browserWindow.requestIdleCallback(callback, { timeout: 3_000 });
    return () => browserWindow.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(callback, 2_000);
  return () => window.clearTimeout(timeoutId);
}

export function DeferredCartTranslator() {
  const [CartTranslator, setCartTranslator] =
    useState<CartTranslatorComponent | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cancelIdleWork = scheduleIdleWork(() => {
      void import("./CartTranslator").then((module) => {
        if (!cancelled) {
          setCartTranslator(() => module.CartTranslator as CartTranslatorComponent);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelIdleWork?.();
    };
  }, []);

  return CartTranslator ? <CartTranslator /> : null;
}
