const mysql = require('mysql2/promise');
require('dotenv').config();

class DatabaseService {
    constructor() {
        this.pool = null;
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'seedy_bot',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'seedy_discord_bot',
            charset: 'utf8mb4',
            timezone: '+00:00',
            // Connection pool settings
            connectionLimit: 10,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true,
            idleTimeout: 300000,
            // Keep connections alive
            keepAliveInitialDelay: 0,
            enableKeepAlive: true
        };
    }

    async initialize() {
        try {
            // First connect without database to create it if it doesn't exist
            const tempConfig = { ...this.config };
            delete tempConfig.database;
            delete tempConfig.connectionLimit;
            delete tempConfig.acquireTimeout;
            delete tempConfig.timeout;
            delete tempConfig.reconnect;
            delete tempConfig.idleTimeout;
            delete tempConfig.keepAliveInitialDelay;
            delete tempConfig.enableKeepAlive;
            
            const tempConnection = await mysql.createConnection(tempConfig);
            
            // Create database if it doesn't exist
            await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            await tempConnection.end();

            // Create connection pool
            this.pool = mysql.createPool(this.config);
            console.log('✅ Connected to MariaDB database with connection pool');
            
            await this.createTables();
        } catch (error) {
            console.error('Error connecting to MariaDB:', error);
            throw error;
        }
    }

    async createTables() {
        const tables = [
            // Economy tables
            `CREATE TABLE IF NOT EXISTS users (
                user_id VARCHAR(20) PRIMARY KEY,
                username VARCHAR(255),
                balance INT DEFAULT 1000,
                daily_streak INT DEFAULT 0,
                last_daily DATETIME NULL,
                total_earned INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            `CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20),
                amount INT,
                type VARCHAR(50),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Survey tables
            `CREATE TABLE IF NOT EXISTS survey_config (
                guild_id VARCHAR(20) PRIMARY KEY,
                survey_channel_id VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            `CREATE TABLE IF NOT EXISTS survey_responses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                survey_id VARCHAR(50),
                user_id VARCHAR(20),
                question1 TEXT,
                question2 TEXT,
                question3 TEXT,
                question4 TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Game tables
            `CREATE TABLE IF NOT EXISTS game_stats (
                user_id VARCHAR(20) PRIMARY KEY,
                hangman_wins INT DEFAULT 0,
                hangman_losses INT DEFAULT 0,
                rummy_wins INT DEFAULT 0,
                rummy_losses INT DEFAULT 0,
                tictactoe_wins INT DEFAULT 0,
                tictactoe_losses INT DEFAULT 0,
                connect4_wins INT DEFAULT 0,
                connect4_losses INT DEFAULT 0,
                battleship_wins INT DEFAULT 0,
                battleship_losses INT DEFAULT 0,
                poker_wins INT DEFAULT 0,
                poker_losses INT DEFAULT 0,
                uno_wins INT DEFAULT 0,
                uno_losses INT DEFAULT 0,
                total_games INT DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,


            // Partners table for website integration
            `CREATE TABLE IF NOT EXISTS partners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                website VARCHAR(500) NOT NULL,
                logo VARCHAR(500) NULL,
                discord VARCHAR(500) NULL,
                type ENUM('bot', 'server', 'tool', 'service') DEFAULT 'service',
                status ENUM('active', 'inactive') DEFAULT 'active',
                featured BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Images table for website integration
            `CREATE TABLE IF NOT EXISTS images (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                url VARCHAR(500) NOT NULL,
                type ENUM('upload', 'url') DEFAULT 'url',
                category VARCHAR(100) DEFAULT 'general',
                tags TEXT NULL,
                size VARCHAR(50) NULL,
                description TEXT NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // News posts table for CMS
            `CREATE TABLE IF NOT EXISTS news_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                excerpt TEXT NOT NULL,
                content LONGTEXT NOT NULL,
                author VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL,
                tags TEXT NULL,
                featured BOOLEAN DEFAULT FALSE,
                image VARCHAR(500) NULL,
                status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
                published_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Servers table for website integration
            `CREATE TABLE IF NOT EXISTS servers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                status ENUM('Online', 'Offline', 'Maintenance') DEFAULT 'Online',
                current_players INT DEFAULT 0,
                max_players INT DEFAULT 100,
                region VARCHAR(100) NOT NULL,
                is_core BOOLEAN DEFAULT FALSE,
                image VARCHAR(500) NULL,
                rcon_ip VARCHAR(255) NULL,
                rcon_port INT NULL,
                rcon_password VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Kit categories table
            `CREATE TABLE IF NOT EXISTS kit_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                icon VARCHAR(100) NULL,
                color VARCHAR(20) DEFAULT '#3B82F6',
                sort_order INT DEFAULT 0,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Kits table
            `CREATE TABLE IF NOT EXISTS kits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                category_id INT NOT NULL,
                price DECIMAL(10,2) DEFAULT 0.00,
                currency VARCHAR(10) DEFAULT 'USD',
                items TEXT NOT NULL,
                commands TEXT NULL,
                image VARCHAR(500) NULL,
                featured BOOLEAN DEFAULT FALSE,
                status ENUM('active', 'inactive', 'draft') DEFAULT 'draft',
                download_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES kit_categories (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Bot settings table
            `CREATE TABLE IF NOT EXISTS bot_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(255) NOT NULL UNIQUE,
                setting_value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Ticket system tables
            `CREATE TABLE IF NOT EXISTS ticket_panels (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            `CREATE TABLE IF NOT EXISTS tickets (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            `CREATE TABLE IF NOT EXISTS ticket_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id INT NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                username VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                INDEX idx_ticket_id (ticket_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            `CREATE TABLE IF NOT EXISTS channel_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                channel_type VARCHAR(50) NOT NULL,
                channel_id VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_guild_type (guild_id, channel_type),
                INDEX idx_guild_id (guild_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ];

        for (const table of tables) {
            await this.execute(table);
        }
    }

    async execute(sql, params = []) {
        try {
            const [rows] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async query(sql, params = []) {
        try {
            const [rows] = await this.pool.query(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async get(sql, params = []) {
        try {
            const [rows] = await this.pool.execute(sql, params);
            return rows[0] || null;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async all(sql, params = []) {
        try {
            const [rows] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async run(sql, params = []) {
        try {
            const [result] = await this.pool.execute(sql, params);
            return {
                id: result.insertId,
                changes: result.affectedRows
            };
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    // Bot settings methods
    async getSetting(key) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT setting_value FROM bot_settings WHERE setting_key = ?',
                [key]
            );
            return rows.length > 0 ? rows[0].setting_value : null;
        } catch (error) {
            console.error('Error getting bot setting:', error);
            return null;
        }
    }

    async setSetting(key, value) {
        try {
            await this.pool.execute(`
                INSERT INTO bot_settings (setting_key, setting_value, updated_at)
                VALUES (?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                updated_at = NOW()
            `, [key, value]);
            return true;
        } catch (error) {
            console.error('Error setting bot setting:', error);
            return false;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('Database connection pool closed');
        }
    }
}

module.exports = DatabaseService;
