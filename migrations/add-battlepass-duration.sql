-- Add duration fields to battlepass_config table
ALTER TABLE battlepass_config 
ADD COLUMN IF NOT EXISTS duration_days INT NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP NULL;

-- Update existing records to have end_date based on created_at + 30 days
UPDATE battlepass_config 
SET duration_days = 30, 
    end_date = DATE_ADD(created_at, INTERVAL 30 DAY)
WHERE end_date IS NULL;


