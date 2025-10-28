import LogoForm from '../../components/LogoForm'
import { updateLogo, getLogoById } from '../../actions'
import { notFound } from 'next/navigation'

export default async function EditLogoPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const logo = await getLogoById(params.id)

  if (!logo) {
    notFound()
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Edit Logo</h1>
      <LogoForm logo={logo} action={updateLogo as any} />
    </div>
  )
}