// app/unauthorized/page.tsx
'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const error = searchParams.get('error');
  const path = searchParams.get('path');
  const required = searchParams.get('required');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
      <p className="text-xl mb-2">You do not have the necessary permissions to view this page.</p>
      {path && <p className="text-md text-gray-700">Requested path: <code className="bg-gray-200 p-1 rounded">{path}</code></p>}
      {required && <p className="text-md text-gray-700">Required role(s): <code className="bg-gray-200 p-1 rounded">{required.split(',').join(' OR ')}</code></p>}
      {reason && <p className="text-sm text-gray-500 mt-1">Details: {reason}</p>}
      {error && <p className="text-sm text-red-500 mt-1">Error code: {error}</p>}
      <p className="mb-6 mt-4">Please contact your administrator if you believe this is an error.</p>
      <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
        Go to Homepage
      </Link>
    </div>
  );
}