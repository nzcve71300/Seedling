-- Migration to create spin system tables
-- This creates all necessary tables for the daily spin system

-- Spin configuration table
CREATE TABLE IF NOT EXISTS spin_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    command_channel_id VARCHAR(20) NOT NULL,
    log_channel_id VARCHAR(20) NOT NULL,
    cooldown_hours INT NOT NULL DEFAULT 24,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_guild (guild_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Spin items table
CREATE TABLE IF NOT EXISTS spin_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    server_nickname VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_server (server_nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User cooldowns table
CREATE TABLE IF NOT EXISTS user_spin_cooldowns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    server_nickname VARCHAR(255) NOT NULL,
    last_spin TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_server (user_id, server_nickname),
    INDEX idx_user (user_id),
    INDEX idx_server (server_nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Spin logs table
CREATE TABLE IF NOT EXISTS spin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    username VARCHAR(255) NOT NULL,
    server_nickname VARCHAR(255) NOT NULL,
    action ENUM('spin', 'claim', 'fail') NOT NULL,
    item_display_name VARCHAR(255) NULL,
    item_short_name VARCHAR(255) NULL,
    quantity INT NULL,
    in_game_name VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_server (server_nickname),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
