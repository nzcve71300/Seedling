-- Add mod_role_id column to ticket_panels table
ALTER TABLE ticket_panels 
ADD COLUMN IF NOT EXISTS mod_role_id VARCHAR(255) NULL AFTER admin_role_id;

