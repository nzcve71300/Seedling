const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../data/seedy.db');

// Initialize database tables if they don't exist
function initializeBattlePassTables() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);

        const createBattlePassConfigTable = `
            CREATE TABLE IF NOT EXISTS battlepass_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                stripe_price_id TEXT,
                max_tiers INTEGER NOT NULL DEFAULT 25,
                xp_per_kill INTEGER NOT NULL DEFAULT 10,
                xp_per_playtime INTEGER NOT NULL DEFAULT 5,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createBattlePassItemsTable = `
            CREATE TABLE IF NOT EXISTS battlepass_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                battlepass_id INTEGER NOT NULL,
                short_name TEXT NOT NULL,
                display_name TEXT NOT NULL,
                image TEXT,
                quantity INTEGER NOT NULL DEFAULT 1,
                tier INTEGER NOT NULL,
                is_free BOOLEAN NOT NULL DEFAULT 0,
                category TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (battlepass_id) REFERENCES battlepass_config (id)
            )
        `;

        const createUserBattlePassTable = `
            CREATE TABLE IF NOT EXISTS user_battlepass (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL UNIQUE,
                battlepass_id INTEGER NOT NULL,
                current_tier INTEGER NOT NULL DEFAULT 0,
                current_xp INTEGER NOT NULL DEFAULT 0,
                total_xp INTEGER NOT NULL DEFAULT 0,
                is_subscribed BOOLEAN NOT NULL DEFAULT 0,
                subscription_ends_at DATETIME,
                claimed_tiers TEXT DEFAULT '[]',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (battlepass_id) REFERENCES battlepass_config (id)
            )
        `;

        const createUserXpLogTable = `
            CREATE TABLE IF NOT EXISTS user_xp_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                xp_amount INTEGER NOT NULL,
                source TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        db.serialize(() => {
            db.run(createBattlePassConfigTable);
            db.run(createBattlePassItemsTable);
            db.run(createUserBattlePassTable);
            db.run(createUserXpLogTable, (err) => {
                if (err) {
                    console.error('Error creating battle pass tables:', err);
                    reject(err);
                } else {
                    console.log('✅ Battle Pass tables initialized');
                    resolve();
                }
            });
        });

        db.close();
    });
}

// Get battle pass configuration
function getBattlePassConfig() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);

        const query = `
            SELECT 
                c.*,
                GROUP_CONCAT(
                    json_object(
                        'id', i.id,
                        'shortName', i.short_name,
                        'displayName', i.display_name,
                        'image', i.image,
                        'quantity', i.quantity,
                        'tier', i.tier,
                        'isFree', i.is_free,
                        'category', i.category
                    )
                ) as items
            FROM battlepass_config c
            LEFT JOIN battlepass_items i ON c.id = i.battlepass_id
            WHERE c.is_active = 1
            GROUP BY c.id
            ORDER BY c.created_at DESC
            LIMIT 1
        `;

        db.get(query, (err, row) => {
            if (err) {
                console.error('Error getting battle pass config:', err);
                reject(err);
            } else if (row) {
                const config = {
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    price: row.price,
                    stripePriceId: row.stripe_price_id,
                    maxTiers: row.max_tiers,
                    xpPerKill: row.xp_per_kill,
                    xpPerPlaytime: row.xp_per_playtime,
                    isActive: row.is_active === 1,
                    items: row.items ? JSON.parse(`[${row.items}]`) : [],
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };
                resolve(config);
            } else {
                resolve(null);
            }
        });

        db.close();
    });
}

// Get user's battle pass data
function getUserBattlePass(userId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);

        const query = `
            SELECT 
                ub.*,
                c.name as battlepass_name,
                c.price,
                c.stripe_price_id
            FROM user_battlepass ub
            JOIN battlepass_config c ON ub.battlepass_id = c.id
            WHERE ub.user_id = ?
        `;

        db.get(query, [userId], (err, row) => {
            if (err) {
                console.error('Error getting user battle pass:', err);
                reject(err);
            } else if (row) {
                const userBattlePass = {
                    id: row.id,
                    userId: row.user_id,
                    battlePassId: row.battlepass_id,
                    currentTier: row.current_tier,
                    currentXp: row.current_xp,
                    totalXp: row.total_xp,
                    isSubscribed: row.is_subscribed === 1,
                    subscriptionEndsAt: row.subscription_ends_at,
                    claimedTiers: JSON.parse(row.claimed_tiers || '[]'),
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };
                resolve(userBattlePass);
            } else {
                resolve(null);
            }
        });

        db.close();
    });
}

