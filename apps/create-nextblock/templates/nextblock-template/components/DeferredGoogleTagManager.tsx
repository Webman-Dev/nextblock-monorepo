"use client";

import { useEffect, useState, type ComponentType } from "react";

interface DeferredGoogleTagManagerProps {
  gtmId?: string;
  nonce?: string;
}

const interactionEvents: Array<keyof WindowEventMap> = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
];

type GoogleTagManagerComponent = ComponentType<{
  gtmId: string;
  nonce?: string;
}>;

export function DeferredGoogleTagManager({
  gtmId,
  nonce,
}: DeferredGoogleTagManagerProps) {
  const [GoogleTagManager, setGoogleTagManager] =
    useState<GoogleTagManagerComponent | null>(null);

  useEffect(() => {
    if (!gtmId) {
      return;
    }

    let isMounted = true;

    function removeListeners() {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, enableGtm);
      });
    }

    function enableGtm() {
      removeListeners();

      void import("@next/third-parties/google").then(({ GoogleTagManager }) => {
        if (isMounted) {
          setGoogleTagManager(() => GoogleTagManager as GoogleTagManagerComponent);
        }
      });
    }

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, enableGtm, {
        once: true,
        passive: true,
      });
    });

    return () => {
      isMounted = false;
      removeListeners();
    };
  }, [gtmId]);

  if (!gtmId || !GoogleTagManager) {
    return null;
  }

  return <GoogleTagManager gtmId={gtmId} nonce={nonce} />;
}
