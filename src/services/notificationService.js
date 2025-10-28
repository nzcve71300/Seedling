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
                    user_id VARCHAR(20) NULL,
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
            
            // Create notification_reads table for tracking global notification reads
            try {
                await this.database.run(`
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
            } catch (error) {
                // Ignore if table already exists
                if (error.code !== 'ER_TABLE_EXISTS_ERROR') {
                    console.error('Error creating notification_reads table:', error);
                }
            }
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
            // Get both personal notifications AND global notifications (where user_id is NULL)
            let query = `
                SELECT n.*, 
                       CASE 
                           WHEN n.user_id IS NULL THEN 
                               COALESCE((SELECT 1 FROM notification_reads WHERE notification_id = n.id AND user_id = ?), 0)
                           ELSE n.is_read
                       END as is_read_for_user
                FROM notifications n
                WHERE (n.user_id = ? OR n.user_id IS NULL)
            `;
            
            const params = [userId, userId];
            
            if (!includeExpired) {
                query += ` AND (n.expires_at IS NULL OR n.expires_at > NOW())`;
            }
            
            query += ` ORDER BY n.created_at DESC LIMIT 50`;
            
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
                isRead: n.is_read_for_user === 1 || n.is_read_for_user === true || n.is_read === 1 || n.is_read === true,
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
                `SELECT COUNT(*) as count FROM notifications n
                 LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
                 WHERE (n.user_id = ? OR n.user_id IS NULL)
                 AND (
                     (n.user_id IS NULL AND nr.id IS NULL) OR
                     (n.user_id = ? AND n.is_read = FALSE)
                 )
                 AND (n.expires_at IS NULL OR n.expires_at > NOW())`,
                [userId, userId, userId]
            );
            const resultArray = Array.isArray(result[0]) ? result[0] : result;
            return resultArray[0]?.count || 0;
        } catch (error) {
            console.error('Error getting unread count:', error);
            // If table doesn't exist, fall back to simpler query
            if (error.code === 'ER_NO_SUCH_TABLE') {
                try {
                    const result = await this.database.execute(
                        `SELECT COUNT(*) as count FROM notifications 
                         WHERE (user_id = ? OR user_id IS NULL)
                         AND is_read = FALSE 
                         AND (expires_at IS NULL OR expires_at > NOW())`,
                        [userId]
                    );
                    const resultArray = Array.isArray(result[0]) ? result[0] : result;
                    return resultArray[0]?.count || 0;
                } catch (e) {
                    return 0;
                }
            }
            return 0;
        }
    }

    async markAsRead(notificationId, userId) {
        try {
            // Check if this is a global notification (user_id is NULL)
            const [notification] = await this.database.execute(
                'SELECT user_id FROM notifications WHERE id = ?',
                [notificationId]
            );
            
            if (notification && notification.length > 0) {
                if (notification[0].user_id === null) {
                    // Global notification - track read status per user
                    try {
                        await this.database.run(
                            `INSERT INTO notification_reads (notification_id, user_id)
                             VALUES (?, ?)
                             ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP`,
                            [notificationId, userId]
                        );
                    } catch (error) {
                        // If table doesn't exist, just skip
                        if (error.code !== 'ER_NO_SUCH_TABLE') {
                            throw error;
                        }
                    }
                } else {
                    // Personal notification - update directly
                    await this.database.run(
                        `UPDATE notifications 
                         SET is_read = TRUE 
                         WHERE id = ? AND user_id = ?`,
                        [notificationId, userId]
                    );
                }
            }
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
            console.log(`📢 Creating global notification: ${type} - ${title}`);
            
            // Create a single global notification (user_id = NULL) instead of per-user
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
            
            const result = await this.database.run(
                `INSERT INTO notifications (user_id, type, title, message, link, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [null, type, title, message, link, expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
            );
            
            console.log(`✅ Created global notification with ID: ${result.id || result.insertId}`);
            console.log(`📢 All users will see this notification when they check`);
        } catch (error) {
            console.error('❌ Error creating global notification:', error);
            console.error('Stack:', error.stack);
            // Don't throw - just log the error
        }
    }
}

module.exports = NotificationService;

