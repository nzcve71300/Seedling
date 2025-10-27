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
        const [rows] = await database.execute('SELECT * FROM battlepass_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1');
        return rows[0] || null;
    } catch (error) {
        console.error('Error getting battle pass config:', error);
        return null;
    }
}

async function getUserBattlePass(userId) {
    try {
        const database = initializeDb();
        const [rows] = await database.execute('SELECT * FROM user_battlepass WHERE user_id = ?', [userId]);
        return rows[0] || null;
    } catch (error) {
        console.error('Error getting user battle pass:', error);
        return null;
    }
}

async function createOrUpdateUserBattlePass(userId, battlepassId, currentTier = 0, currentXp = 0, totalXp = 0, isSubscribed = false, subscriptionEndsAt = null) {
    try {
        const database = initializeDb();
        const claimedTiers = JSON.stringify([]);
        
        await database.execute(`
            INSERT INTO user_battlepass (user_id, battlepass_id, current_tier, current_xp, total_xp, is_subscribed, subscription_ends_at, claimed_tiers)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            battlepass_id = VALUES(battlepass_id),
            current_tier = VALUES(current_tier),
            current_xp = VALUES(current_xp),
            total_xp = VALUES(total_xp),
            is_subscribed = VALUES(is_subscribed),
            subscription_ends_at = VALUES(subscription_ends_at),
            updated_at = CURRENT_TIMESTAMP
        `, [userId, battlepassId, currentTier, currentXp, totalXp, isSubscribed, subscriptionEndsAt, claimedTiers]);
        
        return true;
    } catch (error) {
        console.error('Error creating/updating user battle pass:', error);
        return false;
    }
}

async function addXpToUser(userId, xpAmount, source) {
    try {
        const database = initializeDb();
        
        // Add XP log entry
        await database.execute(
            'INSERT INTO user_xp_log (user_id, xp_amount, source) VALUES (?, ?, ?)',
            [userId, xpAmount, source]
        );
        
        // Update user's battle pass XP
        await database.execute(`
            UPDATE user_battlepass 
            SET current_xp = current_xp + ?, 
                total_xp = total_xp + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [xpAmount, xpAmount, userId]);
        
        return true;
    } catch (error) {
        console.error('Error adding XP to user:', error);
        return false;
    }
}

async function claimBattlePassReward(userId, tier) {
    try {
        const database = initializeDb();
        
        // Get user's current claimed tiers
        const [userRows] = await database.execute('SELECT claimed_tiers FROM user_battlepass WHERE user_id = ?', [userId]);
        if (!userRows[0]) return false;
        
        const claimedTiers = JSON.parse(userRows[0].claimed_tiers || '[]');
        if (claimedTiers.includes(tier)) return false; // Already claimed
        
        // Add tier to claimed list
        claimedTiers.push(tier);
        
        await database.execute(
            'UPDATE user_battlepass SET claimed_tiers = ? WHERE user_id = ?',
            [JSON.stringify(claimedTiers), userId]
        );
        
        return true;
    } catch (error) {
        console.error('Error claiming battle pass reward:', error);
        return false;
    }
}

async function getBattlePassItemsForTier(tier) {
    try {
        const database = initializeDb();
        const [rows] = await database.execute(
            'SELECT * FROM battlepass_items WHERE tier = ? ORDER BY is_free DESC',
            [tier]
        );
        return rows;
    } catch (error) {
        console.error('Error getting battle pass items for tier:', error);
        return [];
    }
}

async function updateBattlePassConfig(config) {
    try {
        const database = initializeDb();
        const { name, description, price, stripe_price_id, max_tiers, xp_per_kill, xp_per_playtime, is_active } = config;
        
        await database.execute(`
            UPDATE battlepass_config 
            SET name = ?, description = ?, price = ?, stripe_price_id = ?, 
                max_tiers = ?, xp_per_kill = ?, xp_per_playtime = ?, is_active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE is_active = TRUE
        `, [name, description, price, stripe_price_id, max_tiers, xp_per_kill, xp_per_playtime, is_active]);
        
        return true;
    } catch (error) {
        console.error('Error updating battle pass config:', error);
        return false;
    }
}

async function addBattlePassItem(battlepassId, shortName, displayName, image, quantity, tier, isFree, category) {
    try {
        const database = initializeDb();
        
        await database.execute(`
            INSERT INTO battlepass_items (battlepass_id, short_name, display_name, image, quantity, tier, is_free, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [battlepassId, shortName, displayName, image, quantity, tier, isFree, category]);
        
        return true;
    } catch (error) {
        console.error('Error adding battle pass item:', error);
        return false;
    }
}

async function removeBattlePassItem(itemId) {
    try {
        const database = initializeDb();
        
        await database.execute('DELETE FROM battlepass_items WHERE id = ?', [itemId]);
        
        return true;
    } catch (error) {
        console.error('Error removing battle pass item:', error);
        return false;
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
