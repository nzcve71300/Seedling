-- Create ticket panels table
CREATE TABLE IF NOT EXISTS ticket_panels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NULL,
    admin_role_id VARCHAR(255) NOT NULL,
    mod_role_id VARCHAR(255) NULL,
    heading VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_guild_id (guild_id),
    INDEX idx_channel_id (channel_id)
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number INT NOT NULL,
    guild_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    ticket_type VARCHAR(255) NOT NULL,
    in_game_name VARCHAR(255) NULL,
    description TEXT NULL,
    admin_role_id VARCHAR(255) NOT NULL,
    status ENUM('open', 'closed') DEFAULT 'open',
    transcript_url TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    closed_by VARCHAR(255) NULL,
    INDEX idx_guild_id (guild_id),
    INDEX idx_channel_id (channel_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);

-- Create ticket messages table (for transcript)
CREATE TABLE IF NOT EXISTS ticket_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    INDEX idx_ticket_id (ticket_id)
);

-- Create channel settings table
CREATE TABLE IF NOT EXISTS channel_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    channel_type VARCHAR(50) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_guild_type (guild_id, channel_type),
    INDEX idx_guild_id (guild_id)
);

