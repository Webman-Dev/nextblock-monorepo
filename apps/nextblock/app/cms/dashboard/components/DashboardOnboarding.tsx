'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@nextblock-cms/ui';
import { ArrowRight, CheckCircle2, Circle, X } from 'lucide-react';
import type { OnboardingStatus } from '../../../../lib/onboarding/status';
import ConnectGitHubButton from '../../components/ConnectGitHubButton';

export default function DashboardOnboarding({
  status,
  dismissAction,
}: {
  status: OnboardingStatus;
  dismissAction: (dismissed: boolean) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  if (status.dismissed) return null;

  const pct = status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0;
  const allDone = status.completed >= status.total;

  const dismiss = () => {
    startTransition(async () => {
      await dismissAction(true);
    });
  };

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {allDone ? '🎉 Your site is ready' : 'Finish setting up your site'}
            </CardTitle>
            <CardDescription>
              {allDone
                ? 'Every recommended step is complete. You can dismiss this checklist.'
                : 'Complete these steps to get the most out of NextBlock. You can do them in any order.'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={dismiss}
            disabled={isPending}
            aria-label="Dismiss onboarding checklist"
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {status.completed} of {status.total} complete
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ul className="divide-y">
          {status.steps.map((step) => (
            <li key={step.key} className="flex items-center gap-3 py-3">
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      step.done ? 'text-muted-foreground line-through' : ''
                    }`}
                  >
                    {step.title}
                  </span>
                  {step.optional && (
                    <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {!step.done && step.key !== 'admin' && (
                step.connectGithub ? (
                  <ConnectGitHubButton />
                ) : (
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    {step.isExternal ? (
                      <a href={step.href} target="_blank" rel="noopener noreferrer">
                        Set up
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <Link href={step.href}>
                        Set up
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    )}
                  </Button>
                )
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
