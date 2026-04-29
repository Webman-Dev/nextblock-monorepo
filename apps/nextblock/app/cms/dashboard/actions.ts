'use server'

import { createClient } from "@nextblock-cms/db/server";
import { formatDistanceToNow, startOfMonth, subMonths } from 'date-fns';

export type DashboardStats = {
  totalPages: number;
  totalPosts: number;
  totalUsers: number;
  isEcommerceActive: boolean;
  isAiActive: boolean;
  ecommerce?: {
    monthlyRevenue: number;
    taxLiability: number;
    recentSales: any[];
    revenueTrend?: {
      value: string;
      positive: boolean;
    };
  };
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
  const supabase = await createClient();
  const now = new Date().toISOString();
  const firstOfMonth = startOfMonth(new Date()).toISOString();
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();

  // 1. Check Package Activations
  const { data: activations } = await supabase
    .from('package_activations')
    .select('package_id, status')
    .eq('status', 'active');

  const activePackages = new Set(activations?.map(a => a.package_id) || []);
  const isEcommerceActive = activePackages.has('ecommerce');
  const isAiActive = activePackages.has('cortex-ai');

  // 2. Parallelize Core Queries
  const queries: PromiseLike<any>[] = [
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

    // Scheduled Posts
    supabase.from('posts')
      .select('title, published_at')
      .gt('published_at', now)
      .order('published_at', { ascending: true })
      .limit(5)
  ];

  // 3. Add Ecommerce Queries if active
  if (isEcommerceActive) {
    queries.push(
      // Monthly Revenue (Paid orders this month)
      supabase.from('orders')
        .select('total')
        .eq('status', 'paid')
        .gte('created_at', firstOfMonth),
      
      // Tax Liability (Total taxes this month)
      supabase.from('orders')
        .select('tax_total')
        .eq('status', 'paid')
        .gte('created_at', firstOfMonth),

      // Recent Sales Ledger
      supabase.from('orders')
        .select(`
          id, 
          total, 
          currency, 
          created_at, 
          status, 
          provider, 
          customer_details,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(10),

      // Last Month Revenue
      supabase.from('orders')
        .select('total')
        .eq('status', 'paid')
        .gte('created_at', lastMonthStart)
        .lt('created_at', firstOfMonth)
    );
  }

  const results = await Promise.all(queries);

  // Error checking
  results.forEach((res, i) => {
    if (res.error) {
      console.error(`Dashboard query ${i} failed:`, res.error);
    }
  });

  const totalPages = results[0].count;
  const totalPosts = results[1].count;
  const totalUsers = results[2].count;
  const recentPosts = results[3].data;
  const recentPages = results[4].data;
  const scheduledPosts = results[5].data;

  let ecommerceData = undefined;
  if (isEcommerceActive && results.length >= 10) {
    const revenueData = results[6].data;
    const taxData = results[7].data;
    const orders = (results[8].data as any[]) || [];
    const lastMonthRevenueData = results[9]?.data || [];

    // Fetch Profiles separately for orders (no direct FK between orders and profiles)
    const userIds = Array.from(new Set(orders.map(o => o.user_id).filter(Boolean)));
    const profilesMap = new Map();
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      profiles?.forEach(p => profilesMap.set(p.id, p));
    }

    const recentSales = orders.map(order => ({
      ...order,
      profiles: order.user_id ? profilesMap.get(order.user_id) : null
    }));

    const monthlyRevenue = (revenueData || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    const taxLiability = (taxData || []).reduce((sum: number, o: any) => sum + (o.tax_total || 0), 0);
    const lastMonthRevenue = lastMonthRevenueData.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    let revenueTrend = undefined;
    if (lastMonthRevenue > 0) {
      const percentageChange = ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
      revenueTrend = {
        value: `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`,
        positive: percentageChange >= 0
      };
    } else if (monthlyRevenue > 0) {
      revenueTrend = {
        value: '+100%',
        positive: true
      };
    } else {
      revenueTrend = {
        value: '0%',
        positive: true
      };
    }

    ecommerceData = {
      monthlyRevenue,
      taxLiability,
      recentSales,
      revenueTrend
    };
  }

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
      author: 'System',
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
    isEcommerceActive,
    isAiActive,
    ecommerce: ecommerceData,
    recentContent: combinedRecent,
    scheduledContent: processedScheduled
  };
}
