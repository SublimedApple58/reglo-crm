-- Add "Non chiusa" stage before "Cliente"
-- First, bump "Cliente" order from 6 to 7
UPDATE pipeline_stages SET "order" = 7 WHERE id = 'cliente';

-- Insert the new stage
INSERT INTO pipeline_stages (id, label, color, tone, "order")
VALUES ('non_chiusa', 'Non chiusa', '#F97316', 'orange', 6)
ON CONFLICT (id) DO NOTHING;
