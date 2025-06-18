
-- Add month column to calendars table
ALTER TABLE calendars ADD COLUMN month INTEGER;

-- Add dog_descriptions column to calendar_generations table for storing the analyzed dog descriptions
ALTER TABLE calendar_generations ADD COLUMN dog_descriptions TEXT[];
