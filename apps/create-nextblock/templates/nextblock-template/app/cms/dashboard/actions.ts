'use server'

import { createClient } from "@nextblock-cms/db/server";
import { formatDistanceToNow } from 'date-fns';

export type DashboardStats = {
  totalPages: number;
  totalPosts: number;
  totalUsers: number;
  recentContent: {
    type: 'post' | 'page';
    title: string;
    author: string;
    date: string;
    status: string;
  }[];
  scheduledContent: {
    title: string;
    date: string;
    type: string;
  }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // Parallelize queries
  const [
    { count: totalPages },
    { count: totalPosts },
    { count: totalUsers },
    { data: recentPosts },
    { data: recentPages },
    { data: scheduledPosts }
  ] = await Promise.all([
    supabase.from('pages').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    
    // Recent Posts
    supabase.from('posts')
      .select('title, status, updated_at, created_at, profiles(full_name)')
      .order('updated_at', { ascending: false })
      .limit(5),
      
    // Recent Pages
    supabase.from('pages')
      .select('title, status, updated_at, created_at')
      .order('updated_at', { ascending: false })
      .limit(5),

    // Scheduled Posts (published_at > now)
    supabase.from('posts')
      .select('title, published_at')
      .gt('published_at', now)
      .order('published_at', { ascending: true })
      .limit(5)
  ]);

  // Process Recent Content
  const combinedRecent = [
    ...(recentPosts?.map((p: any) => ({
      type: 'post' as const,
      title: p.title,
      author: p.profiles?.full_name || 'Unknown',
      date: p.updated_at || p.created_at,
      status: p.status
    })) || []),
    ...(recentPages?.map((p: any) => ({
      type: 'page' as const,
      title: p.title,
      author: 'System', // Pages don't always track author in this schema
      date: p.updated_at || p.created_at,
      status: p.status
    })) || [])
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
   .slice(0, 5)
   .map(item => ({
     ...item,
     date: formatDistanceToNow(new Date(item.date), { addSuffix: true })
   }));

  // Process Scheduled Content
  const processedScheduled = (scheduledPosts || []).map((p: any) => ({
    title: p.title,
    date: new Date(p.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    type: 'Post'
  }));

  return {
    totalPages: totalPages || 0,
    totalPosts: totalPosts || 0,
    totalUsers: totalUsers || 0,
    recentContent: combinedRecent,
    scheduledContent: processedScheduled
  };
}
