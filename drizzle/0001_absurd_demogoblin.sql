ALTER TABLE "contacts" ADD COLUMN "google_place_id" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "google_maps_url" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "latitude" real;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "longitude" real;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "rating" real;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "review_count" integer;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "business_status" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "opening_hours" jsonb;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "address" text;