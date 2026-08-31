-- Add "CI hanno abbandonato" (churn) stage after "Non chiuso"

-- Insert the new churn stage (orange)
INSERT INTO pipeline_stages (id, label, color, tone, "order")
VALUES ('abbandonato', 'CI hanno abbandonato', '#EA580C', 'orange', 9)
ON CONFLICT (id) DO NOTHING;

-- Shift "Nuove features" after the insertion
UPDATE pipeline_stages SET "order" = 10 WHERE id = 'nuove_features';
