CREATE TABLE "section_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"label" varchar(200) NOT NULL,
	"focus_description" text,
	"resume_section_key" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "section_configs" ADD CONSTRAINT "section_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "section_configs_tenant_name_idx" ON "section_configs" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "section_configs_tenant_order_idx" ON "section_configs" USING btree ("tenant_id","sort_order");