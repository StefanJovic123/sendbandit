'use client'

import Link from 'next/link'
import {
  IconDotsVertical,
  IconPencil,
  IconCopy,
  IconTrash,
  IconPlayerPlay,
  IconPlayerPause,
  IconUsers,
  IconCheck,
  IconCalendar,
  IconClockHour4,
  IconBolt,
} from '@tabler/icons-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import type { CampaignWithStats } from '@/lib/actions/campaigns'

const statusConfig: Record<
  CampaignWithStats['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  scheduled: { label: 'Scheduled', variant: 'outline' },
  active: { label: 'Active', variant: 'default' },
  paused: { label: 'Paused', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

const typeIcons: Record<CampaignWithStats['type'], typeof IconCalendar> = {
  one_time: IconCalendar,
  recurring: IconClockHour4,
  triggered: IconBolt,
}

const typeLabels: Record<CampaignWithStats['type'], string> = {
  one_time: 'One-time',
  recurring: 'Recurring',
  triggered: 'Triggered',
}

interface CampaignCardProps {
  campaign: CampaignWithStats
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const status = statusConfig[campaign.status]
  const TypeIcon = typeIcons[campaign.type]

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <TypeIcon className="size-5 text-muted-foreground" />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <IconDotsVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/campaigns/${campaign.id}/edit`}>
                  <IconPencil className="mr-2 size-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconCopy className="mr-2 size-4" />
                Duplicate
              </DropdownMenuItem>
              {campaign.status === 'draft' && (
                <DropdownMenuItem>
                  <IconPlayerPlay className="mr-2 size-4" />
                  Activate
                </DropdownMenuItem>
              )}
              {campaign.status === 'active' && (
                <DropdownMenuItem>
                  <IconPlayerPause className="mr-2 size-4" />
                  Pause
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <IconTrash className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="space-y-1 pt-2">
          <CardTitle className="line-clamp-1">
            <Link href={`/campaigns/${campaign.id}`} className="hover:underline">
              {campaign.name}
            </Link>
          </CardTitle>
          {campaign.description && (
            <CardDescription className="line-clamp-2">
              {campaign.description}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium">{campaign.clientName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{typeLabels[campaign.type]}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <IconUsers className="size-4 text-muted-foreground" />
                <span className="text-lg font-semibold">{campaign.enrolledCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Enrolled</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <IconCheck className="size-4 text-muted-foreground" />
                <span className="text-lg font-semibold">{campaign.completedCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex w-full items-center justify-between">
          <Badge variant={status.variant}>{status.label}</Badge>
          <span className="text-xs text-muted-foreground">
            Updated {new Date(campaign.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
