import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
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

// Your existing Supabase IDs
const ORG_ID = 'dc5602a1f4c3470ca6b04'
const USER_ID = '3da9044a5a5e496c80b47'

async function seed() {
  console.log('Starting seed for existing organization...')
  console.log('Organization ID:', ORG_ID)
  console.log('User ID:', USER_ID)

  // Check if clients already exist for this org
  const existingClients = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.organizationId, ORG_ID))
    .limit(1)

  if (existingClients.length > 0) {
    console.log('Data already exists for this organization, skipping seed.')
    process.exit(0)
  }

  // Create demo clients
  const clientIds = {
    acme: nanoid(),
    techCorp: nanoid(),
    retailPlus: nanoid(),
  }

  await db.insert(schema.clients).values([
    {
      id: clientIds.acme,
      organizationId: ORG_ID,
      name: 'Acme Corporation',
      description: 'Leading technology solutions provider',
      industry: 'Technology',
      timezone: 'America/New_York',
    },
    {
      id: clientIds.techCorp,
      organizationId: ORG_ID,
      name: 'TechCorp Industries',
      description: 'Enterprise software solutions',
      industry: 'Software',
      timezone: 'America/Los_Angeles',
    },
    {
      id: clientIds.retailPlus,
      organizationId: ORG_ID,
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
      organizationId: ORG_ID,
      name: 'Welcome Message',
      description: 'Sent to new subscribers when they join',
      channel: 'whatsapp',
      status: 'approved',
      currentVersionId: versionIds.welcome,
    },
    {
      id: templateIds.orderConfirm,
      organizationId: ORG_ID,
      name: 'Order Confirmation',
      description: 'Sent when a customer places an order',
      channel: 'whatsapp',
      status: 'approved',
      currentVersionId: versionIds.orderConfirm,
    },
    {
      id: templateIds.appointment,
      organizationId: ORG_ID,
      name: 'Appointment Reminder',
      description: 'Reminder sent 24 hours before appointment',
      channel: 'telegram',
      status: 'approved',
      currentVersionId: versionIds.appointment,
    },
    {
      id: templateIds.promo,
      organizationId: ORG_ID,
      name: 'Promotional Offer',
      description: 'Special discount announcement',
      channel: 'whatsapp',
      status: 'draft',
      currentVersionId: versionIds.promo,
    },
    {
      id: templateIds.support,
      organizationId: ORG_ID,
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
      createdById: USER_ID,
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
      createdById: USER_ID,
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
      createdById: USER_ID,
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
      createdById: USER_ID,
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
      createdById: USER_ID,
    },
  ])
  console.log('Created template versions')

  // Create demo campaigns
  const campaignIds = {
    welcome: nanoid(),
    promo: nanoid(),
  }

  await db.insert(schema.campaigns).values([
    {
      id: campaignIds.welcome,
      clientId: clientIds.acme,
      name: 'Welcome Series',
      description: 'Onboarding sequence for new customers',
      type: 'triggered',
      status: 'active',
      triggerType: 'event',
      triggerConfig: {
        event: {
          name: 'user.created',
        },
      },
      flowData: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'New User Signup' },
          },
          {
            id: 'send-1',
            type: 'send_message',
            position: { x: 250, y: 200 },
            data: { label: 'Send Welcome', templateId: templateIds.welcome, channel: 'whatsapp' },
          },
          {
            id: 'wait-1',
            type: 'wait',
            position: { x: 250, y: 350 },
            data: { label: 'Wait 2 Days', waitDuration: { value: 2, unit: 'days' } },
          },
          {
            id: 'send-2',
            type: 'send_message',
            position: { x: 250, y: 500 },
            data: { label: 'Send Follow-up', templateId: templateIds.orderConfirm, channel: 'whatsapp' },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'send-1' },
          { id: 'e2', source: 'send-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'send-2' },
        ],
      },
    },
    {
      id: campaignIds.promo,
      clientId: clientIds.retailPlus,
      name: 'Summer Sale Blast',
      description: 'Promotional campaign for summer discounts',
      type: 'one_time',
      status: 'draft',
      triggerType: 'manual',
      flowData: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: 'Campaign Start' },
          },
          {
            id: 'send-1',
            type: 'send_message',
            position: { x: 250, y: 200 },
            data: { label: 'Send Promo', templateId: templateIds.promo, channel: 'whatsapp' },
          },
        ],
        edges: [{ id: 'e1', source: 'trigger-1', target: 'send-1' }],
      },
    },
  ])
  console.log('Created demo campaigns')

  // Create channel connections using environment variables
  const channelConnectionIds = {
    whatsapp: nanoid(),
    telegram: nanoid(),
    discord: nanoid(),
  }

  const channelConnectionsData = []

  // WhatsApp connection (if credentials provided)
  if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    channelConnectionsData.push({
      id: channelConnectionIds.whatsapp,
      organizationId: ORG_ID,
      channel: 'whatsapp' as const,
      name: 'WhatsApp Business',
      credentials: {
        access_token: process.env.WHATSAPP_ACCESS_TOKEN,
        phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
        waba_id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
        verify_token: 'sendbandit_verify_token',
      },
      isActive: true,
      webhookUrl: `https://webhooks.sendbandit.local/whatsapp/${channelConnectionIds.whatsapp}`,
      webhookSecret: nanoid(),
    })
  }

  // Telegram connection (if credentials provided)
  if (process.env.TELEGRAM_BOT_TOKEN) {
    channelConnectionsData.push({
      id: channelConnectionIds.telegram,
      organizationId: ORG_ID,
      channel: 'telegram' as const,
      name: 'Telegram Bot',
      credentials: {
        bot_token: process.env.TELEGRAM_BOT_TOKEN,
      },
      isActive: true,
      webhookUrl: `https://webhooks.sendbandit.local/telegram/${channelConnectionIds.telegram}`,
      webhookSecret: nanoid(),
    })
  }

  // Discord connection (if credentials provided)
  if (process.env.DISCORD_BOT_TOKEN) {
    channelConnectionsData.push({
      id: channelConnectionIds.discord,
      organizationId: ORG_ID,
      channel: 'discord' as const,
      name: 'Discord Bot',
      credentials: {
        bot_token: process.env.DISCORD_BOT_TOKEN,
      },
      isActive: true,
      webhookUrl: `https://webhooks.sendbandit.local/discord/${channelConnectionIds.discord}`,
      webhookSecret: nanoid(),
    })
  }

  if (channelConnectionsData.length > 0) {
    await db.insert(schema.channelConnections).values(channelConnectionsData)
    console.log(`Created ${channelConnectionsData.length} channel connections`)
  } else {
    console.log('No channel credentials found in environment, skipping channel connections')
  }

  console.log('')
  console.log('Seed completed successfully!')
  console.log('')
  console.log('Summary:')
  console.log('- 3 clients (Acme, TechCorp, RetailPlus)')
  console.log('- 7 contacts with various channels')
  console.log('- 5 templates (WhatsApp, Telegram, Slack)')
  console.log('- 2 campaigns (Welcome Series, Summer Sale)')
  console.log(`- ${channelConnectionsData.length} channel connections`)

  process.exit(0)
}

seed().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
