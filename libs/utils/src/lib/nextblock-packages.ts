export const NEXTBLOCK_PACKAGES = {
  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce Pro',
    description: 'Full-featured digital store with Stripe & Lemon Squeezy.',
    ls_variant_id: '1317020', // Hardcoded from Lemon Squeezy
    purchase_url: 'https://nextblock.ca/pricing', // Fallback link
  },
  // Future packages (e.g. AI Agents) will be added here
} as const;

export type PackageId = keyof typeof NEXTBLOCK_PACKAGES;
export type PackageDef = typeof NEXTBLOCK_PACKAGES[PackageId];

export function getPackageById(id: string): PackageDef | undefined {
  return NEXTBLOCK_PACKAGES[id as PackageId];
}

export function getPackageByVariantId(variantId: string | number): PackageDef | undefined {
  const vid = String(variantId);
  return Object.values(NEXTBLOCK_PACKAGES).find(p => p.ls_variant_id === vid);
}
