import { pgTable, text, timestamp, index, uniqueIndex, integer, boolean } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
    plan: text('plan', { enum: ['free', 'starter', 'professional', 'enterprise'] })
      .notNull()
      .default('free'),
    status: text('status', { enum: ['active', 'past_due', 'cancelled', 'trialing'] })
      .notNull()
      .default('active'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end')
      .notNull()
      .default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: uniqueIndex('subscription_org_idx').on(table.organizationId),
    stripeSubIdx: uniqueIndex('subscription_stripe_sub_idx').on(table.stripeSubscriptionId),
    stripeCustIdx: index('subscription_stripe_cust_idx').on(table.stripeCustomerId),
  })
)

export const usageRecords = pgTable(
  'usage_records',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    period: text('period').notNull(), // YYYY-MM format
    messagesCount: integer('messages_count').notNull().default(0),
    contactsCount: integer('contacts_count').notNull().default(0),
    campaignsCount: integer('campaigns_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgPeriodIdx: uniqueIndex('usage_org_period_idx').on(table.organizationId, table.period),
  })
)

export const invoices = pgTable(
  'invoices',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    stripeInvoiceId: text('stripe_invoice_id').notNull().unique(),
    amount: integer('amount').notNull(), // in cents
    currency: text('currency').notNull().default('usd'),
    status: text('status', { enum: ['draft', 'open', 'paid', 'void', 'uncollectible'] })
      .notNull()
      .default('draft'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index('invoice_org_idx').on(table.organizationId),
    stripeInvIdx: uniqueIndex('invoice_stripe_inv_idx').on(table.stripeInvoiceId),
  })
)
