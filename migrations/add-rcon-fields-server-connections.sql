-- Migration to add RCON fields to server_connections table
-- This adds the missing RCON columns to the server_connections table

ALTER TABLE server_connections 
ADD COLUMN IF NOT EXISTS rcon_port INT NULL,
ADD COLUMN IF NOT EXISTS rcon_password VARCHAR(255) NULL;
