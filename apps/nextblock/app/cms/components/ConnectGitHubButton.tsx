'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, Github, Loader2 } from 'lucide-react';
import { Button } from '@nextblock-cms/ui';
import { startGithubConnect, pollGithubConnect } from './github-connect-actions';

type Phase = 'idle' | 'starting' | 'awaiting' | 'installed' | 'error';

/**
 * One-click "Connect GitHub" via the OAuth device flow. On authorization, the server
 * installs the upstream-sync workflow into the repo (the file Vercel's clone strips).
 * No PAT, no env config — the public client id is baked into the app.
 */
export default function ConnectGitHubButton() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [userCode, setUserCode] = useState('');
  const [verificationUri, setVerificationUri] = useState('https://github.com/login/device');
  const [error, setError] = useState('');

  // Cancel any in-flight polling when the component unmounts.
  const activeRef = useRef(false);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const poll = useCallback(async (intervalMs: number) => {
    if (!activeRef.current) return;
    const result = await pollGithubConnect();
    if (!activeRef.current) return;

    if (result.status === 'installed') {
      setPhase('installed');
      // Re-render the dashboard so the onboarding step picks up the now-active workflow
      // (the step then flips to done and this control is replaced).
      router.refresh();
      return;
    }
    if (result.status === 'error') {
      setError(result.error);
      setPhase('error');
      return;
    }
    // pending — back off a little on slow_down, then poll again.
    const next = result.slowDown ? intervalMs + 5000 : intervalMs;
    setTimeout(() => void poll(next), next);
  }, [router]);

  const connect = useCallback(async () => {
    setError('');
    setPhase('starting');
    const res = await startGithubConnect();
    if (!activeRef.current) return;
    if (!res.ok || !res.userCode) {
      setError(res.error ?? 'Could not start GitHub connect.');
      setPhase('error');
      return;
    }
    setUserCode(res.userCode);
    if (res.verificationUri) setVerificationUri(res.verificationUri);
    setPhase('awaiting');
    const intervalMs = Math.max((res.interval ?? 5) + 1, 5) * 1000;
    setTimeout(() => void poll(intervalMs), intervalMs);
  }, [poll]);

  if (phase === 'installed') {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <Check className="h-4 w-4" />
        Connected — workflow installed
      </div>
    );
  }

  if (phase === 'awaiting') {
    return (
      <div className="flex flex-col items-end gap-1.5 text-right">
        <Button asChild size="sm" variant="outline">
          <a href={verificationUri} target="_blank" rel="noopener noreferrer">
            Authorize on GitHub
            <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          Enter code{' '}
          <span className="font-mono font-semibold tracking-wider text-foreground">{userCode}</span>
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Waiting for authorization…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={() => void connect()}
        disabled={phase === 'starting'}
        className="shrink-0"
      >
        {phase === 'starting' ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Github className="mr-1 h-3.5 w-3.5" />
        )}
        {phase === 'starting' ? 'Starting…' : 'Connect GitHub'}
      </Button>
      {phase === 'error' && (
        <p className="max-w-[16rem] text-right text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
