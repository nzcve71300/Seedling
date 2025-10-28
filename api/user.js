const express = require('express');
const router = express.Router();
const DatabaseService = require('../src/services/DatabaseService');

const db = new DatabaseService();

// Initialize database connection
db.initialize().catch(console.error);

// POST /api/user - Create or update user from Discord OAuth
router.post('/', async (req, res) => {
    try {
        const { userId, username, email, avatar } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }
        
        // Check if user exists
        const existingUser = await db.get(
            'SELECT * FROM users WHERE user_id = ?',
            [userId]
        );
        
        if (existingUser) {
            // Update existing user
            await db.run(
                'UPDATE users SET username = ? WHERE user_id = ?',
                [username || existingUser.username, userId]
            );
            
            res.json({
                success: true,
                message: 'User updated',
                user: {
                    userId: existingUser.user_id,
                    username: username || existingUser.username
                }
            });
        } else {
            // Create new user
            await db.run(
                'INSERT INTO users (user_id, username, balance) VALUES (?, ?, ?)',
                [userId, username || 'Unknown', 1000]
            );
            
            console.log(`✅ Created new user: ${username || userId} (${userId})`);
            
            res.json({
                success: true,
                message: 'User created',
                user: {
                    userId,
                    username: username || 'Unknown'
                }
            });
        }
    } catch (error) {
        console.error('Error creating/updating user:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;

