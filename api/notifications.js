const express = require('express');
const router = express.Router();
const NotificationService = require('../src/services/notificationService');
const DatabaseService = require('../src/services/DatabaseService');

const db = new DatabaseService();
const notificationService = new NotificationService(db);

// Initialize notification service on startup
db.initialize().then(() => {
    notificationService.initializeDatabase().catch(console.error);
}).catch(console.error);

// Get all notifications for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { includeExpired } = req.query;
        
        const notifications = await notificationService.getUserNotifications(
            userId, 
            includeExpired === 'true'
        );
        
        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get unread count
router.get('/user/:userId/count', async (req, res) => {
    try {
        const { userId } = req.params;
        const count = await notificationService.getUnreadCount(userId);
        
        res.json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Mark notification as read
router.post('/:notificationId/read', async (req, res) => {
    try {
        const { notificationId } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required'
            });
        }
        
        // For global notifications (user_id is NULL), we need to track read status per user
        // For now, just mark it as read
        await notificationService.markAsRead(notificationId, userId);
        
        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Mark all notifications as read
router.post('/user/:userId/read-all', async (req, res) => {
    try {
        const { userId } = req.params;
        await notificationService.markAllAsRead(userId);
        
        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete notification
router.delete('/:notificationId', async (req, res) => {
    try {
        const { notificationId } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID required'
            });
        }
        
        await notificationService.deleteNotification(notificationId, userId);
        
        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create notification (for admin/internal use)
router.post('/create', async (req, res) => {
    try {
        const { userId, type, title, message, link, expiresInDays } = req.body;
        
        if (!userId || !type || !title || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, type, title, message'
            });
        }
        
        const notificationId = await notificationService.createNotification(
            userId,
            type,
            title,
            message,
            link,
            expiresInDays || 1
        );
        
        res.json({
            success: true,
            notificationId
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;

