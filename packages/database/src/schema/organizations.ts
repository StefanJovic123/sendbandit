import { pgTable, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const organizations = pgTable(
  'organizations',
  {
    id: text('id').primaryKey(),
    clerkOrgId: text('clerk_org_id').unique(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logoUrl: text('logo_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('org_slug_idx').on(table.slug),
    clerkOrgIdIdx: index('org_clerk_org_id_idx').on(table.clerkOrgId),
  })
)

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    role: text('role', { enum: ['owner', 'admin', 'manager', 'user', 'viewer'] }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgUserIdx: uniqueIndex('org_member_org_user_idx').on(table.organizationId, table.userId),
    userIdx: index('org_member_user_idx').on(table.userId),
  })
)

export const userProfiles = pgTable(
  'user_profiles',
  {
    id: text('id').primaryKey(),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clerkIdIdx: uniqueIndex('user_clerk_id_idx').on(table.clerkId),
    emailIdx: index('user_email_idx').on(table.email),
  })
)

// Relations for relational query API
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
}))

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
}))
