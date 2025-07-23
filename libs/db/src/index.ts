// This file is the "public API" for your database library.
// It exports all the necessary clients and types that other parts of your monorepo can use.

// Export the different Supabase client instances
export * from './lib/supabase/client';
export * from './lib/supabase/middleware';
export * from './lib/supabase/ssg-client';

// Export all the generated Supabase types
export * from './lib/supabase/types';
