-- Remove duplicate resource_categories, keeping the lowest id per label
DELETE FROM resource_categories
WHERE id NOT IN (
  SELECT MIN(id) FROM resource_categories GROUP BY label
);

-- Add unique constraint on label to prevent future duplicates
ALTER TABLE resource_categories ADD CONSTRAINT resource_categories_label_unique UNIQUE (label);
