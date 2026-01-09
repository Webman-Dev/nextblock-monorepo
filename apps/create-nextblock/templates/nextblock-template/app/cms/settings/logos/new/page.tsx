import LogoForm from '../components/LogoForm'
import { createLogo } from '../actions'

export default function NewLogoPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Create New Logo</h1>
      <LogoForm action={createLogo} />
    </div>
  )
}