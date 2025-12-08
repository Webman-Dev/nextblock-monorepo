import React from 'react'
import Link from 'next/link'
import { Button } from '@nextblock-cms/ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@nextblock-cms/ui'
import { MoreHorizontal, PlusCircle, Edit3, Image as ImageIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@nextblock-cms/ui'
import { getLogos } from './actions'
import MediaImage from '@/app/cms/media/components/MediaImage'
import DeleteLogoButton from './components/DeleteLogoButton'

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || ''

export default async function CmsLogosListPage() {
  const logos = await getLogos()

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Manage Logos</h1>
        <Button variant="default" asChild>
          <Link href="/cms/settings/logos/new">
            <PlusCircle className="mr-2 h-4 w-4" /> New Logo
          </Link>
        </Button>
      </div>

      {logos.length === 0 ? (
        <div className="text-center py-10 border rounded-lg">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium">No logos found.</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating a new logo.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/cms/settings/logos/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Logo
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logos.map(logo => (
                <TableRow key={logo.id}>
                  <TableCell>
                    {logo.media ? (
                      <MediaImage
                        src={`${R2_BASE_URL}/${logo.media.object_key}`}
                        alt={logo.media.alt_text || logo.name}
                        width={logo.media.width || 100}
                        height={logo.media.height || 100}
                        className="max-w-16 max-h-16 object-contain"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{logo.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(logo.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/cms/settings/logos/${logo.id}/edit`}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DeleteLogoButton logoId={logo.id} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}