-- Create giveaways table
CREATE TABLE IF NOT EXISTS giveaways (
    id INT AUTO_INCREMENT PRIMARY KEY,
    giveaway_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    max_winners INT NOT NULL DEFAULT 1,
    channel_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NULL,
    guild_id VARCHAR(255) NOT NULL,
    creator_id VARCHAR(255) NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('active', 'ended', 'cancelled') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_end_time (end_time),
    INDEX idx_guild_id (guild_id)
);

-- Create giveaway entries table
CREATE TABLE IF NOT EXISTS giveaway_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    giveaway_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE,
    UNIQUE KEY unique_entry (giveaway_id, user_id),
    INDEX idx_giveaway_id (giveaway_id),
    INDEX idx_user_id (user_id)
);

-- Create giveaway winners table
CREATE TABLE IF NOT EXISTS giveaway_winners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    giveaway_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    won_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE,
    INDEX idx_giveaway_id (giveaway_id),
    INDEX idx_user_id (user_id)
);

