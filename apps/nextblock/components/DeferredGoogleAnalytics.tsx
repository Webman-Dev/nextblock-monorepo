"use client";

import { useEffect, useState, type ComponentType } from "react";

interface DeferredGoogleAnalyticsProps {
  gaId?: string;
  nonce?: string;
}

const interactionEvents: Array<keyof WindowEventMap> = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
];

type GoogleAnalyticsComponent = ComponentType<{
  gaId: string;
  nonce?: string;
}>;

export function DeferredGoogleAnalytics({
  gaId,
  nonce,
}: DeferredGoogleAnalyticsProps) {
  const [GoogleAnalytics, setGoogleAnalytics] =
    useState<GoogleAnalyticsComponent | null>(null);

  useEffect(() => {
    if (!gaId) {
      return;
    }

    let isMounted = true;

    function removeListeners() {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, enableGa);
      });
    }

    function enableGa() {
      removeListeners();

      void import("@next/third-parties/google").then(({ GoogleAnalytics }) => {
        if (isMounted) {
          setGoogleAnalytics(() => GoogleAnalytics as GoogleAnalyticsComponent);
        }
      });
    }

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, enableGa, {
        once: true,
        passive: true,
      });
    });

    return () => {
      isMounted = false;
      removeListeners();
    };
  }, [gaId]);

  if (!gaId || !GoogleAnalytics) {
    return null;
  }

  return <GoogleAnalytics gaId={gaId} nonce={nonce} />;
}
