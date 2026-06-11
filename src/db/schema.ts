import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const clients = pgTable('clients', {
  id: text('id').primaryKey().default('gen_random_uuid()'),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  email: text('email'),
  status: text('status').default('active').notNull(),
  config: jsonb('config').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const clientAuth = pgTable('client_auth', {
  id: text('id').primaryKey().default('gen_random_uuid()'),
  clientSlug: text('client_slug').notNull().references(() => clients.slug),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const runs = pgTable('runs', {
  id: text('id').primaryKey().default('gen_random_uuid()'),
  clientSlug: text('client_slug').notNull().references(() => clients.slug),
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

export const campaigns = pgTable('campaigns', {
  id: text('id').primaryKey().default('gen_random_uuid()'),
  clientSlug: text('client_slug').notNull().references(() => clients.slug),
  name: text('name').notNull(),
  status: text('status').default('draft').notNull(),
  script: text('script').default('send_campaign').notNull(),
  config: jsonb('config').default({}).notNull(),
  lastRunId: text('last_run_id').references(() => runs.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
