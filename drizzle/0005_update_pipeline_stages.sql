-- Update pipeline stages: rename, recolor, reorder

-- 1. Update "email" label
UPDATE pipeline_stages SET label = 'Email' WHERE id = 'email';

-- 2. Migrate autoscuole from "in_attesa" → "nuove_features" and "non_chiusa" → "no_show"
UPDATE autoscuole SET "stageId" = 'nuove_features' WHERE "stageId" = 'in_attesa';
UPDATE autoscuole SET "stageId" = 'no_show' WHERE "stageId" = 'non_chiusa';

-- 3. Update activity references
UPDATE activities SET "stageFrom" = 'nuove_features' WHERE "stageFrom" = 'in_attesa';
UPDATE activities SET "stageTo" = 'nuove_features' WHERE "stageTo" = 'in_attesa';
UPDATE activities SET "stageFrom" = 'no_show' WHERE "stageFrom" = 'non_chiusa';
UPDATE activities SET "stageTo" = 'no_show' WHERE "stageTo" = 'non_chiusa';

-- 4. Delete old stages
DELETE FROM pipeline_stages WHERE id = 'in_attesa';
DELETE FROM pipeline_stages WHERE id = 'non_chiusa';

-- 5. Insert new stages
INSERT INTO pipeline_stages (id, label, color, tone, "order")
VALUES ('no_show', 'No show', '#F97316', 'orange', 5)
ON CONFLICT (id) DO UPDATE SET label = 'No show', color = '#F97316', tone = 'orange', "order" = 5;

INSERT INTO pipeline_stages (id, label, color, tone, "order")
VALUES ('nuove_features', 'Nuove features', '#8B5CF6', 'violet', 7)
ON CONFLICT (id) DO UPDATE SET label = 'Nuove features', color = '#8B5CF6', tone = 'violet', "order" = 7;

-- 6. Update "cliente" color to fuchsia and reorder remaining
UPDATE pipeline_stages SET color = '#EC4899', tone = 'pink', "order" = 6 WHERE id = 'cliente';
UPDATE pipeline_stages SET "order" = 4 WHERE id = 'appuntamento';
UPDATE pipeline_stages SET "order" = 3 WHERE id = 'email';
UPDATE pipeline_stages SET "order" = 2 WHERE id = 'follow_up';
UPDATE pipeline_stages SET "order" = 1 WHERE id = 'non_interessato';
UPDATE pipeline_stages SET "order" = 0 WHERE id = 'da_chiamare';
