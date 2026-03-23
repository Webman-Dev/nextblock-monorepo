// This file is the "public API" for your database library.
// It exports all the necessary clients and types that other parts of your monorepo can use.

// Export the different Supabase client instances
export * from './lib/supabase/client';
export * from './lib/supabase/types';
export * from './lib/media-actions';

// NOTE: Middleware and SSG clients are not exported here to avoid accidentally pulling 
// server-side code (like next/headers) into client bundles via this barrel file.
// Import them directly from their specific files if needed.
// export * from './lib/supabase/middleware';
// export * from './lib/supabase/ssg-client';
