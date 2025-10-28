const DatabaseService = require('./DatabaseService');

class NotificationService {
    constructor(database) {
        this.database = database;
    }

    async initializeDatabase() {
        try {
            await this.database.run(`
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
            console.log('✅ NotificationService database initialized');
        } catch (error) {
            console.error('❌ Failed to initialize NotificationService database:', error);
            throw error;
        }
    }

    async createNotification(userId, type, title, message, link = null, expiresInDays = 1) {
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
            
            const result = await this.database.run(
                `INSERT INTO notifications (user_id, type, title, message, link, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, type, title, message, link, expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
            );
            
            return result.id || result.insertId;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    async getUserNotifications(userId, includeExpired = false) {
        try {
            let query = `
                SELECT * FROM notifications 
                WHERE user_id = ? 
            `;
            
            const params = [userId];
            
            if (!includeExpired) {
                query += ` AND (expires_at IS NULL OR expires_at > NOW())`;
            }
            
            query += ` ORDER BY created_at DESC LIMIT 50`;
            
            const notifications = await this.database.execute(query, params);
            
            // Handle case where result is an array of arrays
            const notificationsArray = Array.isArray(notifications[0]) ? notifications[0] : notifications;
            
            return notificationsArray.map(n => ({
                id: n.id,
                userId: n.user_id,
                type: n.type,
                title: n.title,
                message: n.message,
                link: n.link,
                isRead: n.is_read === 1 || n.is_read === true,
                expiresAt: n.expires_at,
                createdAt: n.created_at
            }));
        } catch (error) {
            console.error('Error fetching notifications:', error);
            // If table doesn't exist, return empty array instead of throwing
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('⚠️ Notifications table does not exist yet');
                return [];
            }
            throw error;
        }
    }

    async getUnreadCount(userId) {
        try {
            const result = await this.database.execute(
                `SELECT COUNT(*) as count FROM notifications 
                 WHERE user_id = ? 
                 AND is_read = FALSE 
                 AND (expires_at IS NULL OR expires_at > NOW())`,
                [userId]
            );
            const resultArray = Array.isArray(result[0]) ? result[0] : result;
            return resultArray[0]?.count || 0;
        } catch (error) {
            console.error('Error getting unread count:', error);
            // If table doesn't exist, return 0
            if (error.code === 'ER_NO_SUCH_TABLE') {
                return 0;
            }
            return 0;
        }
    }

    async markAsRead(notificationId, userId) {
        try {
            await this.database.run(
                `UPDATE notifications 
                 SET is_read = TRUE 
                 WHERE id = ? AND user_id = ?`,
                [notificationId, userId]
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    async markAllAsRead(userId) {
        try {
            await this.database.run(
                `UPDATE notifications 
                 SET is_read = TRUE 
                 WHERE user_id = ? AND is_read = FALSE`,
                [userId]
            );
        } catch (error) {
            console.error('Error marking all as read:', error);
            throw error;
        }
    }

    async deleteNotification(notificationId, userId) {
        try {
            await this.database.run(
                `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
                [notificationId, userId]
            );
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }

    async createNotificationForAllUsers(type, title, message, link = null, expiresInDays = 1) {
        try {
            console.log(`📢 Creating notifications for all users: ${type} - ${title}`);
            
            // Get all user IDs
            const users = await this.database.execute('SELECT user_id FROM users');
            console.log(`👥 Found ${users.length} users in database`);
            
            // Handle case where result is an array of arrays
            const usersArray = Array.isArray(users[0]) ? users[0] : users;
            
            if (usersArray.length === 0) {
                console.log('⚠️ No users found to send notifications to');
                console.log('💡 Tip: Users will be added when they sign in with Discord');
                return;
            }
            
            console.log(`📤 Sending notifications to ${usersArray.length} users...`);
            const promises = usersArray.map(user => 
                this.createNotification(user.user_id, type, title, message, link, expiresInDays)
            );
            
            await Promise.all(promises);
            console.log(`✅ Created notifications for ${usersArray.length} users`);
        } catch (error) {
            console.error('❌ Error creating notifications for all users:', error);
            console.error('Stack:', error.stack);
            // Don't throw - just log the error
        }
    }
}

module.exports = NotificationService;

