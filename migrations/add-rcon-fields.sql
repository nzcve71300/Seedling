-- Migration to add RCON fields to servers table
-- Run this if the servers table already exists without RCON fields

ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS rcon_ip VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS rcon_port INT NULL,
ADD COLUMN IF NOT EXISTS rcon_password VARCHAR(255) NULL;
