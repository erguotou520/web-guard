-- Migration: Refactor domains table to separate display name and URL
-- This migration adds display_name and url fields to support user-friendly names

-- Add new columns
ALTER TABLE domains ADD COLUMN display_name VARCHAR(255);
ALTER TABLE domains ADD COLUMN url VARCHAR(2048);

-- Migrate existing data: copy name to display_name, normalized_name to url
UPDATE domains SET display_name = name WHERE display_name IS NULL;
UPDATE domains SET url = normalized_name WHERE url IS NULL;

-- Make the new columns NOT NULL after migration
ALTER TABLE domains ALTER COLUMN display_name SET NOT NULL;
ALTER TABLE domains ALTER COLUMN url SET NOT NULL;

-- Add index on url for performance
CREATE INDEX idx_domains_url ON domains(url);

-- Drop old unique constraint on (organization_id, normalized_name)
ALTER TABLE domains DROP CONSTRAINT IF EXISTS domains_organization_id_normalized_name_key;

-- Add new unique constraint on (organization_id, url)
ALTER TABLE domains ADD CONSTRAINT domains_organization_id_url_key UNIQUE(organization_id, url);

-- Note: The 'name' field is kept for backward compatibility
-- The 'normalized_name' field is kept for search/comparison purposes
