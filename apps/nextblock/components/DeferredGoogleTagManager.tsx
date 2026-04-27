"use client";

import { useEffect, useState } from "react";
import { GoogleTagManager } from "@next/third-parties/google";

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

export function DeferredGoogleTagManager({
  gtmId,
  nonce,
}: DeferredGoogleTagManagerProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!gtmId) {
      return;
    }

    const enableGtm = () => {
      setShouldLoad(true);
    };

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, enableGtm, {
        once: true,
        passive: true,
      });
    });

    return () => {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, enableGtm);
      });
    };
  }, [gtmId]);

  if (!gtmId || !shouldLoad) {
    return null;
  }

  return <GoogleTagManager gtmId={gtmId} nonce={nonce} />;
}
