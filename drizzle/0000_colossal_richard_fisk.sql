CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"autoscuola_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "autoscuole" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner" text,
	"province" varchar(2) NOT NULL,
	"town" text NOT NULL,
	"phone" text,
	"email" text,
	"stage_id" text NOT NULL,
	"pipeline_value" real DEFAULT 0,
	"assigned_to" text,
	"students" integer DEFAULT 0,
	"last_contact" integer DEFAULT 0,
	"notes" text,
	"lat" real,
	"lng" real,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"commission_id" integer NOT NULL,
	"autoscuola_id" text,
	"contract_value" real NOT NULL,
	"commission_rate" real NOT NULL,
	"commission_amount" real NOT NULL,
	"date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"gross" real DEFAULT 0,
	"contracts" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body" text,
	"pinned" boolean DEFAULT false,
	"author_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"color" text NOT NULL,
	"tone" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"html" text,
	"author_id" text,
	"tags" text[],
	"pinned" boolean DEFAULT false,
	"icon" text,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"phone" text,
	"role" text DEFAULT 'sales' NOT NULL,
	"territory" text,
	"color" text DEFAULT '#EC4899' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"quota" real DEFAULT 5750,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_autoscuola_id_autoscuole_id_fk" FOREIGN KEY ("autoscuola_id") REFERENCES "public"."autoscuole"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autoscuole" ADD CONSTRAINT "autoscuole_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autoscuole" ADD CONSTRAINT "autoscuole_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_lines" ADD CONSTRAINT "commission_lines_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_lines" ADD CONSTRAINT "commission_lines_autoscuola_id_autoscuole_id_fk" FOREIGN KEY ("autoscuola_id") REFERENCES "public"."autoscuole"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;