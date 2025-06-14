-- Add sound generation support to sounds table
ALTER TABLE sounds ADD COLUMN is_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE sounds ADD COLUMN prompt TEXT;

-- Add Generated category for AI-generated sounds
INSERT INTO categories (name, description, color, sort_order)
VALUES ('Generated', 'Sounds created with AI', '#8888FF', 100);