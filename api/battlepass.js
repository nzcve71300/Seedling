const express = require('express');
const router = express.Router();
const {
    getBattlePassConfig,
    getUserBattlePass,
    createOrUpdateUserBattlePass,
    addXpToUser,
    claimBattlePassReward,
    getBattlePassItemsForTier,
    updateBattlePassConfig,
    addBattlePassItem,
    removeBattlePassItem
} = require('../src/services/battlePassService');

// Initialize battle pass tables on startup
const { initializeBattlePassTables } = require('../src/services/battlePassService');
initializeBattlePassTables().catch(console.error);

// Get battle pass configuration
router.get('/config', async (req, res) => {
    try {
        const config = await getBattlePassConfig();
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Error getting battle pass config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get battle pass configuration'
        });
    }
});

// Update battle pass configuration
router.put('/config', async (req, res) => {
    try {
        const config = req.body;
        const success = await updateBattlePassConfig(config);
        
        if (success) {
            res.json({
                success: true,
                message: 'Battle pass configuration updated successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to update battle pass configuration'
            });
        }
    } catch (error) {
        console.error('Error updating battle pass config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update battle pass configuration'
        });
    }
});

// Get user's battle pass data
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userBattlePass = await getUserBattlePass(userId);
        
        if (userBattlePass) {
            res.json({
                success: true,
                data: userBattlePass
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'User battle pass not found'
            });
        }
    } catch (error) {
        console.error('Error getting user battle pass:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user battle pass data'
        });
    }
});

// Add XP to user
router.post('/xp', async (req, res) => {
    try {
        const { userId, xpAmount, source } = req.body;
        
        if (!userId || !xpAmount || !source) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, xpAmount, source'
            });
        }

        const result = await addXpToUser(userId, xpAmount, source);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error adding XP to user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add XP to user'
        });
    }
});

// Claim battle pass reward
router.post('/claim', async (req, res) => {
    try {
        const { userId, tier, serverId } = req.body;
        
        if (!userId || !tier || !serverId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, tier, serverId'
            });
        }

        const success = await claimBattlePassReward(userId, tier, serverId);
        
        if (success) {
            res.json({
                success: true,
                message: 'Reward claimed successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to claim reward'
            });
        }
    } catch (error) {
        console.error('Error claiming battle pass reward:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to claim battle pass reward'
        });
    }
});

// Subscribe to battle pass (placeholder - integrate with Stripe)
router.post('/subscribe', async (req, res) => {
    try {
        const { userId, userEmail } = req.body;
        
        if (!userId || !userEmail) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, userEmail'
            });
        }

        // Get battle pass config
        const config = await getBattlePassConfig();
        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'Battle pass configuration not found'
            });
        }

        // Create or update user battle pass
        await createOrUpdateUserBattlePass(userId, config.id, true, new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString());

        // In a real implementation, you would:
        // 1. Create a Stripe checkout session
        // 2. Return the session URL
        // 3. Handle webhook for successful payment

        // For now, return a mock response
        res.json({
            success: true,
            data: {
                sessionId: `bp_session_${Date.now()}`,
                url: `https://checkout.stripe.com/pay/bp_${Date.now()}`
            }
        });
    } catch (error) {
        console.error('Error subscribing to battle pass:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to subscribe to battle pass'
        });
    }
});

// Get items for a specific tier
router.get('/items/:tier', async (req, res) => {
    try {
        const { tier } = req.params;
        const items = await getBattlePassItemsForTier(parseInt(tier));
        
        res.json({
            success: true,
            data: items
        });
    } catch (error) {
        console.error('Error getting battle pass items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get battle pass items'
        });
    }
});

// Add battle pass item
router.post('/items', async (req, res) => {
    try {
        const item = req.body;
        const itemId = await addBattlePassItem(item);
        
        res.json({
            success: true,
            data: { id: itemId }
        });
    } catch (error) {
        console.error('Error adding battle pass item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add battle pass item'
        });
    }
});

// Remove battle pass item
router.delete('/items/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const success = await removeBattlePassItem(parseInt(itemId));
        
        if (success) {
            res.json({
                success: true,
                message: 'Item removed successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to remove item'
            });
        }
    } catch (error) {
        console.error('Error removing battle pass item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove battle pass item'
        });
    }
});

module.exports = router;
