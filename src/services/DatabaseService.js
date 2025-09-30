const mysql = require('mysql2/promise');
require('dotenv').config();

class DatabaseService {
    constructor() {
        this.connection = null;
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'seedy_bot',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'seedy_discord_bot',
            charset: 'utf8mb4',
            timezone: '+00:00'
        };
    }

    async initialize() {
        try {
            // First connect without database to create it if it doesn't exist
            const tempConfig = { ...this.config };
            delete tempConfig.database;
            
            const tempConnection = await mysql.createConnection(tempConfig);
            
            // Create database if it doesn't exist
            await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            await tempConnection.end();

            // Now connect to the specific database
            this.connection = await mysql.createConnection(this.config);
            console.log('✅ Connected to MariaDB database');
            
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

            // Moderation tables
            `CREATE TABLE IF NOT EXISTS warnings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20),
                moderator_id VARCHAR(20),
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ];

        for (const table of tables) {
            await this.execute(table);
        }
    }

    async execute(sql, params = []) {
        try {
            const [rows] = await this.connection.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async query(sql, params = []) {
        try {
            const [rows] = await this.connection.query(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async get(sql, params = []) {
        try {
            const [rows] = await this.connection.execute(sql, params);
            return rows[0] || null;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async all(sql, params = []) {
        try {
            const [rows] = await this.connection.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async run(sql, params = []) {
        try {
            const [result] = await this.connection.execute(sql, params);
            return {
                id: result.insertId,
                changes: result.affectedRows
            };
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            console.log('Database connection closed');
        }
    }
}

module.exports = DatabaseService;
