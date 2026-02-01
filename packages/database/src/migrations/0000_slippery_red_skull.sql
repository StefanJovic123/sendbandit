CREATE TABLE "organization_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_org_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_clerk_org_id_unique" UNIQUE("clerk_org_id"),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"industry" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"external_id" text,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"whatsapp_id" text,
	"telegram_id" text,
	"facebook_id" text,
	"instagram_id" text,
	"slack_id" text,
	"discord_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"last_inbound_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"filters" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"url" text NOT NULL,
	"r2_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"channel" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_version_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_node_id" text,
	"node_history" jsonb DEFAULT '[]'::jsonb,
	"wait_until" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_config" jsonb,
	"flow_data" jsonb,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"channel" text NOT NULL,
	"template_id" text,
	"variables" jsonb DEFAULT '{}'::jsonb,
	"campaign_id" text,
	"enrollment_id" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"scheduled_for" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_error" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text,
	"enrollment_id" text,
	"contact_id" text NOT NULL,
	"template_id" text,
	"channel" text NOT NULL,
	"direction" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"content" jsonb NOT NULL,
	"provider_message_id" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"channel" text NOT NULL,
	"name" text NOT NULL,
	"credentials" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"webhook_url" text,
	"webhook_secret" text,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"stripe_invoice_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"period" text NOT NULL,
	"messages_count" integer DEFAULT 0 NOT NULL,
	"contacts_count" integer DEFAULT 0 NOT NULL,
	"campaigns_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text,
	"campaign_id" text,
	"contact_id" text,
	"event_type" text NOT NULL,
	"event_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"date" text NOT NULL,
	"total_enrollments" integer DEFAULT 0 NOT NULL,
	"active_enrollments" integer DEFAULT 0 NOT NULL,
	"completed_enrollments" integer DEFAULT 0 NOT NULL,
	"failed_enrollments" integer DEFAULT 0 NOT NULL,
	"messages_sent" integer DEFAULT 0 NOT NULL,
	"messages_delivered" integer DEFAULT 0 NOT NULL,
	"messages_read" integer DEFAULT 0 NOT NULL,
	"messages_failed" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"date" text NOT NULL,
	"messages_sent" integer DEFAULT 0 NOT NULL,
	"messages_delivered" integer DEFAULT 0 NOT NULL,
	"messages_read" integer DEFAULT 0 NOT NULL,
	"messages_failed" integer DEFAULT 0 NOT NULL,
	"new_contacts" integer DEFAULT 0 NOT NULL,
	"active_campaigns" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_enrollments" ADD CONSTRAINT "campaign_enrollments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_enrollment_id_campaign_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."campaign_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_stats" ADD CONSTRAINT "campaign_stats_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_member_org_user_idx" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "org_member_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "org_clerk_org_id_idx" ON "organizations" USING btree ("clerk_org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_clerk_id_idx" ON "user_profiles" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user_profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "client_org_idx" ON "clients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "client_name_idx" ON "clients" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_tag_idx" ON "contact_tags" USING btree ("contact_id","tag_id");--> statement-breakpoint
CREATE INDEX "contact_client_idx" ON "contacts" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_external_id_idx" ON "contacts" USING btree ("client_id","external_id");--> statement-breakpoint
CREATE INDEX "contact_email_idx" ON "contacts" USING btree ("client_id","email");--> statement-breakpoint
CREATE INDEX "contact_phone_idx" ON "contacts" USING btree ("client_id","phone");--> statement-breakpoint
CREATE INDEX "contact_whatsapp_idx" ON "contacts" USING btree ("client_id","whatsapp_id");--> statement-breakpoint
CREATE INDEX "contact_telegram_idx" ON "contacts" USING btree ("client_id","telegram_id");--> statement-breakpoint
CREATE INDEX "segment_client_idx" ON "segments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "tag_client_idx" ON "tags" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_name_idx" ON "tags" USING btree ("client_id","name");--> statement-breakpoint
CREATE INDEX "media_org_idx" ON "media_assets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "media_type_idx" ON "media_assets" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "template_version_template_idx" ON "template_versions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_version_version_idx" ON "template_versions" USING btree ("template_id","version");--> statement-breakpoint
CREATE INDEX "template_org_idx" ON "templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "template_channel_idx" ON "templates" USING btree ("organization_id","channel");--> statement-breakpoint
CREATE INDEX "template_status_idx" ON "templates" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "enrollment_campaign_idx" ON "campaign_enrollments" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "enrollment_contact_idx" ON "campaign_enrollments" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "enrollment_status_idx" ON "campaign_enrollments" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "enrollment_wait_idx" ON "campaign_enrollments" USING btree ("status","wait_until");--> statement-breakpoint
CREATE INDEX "campaign_client_idx" ON "campaigns" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "campaign_status_idx" ON "campaigns" USING btree ("client_id","status");--> statement-breakpoint
CREATE INDEX "campaign_scheduled_idx" ON "campaigns" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "queue_status_idx" ON "message_queue" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "queue_priority_idx" ON "message_queue" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "message_campaign_idx" ON "messages" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "message_enrollment_idx" ON "messages" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "message_contact_idx" ON "messages" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "message_status_idx" ON "messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "message_provider_msg_idx" ON "messages" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "message_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "channel_conn_org_idx" ON "channel_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "channel_conn_channel_idx" ON "channel_connections" USING btree ("organization_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_conn_unique_name_idx" ON "channel_connections" USING btree ("organization_id","channel","name");--> statement-breakpoint
CREATE INDEX "invoice_org_idx" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_stripe_inv_idx" ON "invoices" USING btree ("stripe_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_stripe_sub_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_cust_idx" ON "subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_org_period_idx" ON "usage_records" USING btree ("organization_id","period");--> statement-breakpoint
CREATE INDEX "event_org_idx" ON "analytics_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "event_client_idx" ON "analytics_events" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "event_campaign_idx" ON "analytics_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "event_type_idx" ON "analytics_events" USING btree ("organization_id","event_type");--> statement-breakpoint
CREATE INDEX "event_created_at_idx" ON "analytics_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "stats_campaign_date_idx" ON "campaign_stats" USING btree ("campaign_id","date");--> statement-breakpoint
CREATE INDEX "daily_stats_org_date_idx" ON "daily_stats" USING btree ("organization_id","date");