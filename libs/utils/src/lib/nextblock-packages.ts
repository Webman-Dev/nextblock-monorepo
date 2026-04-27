export const NEXTBLOCK_PACKAGES = {
  ecommerce: {
    id: 'ecommerce',
    name: 'NextBlock™ Commerce Pro',
    description: 'Full-featured digital store with Stripe & Freemius.',
    fm_product_id: '24851', // Product ID for NextBlock™ Commerce Pro
    fm_plan_id: '41208', // $25/month or $250/year
    purchase_url: 'https://nextblock.ca',
  },
  ai: {
    id: 'ai',
    name: 'NextBlock™ AI Intelligence',
    description: 'Native JSONB block generation and OpenRouter integration.',
    purchase_url: 'https://nextblock.dev',
  }
} as const;

export type PackageId = keyof typeof NEXTBLOCK_PACKAGES;
export type PackageDef = typeof NEXTBLOCK_PACKAGES[PackageId];

export function getPackageById(id: string): PackageDef | undefined {
  return NEXTBLOCK_PACKAGES[id as PackageId];
}

export function getPackageByFreemiusId(productId: string | number): PackageDef | undefined {
  const pid = String(productId);
  return Object.values(NEXTBLOCK_PACKAGES).find(p => p.fm_product_id === pid);
}
