-- Add new stages: "In attesa" (after email) and "Non chiuso" (before nuove_features)

-- Insert new stages
INSERT INTO pipeline_stages (id, label, color, tone, "order") VALUES ('in_attesa', 'In attesa', '#7C3AED', 'violet', 4);
INSERT INTO pipeline_stages (id, label, color, tone, "order") VALUES ('non_chiuso', 'Non chiuso', '#DC2626', 'red', 8);

-- Update order of existing stages shifted by the insertions
UPDATE pipeline_stages SET "order" = 5 WHERE id = 'appuntamento';
UPDATE pipeline_stages SET "order" = 6 WHERE id = 'no_show';
UPDATE pipeline_stages SET "order" = 7 WHERE id = 'cliente';
UPDATE pipeline_stages SET "order" = 9 WHERE id = 'nuove_features';
