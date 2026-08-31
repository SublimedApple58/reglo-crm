-- Add "In prova" (mese di prova / trial) stage before "Cliente" (REG-414)

-- Insert the new trial stage (yellow)
INSERT INTO pipeline_stages (id, label, color, tone, "order")
VALUES ('in_prova', 'In prova', '#CA8A04', 'yellow', 7)
ON CONFLICT (id) DO NOTHING;

-- Shift stages that follow "In prova" by one position
UPDATE pipeline_stages SET "order" = 8 WHERE id = 'cliente';
UPDATE pipeline_stages SET "order" = 9 WHERE id = 'non_chiuso';
UPDATE pipeline_stages SET "order" = 10 WHERE id = 'abbandonato';
UPDATE pipeline_stages SET "order" = 11 WHERE id = 'nuove_features';
