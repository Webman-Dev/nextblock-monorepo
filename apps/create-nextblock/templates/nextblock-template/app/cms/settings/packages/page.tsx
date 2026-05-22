
import { NEXTBLOCK_PACKAGES } from '@nextblock-cms/utils';
import { createClient } from '@nextblock-cms/db/server';
import { ActivationForm } from './activation-form';
import { PackageCard } from './package-card';

export const dynamic = 'force-dynamic';

export default async function PackagesPage() {
  const supabase = await createClient();
  
  // Fetch all activations for this instance
  const { data: activations } = await supabase
    .from('package_activations')
    .select('package_id, status, license_key')
    .eq('status', 'active');

  const activationMap = new Map();
  if (activations) {
      activations.forEach((a: any) => activationMap.set(a.package_id, a));
  }

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Packages</h1>
        <p className="text-muted-foreground mt-2">
          Manage your premium features and licenses.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {Object.values(NEXTBLOCK_PACKAGES).map((pkg) => {
            const activation = activationMap.get(pkg.id);
            return (
                <PackageCard 
                    key={pkg.id} 
                    pkg={pkg} 
                    isActive={!!activation} 
                    licenseKey={activation?.license_key}
                />
            );
        })}
      </div>

      <ActivationForm />
    </div>
  );
}
