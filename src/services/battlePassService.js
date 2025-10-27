const DatabaseService = require('./DatabaseService');

let db;

function initializeDb() {
    if (!db) {
        db = new DatabaseService();
    }
    return db;
}

async function initializeBattlePassTables() {
    try {
        const database = initializeDb();
        if (!database.pool) {
            await database.initialize();
        }
        
        const tables = [
            `CREATE TABLE IF NOT EXISTS battlepass_config (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                stripe_price_id VARCHAR(255),
                max_tiers INT NOT NULL DEFAULT 25,
                xp_per_kill INT NOT NULL DEFAULT 10,
                xp_per_playtime INT NOT NULL DEFAULT 5,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            `CREATE TABLE IF NOT EXISTS battlepass_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                battlepass_id INT NOT NULL,
                short_name VARCHAR(255) NOT NULL,
                display_name VARCHAR(255) NOT NULL,
                image VARCHAR(500),
                quantity INT NOT NULL DEFAULT 1,
                tier INT NOT NULL,
                is_free BOOLEAN NOT NULL DEFAULT FALSE,
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (battlepass_id) REFERENCES battlepass_config (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            `CREATE TABLE IF NOT EXISTS user_battlepass (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL UNIQUE,
                battlepass_id INT NOT NULL,
                current_tier INT NOT NULL DEFAULT 0,
                current_xp INT NOT NULL DEFAULT 0,
                total_xp INT NOT NULL DEFAULT 0,
                is_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
                subscription_ends_at TIMESTAMP NULL,
                claimed_tiers JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            `CREATE TABLE IF NOT EXISTS user_xp_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                xp_amount INT NOT NULL,
                source VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ];
        
        for (const table of tables) {
            await database.execute(table);
        }
        console.log('✅ Battle Pass tables initialized');
    } catch (error) {
        console.error('Error creating battle pass tables:', error);
        throw error;
    }
}

async function getBattlePassConfig() {
    try {
        const database = initializeDb();
        const query = `SELECT c.*, JSON_ARRAYAGG(JSON_OBJECT('id', i.id, 'shortName', i.short_name, 'displayName', i.display_name, 'image', i.image, 'quantity', i.quantity, 'tier', i.tier, 'isFree', i.is_free, 'category', i.category)) as items FROM battlepass_config c LEFT JOIN battlepass_items i ON c.id = i.battlepass_id WHERE c.is_active = TRUE GROUP BY c.id ORDER BY c.created_at DESC LIMIT 1`;
        const row = await database.get(query);
        if (row) {
            return { id: row.id, name: row.name, description: row.description, price: row.price, stripePriceId: row.stripe_price_id, maxTiers: row.max_tiers, xpPerKill: row.xp_per_kill, xpPerPlaytime: row.xp_per_playtime, isActive: row.is_active, items: row.items ? JSON.parse(row.items) : [], createdAt: row.created_at, updatedAt: row.updated_at };
        }
        return null;
    } catch (error) {
        console.error('Error getting battle pass config:', error);
        throw error;
    }
}

async function getUserBattlePass(userId) {
    try {
        const database = initializeDb();
        const query = `SELECT ub.*, c.name as battlepass_name, c.price, c.stripe_price_id FROM user_battlepass ub JOIN battlepass_config c ON ub.battlepass_id = c.id WHERE ub.user_id = ?`;
        const row = await database.get(query, [userId]);
        if (row) {
            return { id: row.id, userId: row.user_id, battlePassId: row.battlepass_id, currentTier: row.current_tier, currentXp: row.current_xp, totalXp: row.total_xp, isSubscribed: row.is_subscribed, subscriptionEndsAt: row.subscription_ends_at, claimedTiers: row.claimed_tiers ? JSON.parse(row.claimed_tiers) : [], createdAt: row.created_at, updatedAt: row.updated_at };
        }
        return null;
    } catch (error) {
        console.error('Error getting user battle pass:', error);
        throw error;
    }
}

async function createOrUpdateUserBattlePass(userId, battlePassId, isSubscribed = false, subscriptionEndsAt = null) {
    try {
        const database = initializeDb();
        const query = `INSERT INTO user_battlepass (user_id, battlepass_id, is_subscribed, subscription_ends_at, updated_at) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE battlepass_id = VALUES(battlepass_id), is_subscribed = VALUES(is_subscribed), subscription_ends_at = VALUES(subscription_ends_at), updated_at = NOW()`;
        const result = await database.run(query, [userId, battlePassId, isSubscribed, subscriptionEndsAt]);
        return result.id;
    } catch (error) {
        console.error('Error creating/updating user battle pass:', error);
        throw error;
    }
}

async function addXpToUser(userId, xpAmount, source) {
    try {
        const database = initializeDb();
        let userBattlePass = await getUserBattlePass(userId);
        if (!userBattlePass) {
            const config = await getBattlePassConfig();
            if (config) {
                await createOrUpdateUserBattlePass(userId, config.id);
                return await addXpToUser(userId, xpAmount, source);
            } else {
                throw new Error('No battle pass configuration found');
            }
        }
        const newTotalXp = userBattlePass.totalXp + xpAmount;
        const newCurrentXp = userBattlePass.currentXp + xpAmount;
        let newTier = userBattlePass.currentTier;
        for (let tier = userBattlePass.currentTier + 1; tier <= 100; tier++) {
            const requiredXp = tier * 100;
            if (newCurrentXp >= requiredXp) {
                newTier = tier;
            } else {
                break;
            }
        }
        await database.run(`UPDATE user_battlepass SET current_tier = ?, current_xp = ?, total_xp = ?, updated_at = NOW() WHERE user_id = ?`, [newTier, newCurrentXp, newTotalXp, userId]);
        await database.run(`INSERT INTO user_xp_log (user_id, xp_amount, source) VALUES (?, ?, ?)`, [userId, xpAmount, source]);
        return { newTier, newCurrentXp, newTotalXp, tierUp: newTier > userBattlePass.currentTier };
    } catch (error) {
        console.error('Error adding XP to user:', error);
        throw error;
    }
}

async function claimBattlePassReward(userId, tier, serverId) {
    try {
        const database = initializeDb();
        const userBattlePass = await getUserBattlePass(userId);
        if (!userBattlePass) {
            throw new Error('User battle pass not found');
        }
        const requiredXp = tier * 100;
        const isUnlocked = userBattlePass.currentXp >= requiredXp;
        const isClaimed = userBattlePass.claimedTiers.includes(tier);
        const hasSubscription = userBattlePass.isSubscribed;
        if (!isUnlocked || isClaimed || (tier > 1 && !hasSubscription)) {
            throw new Error('Tier not claimable');
        }
        const newClaimedTiers = [...userBattlePass.claimedTiers, tier];
        await database.run(`UPDATE user_battlepass SET claimed_tiers = ?, updated_at = NOW() WHERE user_id = ?`, [JSON.stringify(newClaimedTiers), userId]);
        return true;
    } catch (error) {
        console.error('Error claiming battle pass reward:', error);
        throw error;
    }
}

async function getBattlePassItemsForTier(tier) {
    try {
        const database = initializeDb();
        const rows = await database.all(`SELECT short_name as shortName, display_name as displayName, image, quantity, tier, is_free as isFree, category FROM battlepass_items WHERE tier = ? ORDER BY is_free DESC, id ASC`, [tier]);
        return rows || [];
    } catch (error) {
        console.error('Error getting battle pass items for tier:', error);
        throw error;
    }
}

async function updateBattlePassConfig(config) {
    try {
        const database = initializeDb();
        await database.run(`UPDATE battlepass_config SET name = ?, description = ?, price = ?, stripe_price_id = ?, max_tiers = ?, xp_per_kill = ?, xp_per_playtime = ?, is_active = ?, updated_at = NOW() WHERE id = ?`, [config.name, config.description, config.price, config.stripePriceId, config.maxTiers, config.xpPerKill, config.xpPerPlaytime, config.isActive, config.id]);
        return true;
    } catch (error) {
        console.error('Error updating battle pass config:', error);
        throw error;
    }
}

async function addBattlePassItem(item) {
    try {
        const database = initializeDb();
        const result = await database.run(`INSERT INTO battlepass_items (battlepass_id, short_name, display_name, image, quantity, tier, is_free, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [item.battlepassId, item.shortName, item.displayName, item.image, item.quantity, item.tier, item.isFree, item.category]);
        return result.id;
    } catch (error) {
        console.error('Error adding battle pass item:', error);
        throw error;
    }
}

async function removeBattlePassItem(itemId) {
    try {
        const database = initializeDb();
        await database.run(`DELETE FROM battlepass_items WHERE id = ?`, [itemId]);
        return true;
    } catch (error) {
        console.error('Error removing battle pass item:', error);
        throw error;
    }
}

module.exports = {
    initializeBattlePassTables,
    getBattlePassConfig,
    getUserBattlePass,
    createOrUpdateUserBattlePass,
    addXpToUser,
    claimBattlePassReward,
    getBattlePassItemsForTier,
    updateBattlePassConfig,
    addBattlePassItem,
    removeBattlePassItem
};
