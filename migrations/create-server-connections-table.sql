-- Migration to create server_connections table for Rust console server connections
-- This table stores server connection information for RCON connections

CREATE TABLE IF NOT EXISTS server_connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(255) NOT NULL UNIQUE,
    server_ip VARCHAR(255) NOT NULL,
    rcon_port INT NOT NULL,
    rcon_password VARCHAR(255) NOT NULL,
    status ENUM('connected', 'disconnected', 'error') DEFAULT 'disconnected',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(20) NOT NULL,
    INDEX idx_nickname (nickname),
    INDEX idx_status (status),
    INDEX idx_server_ip (server_ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
