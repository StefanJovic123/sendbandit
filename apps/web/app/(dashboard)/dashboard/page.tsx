'use client'

import { OrganizationList } from '@clerk/nextjs'
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useActiveOrg } from '@/lib/hooks'

export default function DashboardPage() {
  const { isLoaded, orgId } = useActiveOrg()

  // Until Clerk has loaded the organization is unknown; showing the picker then would flash it on every load
  if (!isLoaded) {
    return null
  }

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold">Welcome to SendBandit</h1>
        <p className="mt-2 text-muted-foreground mb-6">
          Select or create an organization to get started.
        </p>

        <OrganizationList
          hidePersonal
          afterSelectOrganizationUrl="/dashboard"
          afterCreateOrganizationUrl="/dashboard"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Messages Sent</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              1,234
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="gap-1">
                <IconTrendingUp className="size-3" />
                +12.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Trending up this month <IconTrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">Last 30 days</div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Delivery Rate</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              98.5%
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="gap-1">
                <IconTrendingUp className="size-3" />
                +2.1%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Strong delivery performance <IconTrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">Last 30 days</div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Active Campaigns</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              5
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="gap-1">
                <IconTrendingDown className="size-3" />
                -2
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              2 campaigns completed <IconTrendingDown className="size-4" />
            </div>
            <div className="text-muted-foreground">Currently running</div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Contacts</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              12,456
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="gap-1">
                <IconTrendingUp className="size-3" />
                +8.3%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Growing contact base <IconTrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">Across all clients</div>
          </CardFooter>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest campaign and messaging activity</CardDescription>
        </CardHeader>
        <div className="p-6">
          <p className="text-center text-sm text-muted-foreground py-8">
            No recent activity. Start by creating a client and adding contacts.
          </p>
        </div>
      </Card>
    </div>
  )
}
