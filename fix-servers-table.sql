-- Fix servers table schema conflicts
-- This script will:
-- 1. Add missing server_name column if it doesn't exist
-- 2. Ensure RCON fields exist
-- 3. Handle the schema mismatch between DatabaseService and ServerService

-- First, let's see what columns exist
-- Add server_name column if it doesn't exist
ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS server_name VARCHAR(255) NULL;

-- Add RCON fields if they don't exist
ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS rcon_ip VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS rcon_port INT NULL,
ADD COLUMN IF NOT EXISTS rcon_password VARCHAR(255) NULL;

-- Update server_name from name if name exists and server_name is null
UPDATE servers 
SET server_name = name 
WHERE server_name IS NULL AND name IS NOT NULL;

-- Make server_name NOT NULL if we have data
-- ALTER TABLE servers MODIFY COLUMN server_name VARCHAR(255) NOT NULL;
