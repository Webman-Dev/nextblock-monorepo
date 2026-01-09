// apps/nextblock/app/cms/revisions/JsonDiffView.tsx
"use client";

import React, { useMemo } from 'react';
import { compare, type Operation } from 'fast-json-patch';

interface JsonDiffViewProps {
  oldValue: string;
  newValue: string;
  leftTitle?: string;
  rightTitle?: string;
}

function getByPointer(obj: any, pointer: string): any {
  if (!pointer || pointer === '/') return obj;
  const parts = pointer.split('/').slice(1).map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function safeStringify(v: any): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export default function JsonDiffView({ oldValue, newValue, leftTitle = 'Current', rightTitle = 'Selected' }: JsonDiffViewProps) {
  const { ops, oldObj } = useMemo(() => {
    let a: any = null, b: any = null;
    try { a = JSON.parse(oldValue); } catch { a = oldValue; }
    try { b = JSON.parse(newValue); } catch { b = newValue; }
    const operations: Operation[] = compare(a, b);
    return { ops: operations, oldObj: a };
  }, [oldValue, newValue]);

  return (
    <div className="border rounded">
      <div className="flex items-center justify-between px-3 py-2 border-b text-sm text-muted-foreground">
        <div>{leftTitle}</div>
        <div>{rightTitle}</div>
      </div>
      <div className="p-3 text-sm space-y-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-200 border border-green-300" /> Current</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-200 border border-red-300" /> Selected Version</span>
        </div>
        {ops.length === 0 && (
          <div className="text-muted-foreground">No differences.</div>
        )}
        {ops.map((op, idx) => {
          const oldAtPath = op.op !== 'add' ? getByPointer(oldObj, op.path) : undefined;
          const oldStr = op.op !== 'add' ? safeStringify(oldAtPath) : '';
          const newStr = op.op !== 'remove' ? safeStringify((op as any).value) : '';
          return (
            <div key={idx} className="rounded border">
              <div className="px-2 py-1 border-b flex items-center gap-2 text-xs">
                <span className="uppercase tracking-wide font-semibold">{op.op}</span>
                <code className="text-muted-foreground break-all">{op.path || '/'}</code>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2">
                {op.op !== 'add' && (
                  <div className="p-2 border-r md:border-r">
                    <div className="text-xs text-muted-foreground mb-1">Current</div>
                    <pre className="whitespace-pre-wrap break-words text-green-800 bg-green-50 rounded p-2 m-0">{oldStr}</pre>
                  </div>
                )}
                {op.op !== 'remove' && (
                  <div className="p-2">
                    <div className="text-xs text-muted-foreground mb-1">Selected Version</div>
                    <pre className="whitespace-pre-wrap break-words text-red-800 bg-red-50 rounded p-2 m-0">{newStr}</pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
