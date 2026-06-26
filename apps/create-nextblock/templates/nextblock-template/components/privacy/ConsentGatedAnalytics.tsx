'use client';

// Gates third-party analytics behind explicit consent. Until the visitor opts
// in, this renders null -> the GTM chunk is never imported and the network tab
// shows zero analytics bytes, preserving the Lighthouse budget.
import { useEffect, useRef, useState } from 'react';
import { DeferredGoogleTagManager } from '../DeferredGoogleTagManager';
import { DeferredGoogleAnalytics } from '../DeferredGoogleAnalytics';
import { CONSENT_CHANGE_EVENT, readConsent } from '../../lib/privacy/consent-client';

interface ConsentGatedAnalyticsProps {
  gtmId?: string;
  gaMeasurementId?: string;
  customScripts?: string;
  nonce?: string;
}

/** Recreate <script> elements from admin-provided markup so they actually run. */
function injectCustomScripts(markup: string, nonce?: string) {
  const parsed = new DOMParser().parseFromString(markup, 'text/html');
  parsed.querySelectorAll('script').forEach((source) => {
    const script = document.createElement('script');
    for (const attr of Array.from(source.attributes)) {
      script.setAttribute(attr.name, attr.value);
    }
    if (nonce) script.setAttribute('nonce', nonce);
    if (source.textContent) script.textContent = source.textContent;
    document.head.appendChild(script);
  });
}

export function ConsentGatedAnalytics({
  gtmId,
  gaMeasurementId,
  customScripts,
  nonce,
}: ConsentGatedAnalyticsProps) {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const injectedRef = useRef(false);

  useEffect(() => {
    const sync = () => setAnalyticsAllowed(Boolean(readConsent()?.analytics));
    sync();
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!analyticsAllowed || injectedRef.current) return;
    const markup = customScripts?.trim();
    if (!markup) return;
    injectedRef.current = true;
    try {
      injectCustomScripts(markup, nonce);
    } catch (error) {
      console.error('Failed to inject consented custom scripts:', error);
    }
  }, [analyticsAllowed, customScripts, nonce]);

  if (!analyticsAllowed) return null;
  if (!gtmId && !gaMeasurementId) return null;
  return (
    <>
      {gtmId && <DeferredGoogleTagManager gtmId={gtmId} nonce={nonce} />}
      {gaMeasurementId && (
        <DeferredGoogleAnalytics gaId={gaMeasurementId} nonce={nonce} />
      )}
    </>
  );
}
