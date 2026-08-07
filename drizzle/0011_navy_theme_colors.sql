-- Navy re-theme (REG-347): palette stage e colori utenti allineati al design system Airbnb navy.
-- Deve girare DOPO 0005/0008 che riscrivono i colori stage con la vecchia palette.
UPDATE "users" SET "color" = '#1a1a2e' WHERE "color" = '#EC4899';--> statement-breakpoint
UPDATE "pipeline_stages" SET "color" = '#6a6a6a', "tone" = 'slate' WHERE "id" = 'da_chiamare';--> statement-breakpoint
UPDATE "pipeline_stages" SET "color" = '#c13515', "tone" = 'red' WHERE "id" = 'non_interessato';--> statement-breakpoint
UPDATE "pipeline_stages" SET "color" = '#2563EB', "tone" = 'blue' WHERE "id" = 'follow_up';--> statement-breakpoint
UPDATE "pipeline_stages" SET "color" = '#0E7490', "tone" = 'teal' WHERE "id" = 'email';--> statement-breakpoint
UPDATE "pipeline_stages" SET "color" = '#7C3AED', "tone" = 'violet' WHERE "id" = 'in_attesa';--> statement-breakpoint
UPDATE "pipeline_stages" SET "color" = '#16A34A', "tone" = 'green' WHERE "id" = 'appuntamento';--> statement-breakpoint
UPDATE "pipeline_stages" SET "color" = '#D97706', "tone" = 'orange' WHERE "id" = 'no_show';--> statement-breakpoint
UPDATE "pipeline_stages" SET "color" = '#1a1a2e', "tone" = 'navy' WHERE "id" = 'cliente';--> statement-breakpoint
UPDATE "pipeline_stages" SET "color" = '#7f1d1d', "tone" = 'red' WHERE "id" = 'non_chiuso';--> statement-breakpoint
UPDATE "pipeline_stages" SET "color" = '#A855F7', "tone" = 'violet' WHERE "id" = 'nuove_features';
