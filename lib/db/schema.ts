import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  integer,
  jsonb,
  boolean,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ─── Tenants ─────────────────────────────────────────────────────────────
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  plan: varchar('plan', { length: 50 }).notNull().default('free'),
  logo_url: text('logo_url'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex('tenants_slug_idx').on(table.slug),
}));

// ─── Users ────────────────────────────────────────────────────────────────
// NOTE: Property names must match Auth.js DrizzleAdapter expectations
// (camelCase: emailVerified, etc.) while DB column names are snake_case.
// Drizzle handles the property→column mapping automatically.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),  // adapter expects camelCase
  image: text('image'),
  // Custom fields beyond Auth.js adapter
  password_hash: text('password_hash'),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantEmailIdx: uniqueIndex('users_tenant_email_idx').on(table.tenant_id, table.email),
  tenantIdx: index('users_tenant_idx').on(table.tenant_id),
}));

// ─── Sessions (Auth.js) ──────────────────────────────────────────────────
// Adapter expects: sessionToken as primary key (camelCase), userId (camelCase)
export const sessions = pgTable('sessions', {
  sessionToken: varchar('session_token', { length: 255 }).primaryKey(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('sessions_user_idx').on(table.userId),
  tenantIdx: index('sessions_tenant_idx').on(table.tenant_id),
}));

// ─── Accounts (Auth.js OAuth) ────────────────────────────────────────────
// Adapter expects: composite PK on (provider, providerAccountId), userId (camelCase)
export const accounts = pgTable('accounts', {
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: varchar('token_type', { length: 50 }),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  compositePk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  userIdx: index('accounts_user_idx').on(table.userId),
  tenantIdx: index('accounts_tenant_idx').on(table.tenant_id),
}));

// ─── Authenticators (Auth.js WebAuthn) ───────────────────────────────────
export const authenticators = pgTable('authenticators', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialID: text('credential_id').notNull().unique(),
  providerAccountId: text('provider_account_id').notNull(),
  credentialPublicKey: text('credential_public_key').notNull(),
  counter: integer('counter').notNull(),
  credentialDeviceType: text('credential_device_type').notNull(),
  credentialBackedUp: boolean('credential_backed_up').notNull(),
  transports: text('transports'),
}, (table) => ({
  userCredentialIdx: uniqueIndex('authenticators_user_credential_idx').on(table.userId, table.credentialID),
}));

// ─── Verification Tokens (Auth.js) ──────────────────────────────────────
// Adapter expects: identifier, token, expires (these match our snake_case directly)
export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
}, (table) => ({
  identifierTokenIdx: uniqueIndex('vt_identifier_token_idx').on(table.identifier, table.token),
}));

// ─── Resumes ──────────────────────────────────────────────────────────────
export const resumes = pgTable('resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }),
  filename: varchar('filename', { length: 255 }).notNull(),
  original_filename: varchar('original_filename', { length: 255 }).notNull(),
  file_key: varchar('file_key', { length: 500 }).notNull(),
  content_type: varchar('content_type', { length: 100 }),
  file_size: integer('file_size'),
  extracted_text: text('extracted_text'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  is_default: boolean('is_default').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('resumes_tenant_idx').on(table.tenant_id),
  userIdx: index('resumes_user_idx').on(table.user_id),
}));

// ─── Analyses ────────────────────────────────────────────────────────────
export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resume_id: uuid('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
  section: varchar('section', { length: 50 }),
  version: varchar('version', { length: 50 }).notNull().default('standard'),
  result: jsonb('result').notNull(),
  model: varchar('model', { length: 100 }),
  tokens_used: integer('tokens_used'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('analyses_tenant_idx').on(table.tenant_id),
  userIdx: index('analyses_user_idx').on(table.user_id),
  resumeIdx: index('analyses_resume_idx').on(table.resume_id),
}));

// ─── Analysis Cache ─────────────────────────────────────────────────────
export const analysisCache = pgTable('analysis_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  cache_key: varchar('cache_key', { length: 255 }).notNull(),
  file_hash: varchar('file_hash', { length: 64 }).notNull(),
  content: jsonb('content').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expires_at: timestamp('expires_at', { withTimezone: true }),
}, (table) => ({
  tenantCacheKeyIdx: uniqueIndex('cache_tenant_key_idx').on(table.tenant_id, table.cache_key),
}));

// ─── Section Configs ─────────────────────────────────────────────────────
export const sectionConfigs = pgTable('section_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  label: varchar('label', { length: 200 }).notNull(),
  focus_description: text('focus_description'),
  resume_section_key: varchar('resume_section_key', { length: 100 }),
  sort_order: integer('sort_order').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantNameIdx: uniqueIndex('section_configs_tenant_name_idx').on(table.tenant_id, table.name),
  tenantOrderIdx: index('section_configs_tenant_order_idx').on(table.tenant_id, table.sort_order),
}));

// ─── Ad Clicks ──────────────────────────────────────────────────────────
export const adClicks = pgTable('ad_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ad_slot: varchar('ad_slot', { length: 100 }).notNull(),
  referrer: text('referrer'),
  user_agent: text('user_agent'),
  clicked_at: timestamp('clicked_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantSlotIdx: index('ad_clicks_tenant_slot_idx').on(table.tenant_id, table.ad_slot),
}));
