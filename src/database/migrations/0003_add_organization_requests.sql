CREATE TABLE "organization_request_reminders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"request_id" uuid NOT NULL,
	"reminder_type" varchar(10) NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"requester_id" uuid NOT NULL,
	"organization_name" varchar(150) NOT NULL,
	"organization_description" varchar(2000),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"organization_id" uuid,
	"reviewed_by" uuid,
	"rejection_reason" varchar(2000),
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_request_reminders_request_type_idx" ON "organization_request_reminders" USING btree ("request_id","reminder_type");--> statement-breakpoint
CREATE INDEX "organization_request_reminders_request_idx" ON "organization_request_reminders" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "organization_requests_status_idx" ON "organization_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "organization_requests_requester_idx" ON "organization_requests" USING btree ("requester_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_requests_one_pending_requester_idx" ON "organization_requests" USING btree ("requester_id") WHERE "organization_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "organizations_created_by_idx" ON "organizations" USING btree ("created_by");
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "organization_requests" ADD CONSTRAINT "organization_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "organization_requests" ADD CONSTRAINT "organization_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "organization_requests" ADD CONSTRAINT "organization_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "organization_request_reminders" ADD CONSTRAINT "organization_request_reminders_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "organization_requests"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "organization_requests" ADD CONSTRAINT "organization_requests_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected'));
--> statement-breakpoint
ALTER TABLE "organization_request_reminders" ADD CONSTRAINT "organization_request_reminders_type_check" CHECK ("reminder_type" IN ('24h', '3d', '7d'));
