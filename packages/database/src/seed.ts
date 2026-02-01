import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { nanoid } from './utils'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client, { schema })

async function seed() {
  console.log('Starting seed...')

  // Check if we have any organizations already
  const existingOrgs = await db.select().from(schema.organizations).limit(1)
  if (existingOrgs.length > 0) {
    console.log('Data already exists, skipping seed.')
    process.exit(0)
  }

  // Create a demo organization
  const orgId = nanoid()
  await db.insert(schema.organizations).values({
    id: orgId,
    clerkOrgId: 'org_demo_seed',
    name: 'Demo Organization',
    slug: 'demo-org',
    logoUrl: null,
  })
  console.log('Created demo organization:', orgId)

  // Create demo clients
  const clientIds = {
    acme: nanoid(),
    techCorp: nanoid(),
    retailPlus: nanoid(),
  }

  await db.insert(schema.clients).values([
    {
      id: clientIds.acme,
      organizationId: orgId,
      name: 'Acme Corporation',
      description: 'Leading technology solutions provider',
      industry: 'Technology',
      timezone: 'America/New_York',
    },
    {
      id: clientIds.techCorp,
      organizationId: orgId,
      name: 'TechCorp Industries',
      description: 'Enterprise software solutions',
      industry: 'Software',
      timezone: 'America/Los_Angeles',
    },
    {
      id: clientIds.retailPlus,
      organizationId: orgId,
      name: 'RetailPlus',
      description: 'E-commerce and retail solutions',
      industry: 'Retail',
      timezone: 'Europe/London',
    },
  ])
  console.log('Created demo clients')

  // Create demo contacts for each client
  const contactsData = [
    // Acme Corporation contacts
    {
      id: nanoid(),
      clientId: clientIds.acme,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@acme.com',
      phone: '+1234567890',
      whatsappId: '+1234567890',
    },
    {
      id: nanoid(),
      clientId: clientIds.acme,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@acme.com',
      phone: '+1234567891',
      telegramId: 'janesmith',
    },
    {
      id: nanoid(),
      clientId: clientIds.acme,
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob.wilson@acme.com',
      phone: '+1234567892',
    },
    // TechCorp contacts
    {
      id: nanoid(),
      clientId: clientIds.techCorp,
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@techcorp.io',
      phone: '+1987654321',
      slackId: 'alice.johnson',
    },
    {
      id: nanoid(),
      clientId: clientIds.techCorp,
      firstName: 'Charlie',
      lastName: 'Brown',
      email: 'charlie@techcorp.io',
      discordId: 'charlie#1234',
    },
    // RetailPlus contacts
    {
      id: nanoid(),
      clientId: clientIds.retailPlus,
      firstName: 'Diana',
      lastName: 'Prince',
      email: 'diana@retailplus.com',
      phone: '+44123456789',
      whatsappId: '+44123456789',
    },
    {
      id: nanoid(),
      clientId: clientIds.retailPlus,
      firstName: 'Edward',
      lastName: 'King',
      email: 'edward@retailplus.com',
      instagramId: 'edward_king',
    },
  ]

  await db.insert(schema.contacts).values(contactsData)
  console.log('Created demo contacts')

  // Create demo templates
  const templateIds = {
    welcome: nanoid(),
    orderConfirm: nanoid(),
    appointment: nanoid(),
    promo: nanoid(),
    support: nanoid(),
  }

  const versionIds = {
    welcome: nanoid(),
    orderConfirm: nanoid(),
    appointment: nanoid(),
    promo: nanoid(),
    support: nanoid(),
  }

  await db.insert(schema.templates).values([
    {
      id: templateIds.welcome,
      organizationId: orgId,
      name: 'Welcome Message',
      description: 'Sent to new subscribers when they join',
      channel: 'whatsapp',
      status: 'approved',
      currentVersionId: versionIds.welcome,
    },
    {
      id: templateIds.orderConfirm,
      organizationId: orgId,
      name: 'Order Confirmation',
      description: 'Sent when a customer places an order',
      channel: 'whatsapp',
      status: 'approved',
      currentVersionId: versionIds.orderConfirm,
    },
    {
      id: templateIds.appointment,
      organizationId: orgId,
      name: 'Appointment Reminder',
      description: 'Reminder sent 24 hours before appointment',
      channel: 'telegram',
      status: 'approved',
      currentVersionId: versionIds.appointment,
    },
    {
      id: templateIds.promo,
      organizationId: orgId,
      name: 'Promotional Offer',
      description: 'Special discount announcement',
      channel: 'whatsapp',
      status: 'draft',
      currentVersionId: versionIds.promo,
    },
    {
      id: templateIds.support,
      organizationId: orgId,
      name: 'Support Ticket Update',
      description: 'Notification when support ticket is updated',
      channel: 'slack',
      status: 'approved',
      currentVersionId: versionIds.support,
    },
  ])
  console.log('Created demo templates')

  // Create template versions
  await db.insert(schema.templateVersions).values([
    {
      id: versionIds.welcome,
      templateId: templateIds.welcome,
      version: 1,
      content: {
        type: 'text',
        text: "Hi {{name}}! Welcome to {{company}}. We're excited to have you on board.",
      },
      variables: ['name', 'company'],
      createdById: 'system',
    },
    {
      id: versionIds.orderConfirm,
      templateId: templateIds.orderConfirm,
      version: 1,
      content: {
        type: 'text',
        text: 'Thank you for your order #{{order_id}}! Your order total is {{total}}.',
      },
      variables: ['order_id', 'total'],
      createdById: 'system',
    },
    {
      id: versionIds.appointment,
      templateId: templateIds.appointment,
      version: 1,
      content: {
        type: 'text',
        text: 'Hi {{name}}, this is a reminder about your appointment tomorrow at {{time}}.',
      },
      variables: ['name', 'time'],
      createdById: 'system',
    },
    {
      id: versionIds.promo,
      templateId: templateIds.promo,
      version: 1,
      content: {
        type: 'text',
        text: 'Special offer for you, {{name}}! Get {{discount}}% off with code {{promo_code}}.',
      },
      variables: ['name', 'discount', 'promo_code'],
      createdById: 'system',
    },
    {
      id: versionIds.support,
      templateId: templateIds.support,
      version: 1,
      content: {
        type: 'text',
        text: 'Your support ticket #{{ticket_id}} has been updated. Status: {{status}}',
      },
      variables: ['ticket_id', 'status'],
      createdById: 'system',
    },
  ])
  console.log('Created template versions')

  console.log('Seed completed successfully!')
  process.exit(0)
}

seed().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
