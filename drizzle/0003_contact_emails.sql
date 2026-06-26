CREATE TABLE "contact_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"email" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_emails" ADD CONSTRAINT "contact_emails_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "contact_emails_contact_id_email_idx" ON "contact_emails" USING btree ("contact_id","email");
