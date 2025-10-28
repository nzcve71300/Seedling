const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function createNotificationsTable() {
    console.log('🔌 Connecting to database...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'seedybot',
        password: process.env.DB_PASSWORD || 'SEEDCommunityo2o8!',
        database: process.env.DB_NAME || 'seedy_discord_bot',
    });
    console.log('✅ Connected to database');

    try {
        console.log('📝 Creating notifications table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                type ENUM('news', 'server', 'item', 'battlepass', 'battlepass_claim', 'partnership', 'other') NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                link VARCHAR(500) NULL,
                is_read BOOLEAN DEFAULT FALSE,
                expires_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_is_read (is_read),
                INDEX idx_expires_at (expires_at),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Notifications table created successfully!');
    } catch (error) {
        console.error('❌ Error creating notifications table:', error);
        throw error;
    } finally {
        await connection.end();
        console.log('🔌 Database connection closed');
    }
}

createNotificationsTable().catch(console.error);

