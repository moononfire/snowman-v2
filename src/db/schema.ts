import { pgTable, text, jsonb, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'

export const clients = pgTable('clients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').unique(),
  name: text('name').notNull(),
  email: text('email'),
  status: text('status').default('active').notNull(),
  config: jsonb('config').default({}).notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const clientAuth = pgTable('client_auth', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text('client_id').notNull().references(() => clients.id),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const runs = pgTable('runs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text('client_id').notNull().references(() => clients.id),
  script: text('script').notNull(),
  status: text('status').default('pending').notNull(),
  params: jsonb('params').default({}).notNull(),
  vpsRunId: text('vps_run_id'),
  outputFiles: jsonb('output_files').default([]).notNull(),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text('client_id').notNull().references(() => clients.id),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const campaigns = pgTable('campaigns', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text('client_id').notNull().references(() => clients.id),
  name: text('name').notNull(),
  status: text('status').default('draft').notNull(),
  script: text('script').default('send_campaign').notNull(),
  config: jsonb('config').default({}).notNull(),
  lastRunId: text('last_run_id').references(() => runs.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const contacts = pgTable('contacts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text('client_id').notNull().references(() => clients.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  phone: text('phone').notNull(),
  company: text('company'),
  position: text('position'),
  email: text('email'),
  preCallNote: text('pre_call_note'),
  postCallNote: text('post_call_note'),
  tags: text('tags'),
  source: text('source').default('MANUAL').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const lists = pgTable('lists', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text('client_id').notNull().references(() => clients.id),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const listContacts = pgTable('list_contacts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  listId: text('list_id').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  contactId: text('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  order: integer('order').default(0).notNull(),
  status: text('status').default('NOT_CALLED').notNull(),
  notes: text('notes'),
  followUpAt: timestamp('follow_up_at', { withTimezone: true }),
  calledAt: timestamp('called_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('list_contacts_unique').on(t.listId, t.contactId),
  index('list_contacts_order_idx').on(t.listId, t.order),
])
