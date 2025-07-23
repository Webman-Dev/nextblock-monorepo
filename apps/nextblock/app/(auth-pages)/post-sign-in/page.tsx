'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PostSignIn() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect_to');

  useEffect(() => {
    if (redirectTo) {
      window.location.href = redirectTo;
    } else {
      window.location.href = '/';
    }
  }, [redirectTo]);

  return (
    <div className="flex justify-center items-center h-full w-full py-20">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-primary animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 rounded-full bg-background"></div>
        </div>
      </div>
    </div>
  );
}