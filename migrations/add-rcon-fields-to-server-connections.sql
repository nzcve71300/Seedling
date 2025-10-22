-- Migration to add RCON fields to server_connections table
-- Run this to add the missing RCON columns

ALTER TABLE server_connections 
ADD COLUMN IF NOT EXISTS rcon_port INT NULL,
ADD COLUMN IF NOT EXISTS rcon_password VARCHAR(255) NULL;

-- Remove the server_region column if it exists (we don't need it for RCON)
ALTER TABLE server_connections 
DROP COLUMN IF EXISTS server_region;
