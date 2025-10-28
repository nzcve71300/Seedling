const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function makeNotificationsGlobal() {
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
        // Allow NULL for user_id
        console.log('📝 Making user_id nullable...');
        await connection.execute(`
            ALTER TABLE notifications 
            MODIFY COLUMN user_id VARCHAR(20) NULL
        `);
        console.log('✅ user_id is now nullable');
        
        // Create notification_reads table
        console.log('📝 Creating notification_reads table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS notification_reads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                notification_id INT NOT NULL,
                user_id VARCHAR(20) NOT NULL,
                read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
                UNIQUE KEY unique_read (notification_id, user_id),
                INDEX idx_user_id (user_id),
                INDEX idx_notification_id (notification_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ notification_reads table created');
        
        // Create a test global notification
        console.log('📤 Creating test global notification...');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1);
        
        await connection.execute(`
            INSERT INTO notifications (user_id, type, title, message, link, expires_at)
            VALUES (NULL, 'news', 'Global Notification Test', 'This is a global notification visible to everyone!', '/news', ?)
        `, [expiresAt.toISOString().slice(0, 19).replace('T', ' ')]);
        
        console.log('✅ Test global notification created');
        console.log('🎉 All users will now see this notification!');
        
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('⚠️ Table/column already exists, skipping creation');
        } else {
            console.error('❌ Error:', error);
        }
    } finally {
        await connection.end();
        console.log('🔌 Database connection closed');
    }
}

makeNotificationsGlobal().catch(console.error);

