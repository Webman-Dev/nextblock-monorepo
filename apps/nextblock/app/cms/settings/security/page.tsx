// app/cms/settings/security/page.tsx
import { getSecurityPanelData } from './actions';
import SecurityPanel from './components/SecurityPanel';

export default async function SecuritySettingsPage() {
  const data = await getSecurityPanelData();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SecurityPanel data={data} />
    </div>
  );
}
