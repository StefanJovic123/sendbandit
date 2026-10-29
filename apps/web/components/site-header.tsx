'use client'

import { usePathname } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clients',
  '/templates': 'Templates',
  '/campaigns': 'Campaigns',
  '/analytics': 'Analytics',
  '/settings/channels': 'Channels',
  '/settings': 'Settings',
}

// Detail and form pages (/clients/new, /campaigns/:id/edit, …) take the title of their section. The longest matching
// section wins, so /settings/channels/new is "Channels".
function titleFor(pathname: string) {
  const section = Object.keys(pageTitles)
    .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0]
  return section ? pageTitles[section] : 'Dashboard'
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = titleFor(pathname)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-2 h-4" />
      <h1 className="text-base font-medium">{title}</h1>
    </header>
  )
}