// Create or update user battle pass
function createOrUpdateUserBattlePass(userId, battlePassId, isSubscribed = false, subscriptionEndsAt = null) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);

        const query = `
            INSERT OR REPLACE INTO user_battlepass 
            (user_id, battlepass_id, is_subscribed, subscription_ends_at, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        db.run(query, [userId, battlePassId, isSubscribed ? 1 : 0, subscriptionEndsAt], function(err) {
            if (err) {
                console.error('Error creating/updating user battle pass:', err);
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });

        db.close();
    });
}

// Add XP to user
function addXpToUser(userId, xpAmount, source) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);

        // First, get current user battle pass data
        getUserBattlePass(userId).then(userBattlePass => {
            if (!userBattlePass) {
                // Create user battle pass if it doesn't exist
                getBattlePassConfig().then(config => {
                    if (config) {
                        createOrUpdateUserBattlePass(userId, config.id).then(() => {
                            addXpToUser(userId, xpAmount, source).then(resolve).catch(reject);
                        }).catch(reject);
                    } else {
                        reject(new Error('No battle pass configuration found'));
                    }
                }).catch(reject);
                return;
            }

            // Update XP
            const newTotalXp = userBattlePass.totalXp + xpAmount;
            const newCurrentXp = userBattlePass.currentXp + xpAmount;
            
            // Calculate new tier
            let newTier = userBattlePass.currentTier;
            for (let tier = userBattlePass.currentTier + 1; tier <= 100; tier++) {
                const requiredXp = tier * 100;
                if (newCurrentXp >= requiredXp) {
                    newTier = tier;
                } else {
                    break;
                }
            }

            const updateQuery = `
                UPDATE user_battlepass 
                SET current_tier = ?, current_xp = ?, total_xp = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `;

            db.run(updateQuery, [newTier, newCurrentXp, newTotalXp, userId], function(err) {
                if (err) {
                    console.error('Error updating user XP:', err);
                    reject(err);
                } else {
                    // Log XP addition
                    const logQuery = `
                        INSERT INTO user_xp_log (user_id, xp_amount, source)
                        VALUES (?, ?, ?)
                    `;
                    
                    db.run(logQuery, [userId, xpAmount, source], (logErr) => {
                        if (logErr) {
                            console.error('Error logging XP:', logErr);
                        }
                        
                        resolve({
                            newTier,
                            newCurrentXp,
                            newTotalXp,
                            tierUp: newTier > userBattlePass.currentTier
                        });
                    });
                }
            });
        }).catch(reject);

        db.close();
    });
}

// Claim battle pass reward
function claimBattlePassReward(userId, tier, serverId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);

        // Get user battle pass data
        getUserBattlePass(userId).then(userBattlePass => {
            if (!userBattlePass) {
                reject(new Error('User battle pass not found'));
                return;
            }

            // Check if tier is claimable
            const requiredXp = tier * 100;
            const isUnlocked = userBattlePass.currentXp >= requiredXp;
            const isClaimed = userBattlePass.claimedTiers.includes(tier);
            const hasSubscription = userBattlePass.isSubscribed;

            if (!isUnlocked || isClaimed || (tier > 1 && !hasSubscription)) {
                reject(new Error('Tier not claimable'));
                return;
            }

            // Add tier to claimed tiers
            const newClaimedTiers = [...userBattlePass.claimedTiers, tier];
            const updateQuery = `
                UPDATE user_battlepass 
                SET claimed_tiers = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `;

            db.run(updateQuery, [JSON.stringify(newClaimedTiers), userId], function(err) {
                if (err) {
                    console.error('Error claiming battle pass reward:', err);
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        }).catch(reject);

        db.close();
    });
}

// Get battle pass items for a specific tier
function getBattlePassItemsForTier(tier) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);

        const query = `
            SELECT 
                short_name as shortName,
                display_name as displayName,
                image,
                quantity,
                tier,
                is_free as isFree,
                category
            FROM battlepass_items
            WHERE tier = ?
            ORDER BY is_free DESC, id ASC
        `;

        db.all(query, [tier], (err, rows) => {
            if (err) {
                console.error('Error getting battle pass items for tier:', err);
                reject(err);
            } else {
                resolve(rows || []);
            }
        });

        db.close();
    });
}

// Update battle pass configuration
function updateBattlePassConfig(config) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);

        const query = `
            UPDATE battlepass_config 
            SET name = ?, description = ?, price = ?, stripe_price_id = ?, 
                max_tiers = ?, xp_per_kill = ?, xp_per_playtime = ?, 
                is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        db.run(query, [
            config.name,
            config.description,
            config.price,
            config.stripePriceId,
            config.maxTiers,
            config.xpPerKill,
            config.xpPerPlaytime,
            config.isActive ? 1 : 0,
            config.id
        ], function(err) {
            if (err) {
                console.error('Error updating battle pass config:', err);
                reject(err);
            } else {
                resolve(true);
            }
        });

        db.close();
    });
}

// Add battle pass item
function addBattlePassItem(item) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);

        const query = `
            INSERT INTO battlepass_items 
            (battlepass_id, short_name, display_name, image, quantity, tier, is_free, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(query, [
            item.battlepassId,
            item.shortName,
            item.displayName,
            item.image,
            item.quantity,
            item.tier,
            item.isFree ? 1 : 0,
            item.category
        ], function(err) {
            if (err) {
                console.error('Error adding battle pass item:', err);
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });

        db.close();
    });
}

// Remove battle pass item
function removeBattlePassItem(itemId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);

        const query = `DELETE FROM battlepass_items WHERE id = ?`;

        db.run(query, [itemId], function(err) {
            if (err) {
                console.error('Error removing battle pass item:', err);
                reject(err);
            } else {
                resolve(true);
            }
        });

        db.close();
    });
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
