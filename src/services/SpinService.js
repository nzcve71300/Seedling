const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

class SpinService {
    constructor(database, rceManager) {
        this.database = database;
        this.rceManager = rceManager;
        this.assetsPath = path.join(__dirname, '../../assets/spin');
        this.initializeDatabase();
    }

    async initializeDatabase() {
        try {
            // Create spin system tables if they don't exist
            await this.database.run(`
                CREATE TABLE IF NOT EXISTS spin_config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    guild_id VARCHAR(20) NOT NULL,
                    command_channel_id VARCHAR(20) NOT NULL,
                    log_channel_id VARCHAR(20) NOT NULL,
                    cooldown_hours INT NOT NULL DEFAULT 24,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_guild (guild_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            await this.database.run(`
                CREATE TABLE IF NOT EXISTS spin_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    server_nickname VARCHAR(255) NOT NULL,
                    display_name VARCHAR(255) NOT NULL,
                    short_name VARCHAR(255) NOT NULL,
                    quantity INT NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_server (server_nickname)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            await this.database.run(`
                CREATE TABLE IF NOT EXISTS user_spin_cooldowns (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(20) NOT NULL,
                    server_nickname VARCHAR(255) NOT NULL,
                    last_spin TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_user_server (user_id, server_nickname),
                    INDEX idx_user (user_id),
                    INDEX idx_server (server_nickname)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            await this.database.run(`
                CREATE TABLE IF NOT EXISTS spin_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(20) NOT NULL,
                    username VARCHAR(255) NOT NULL,
                    server_nickname VARCHAR(255) NOT NULL,
                    action ENUM('spin', 'claim', 'fail') NOT NULL,
                    item_display_name VARCHAR(255) NULL,
                    item_short_name VARCHAR(255) NULL,
                    quantity INT NULL,
                    in_game_name VARCHAR(255) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user (user_id),
                    INDEX idx_server (server_nickname),
                    INDEX idx_action (action)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            console.log('✅ SpinService database initialized');
        } catch (error) {
            console.error('❌ Failed to initialize SpinService database:', error);
        }
    }

    async setupSpinConfig(guildId, commandChannelId, logChannelId, cooldownHours) {
        try {
            await this.database.run(`
                INSERT INTO spin_config (guild_id, command_channel_id, log_channel_id, cooldown_hours)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                command_channel_id = VALUES(command_channel_id),
                log_channel_id = VALUES(log_channel_id),
                cooldown_hours = VALUES(cooldown_hours),
                updated_at = CURRENT_TIMESTAMP
            `, [guildId, commandChannelId, logChannelId, cooldownHours]);

            console.log(`✅ Spin config setup for guild ${guildId}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to setup spin config:', error);
            throw error;
        }
    }

    async getSpinConfig(guildId) {
        try {
            const config = await this.database.get(
                'SELECT * FROM spin_config WHERE guild_id = ?',
                [guildId]
            );
            return config;
        } catch (error) {
            console.error('❌ Failed to get spin config:', error);
            return null;
        }
    }

    async addSpinItem(serverNickname, displayName, shortName, quantity) {
        try {
            const result = await this.database.run(`
                INSERT INTO spin_items (server_nickname, display_name, short_name, quantity)
                VALUES (?, ?, ?, ?)
            `, [serverNickname, displayName, shortName, quantity]);

            console.log(`✅ Added spin item: ${displayName} for server ${serverNickname}`);
            return {
                id: result.insertId,
                server_nickname: serverNickname,
                display_name: displayName,
                short_name: shortName,
                quantity: quantity
            };
        } catch (error) {
            console.error('❌ Failed to add spin item:', error);
            throw error;
        }
    }

    async getSpinItems(serverNickname) {
        try {
            const items = await this.database.all(
                'SELECT * FROM spin_items WHERE server_nickname = ?',
                [serverNickname]
            );
            return items;
        } catch (error) {
            console.error('❌ Failed to get spin items:', error);
            return [];
        }
    }

    async updateSpinItem(itemId, displayName, shortName, quantity) {
        try {
            await this.database.run(`
                UPDATE spin_items 
                SET display_name = ?, short_name = ?, quantity = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [displayName, shortName, quantity, itemId]);

            console.log(`✅ Updated spin item ID: ${itemId}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to update spin item:', error);
            throw error;
        }
    }

    async removeSpinItem(itemId) {
        try {
            await this.database.run('DELETE FROM spin_items WHERE id = ?', [itemId]);
            console.log(`✅ Removed spin item ID: ${itemId}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to remove spin item:', error);
            throw error;
        }
    }

    async checkUserCooldown(userId, serverNickname) {
        try {
            const cooldown = await this.database.get(
                'SELECT * FROM user_spin_cooldowns WHERE user_id = ? AND server_nickname = ?',
                [userId, serverNickname]
            );

            if (!cooldown) return { canSpin: true, timeLeft: 0 };

            const config = await this.getSpinConfig(cooldown.guild_id);
            if (!config) return { canSpin: true, timeLeft: 0 };

            const hoursSinceLastSpin = (Date.now() - new Date(cooldown.last_spin).getTime()) / (1000 * 60 * 60);
            const canSpin = hoursSinceLastSpin >= config.cooldown_hours;
            const timeLeft = canSpin ? 0 : config.cooldown_hours - hoursSinceLastSpin;

            return { canSpin, timeLeft };
        } catch (error) {
            console.error('❌ Failed to check user cooldown:', error);
            return { canSpin: true, timeLeft: 0 };
        }
    }

    async setUserCooldown(userId, serverNickname, guildId) {
        try {
            await this.database.run(`
                INSERT INTO user_spin_cooldowns (user_id, server_nickname, last_spin)
                VALUES (?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                last_spin = NOW()
            `, [userId, serverNickname]);

            console.log(`✅ Set cooldown for user ${userId} on server ${serverNickname}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to set user cooldown:', error);
            throw error;
        }
    }

    async clearUserCooldown(userId, serverNickname) {
        try {
            await this.database.run(
                'DELETE FROM user_spin_cooldowns WHERE user_id = ? AND server_nickname = ?',
                [userId, serverNickname]
            );

            console.log(`✅ Cleared cooldown for user ${userId} on server ${serverNickname}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to clear user cooldown:', error);
            throw error;
        }
    }

    async logSpinAction(userId, username, serverNickname, action, itemDisplayName = null, itemShortName = null, quantity = null, inGameName = null) {
        try {
            await this.database.run(`
                INSERT INTO spin_logs (user_id, username, server_nickname, action, item_display_name, item_short_name, quantity, in_game_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [userId, username, serverNickname, action, itemDisplayName, itemShortName, quantity, inGameName]);

            console.log(`✅ Logged spin action: ${action} for user ${username}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to log spin action:', error);
        }
    }

    async performSpin(userId, username, serverNickname, guildId) {
        try {
            // Check if user can spin
            const cooldownCheck = await this.checkUserCooldown(userId, serverNickname);
            if (!cooldownCheck.canSpin) {
                return {
                    success: false,
                    error: 'cooldown',
                    timeLeft: cooldownCheck.timeLeft
                };
            }

            // Get available items for this server
            const items = await this.getSpinItems(serverNickname);
            if (items.length === 0) {
                return {
                    success: false,
                    error: 'no_items',
                    message: 'No items available for this server'
                };
            }

            // 20% chance of failure
            const isFailure = Math.random() < 0.2;
            
            if (isFailure) {
                // Log failure
                await this.logSpinAction(userId, username, serverNickname, 'fail');
                await this.setUserCooldown(userId, serverNickname, guildId);
                
                return {
                    success: false,
                    error: 'failure',
                    message: 'Better luck next time!'
                };
            }

            // Select random item
            const randomItem = items[Math.floor(Math.random() * items.length)];
            
            // Log successful spin
            await this.logSpinAction(userId, username, serverNickname, 'spin', randomItem.display_name, randomItem.short_name, randomItem.quantity);
            await this.setUserCooldown(userId, serverNickname, guildId);

            return {
                success: true,
                item: randomItem
            };
        } catch (error) {
            console.error('❌ Failed to perform spin:', error);
            throw error;
        }
    }

    async claimPrize(userId, username, serverNickname, inGameName, item) {
        try {
            // Check if RCE Manager is available and server is connected
            if (!this.rceManager || !this.rceManager.isServerConnected(serverNickname)) {
                return {
                    success: false,
                    error: 'server_not_connected',
                    message: 'Server is not connected. Please contact an administrator.'
                };
            }

            // Send RCON command to give item
            const rconCommand = `inventory.giveto "${inGameName}" "${item.short_name}" ${item.quantity}`;
            await this.rceManager.sendRconCommand(serverNickname, rconCommand);
            
            // Send in-game message
            const inGameMessage = `say <b><size=45><color=#00FF66>@{${inGameName}} Claimed their</color></b><b><size=45><color=#A0522D>daily prize!</color></b>`;
            await this.rceManager.sendRconCommand(serverNickname, inGameMessage);

            // Log claim
            await this.logSpinAction(userId, username, serverNickname, 'claim', item.display_name, item.short_name, item.quantity, inGameName);

            return {
                success: true,
                message: 'Prize claimed successfully!'
            };
        } catch (error) {
            console.error('❌ Failed to claim prize:', error);
            return {
                success: false,
                error: 'rcon_error',
                message: 'Failed to deliver prize. Please contact an administrator.'
            };
        }
    }

    getAssetPath(filename) {
        const fullPath = path.join(this.assetsPath, filename);
        return fs.existsSync(fullPath) ? fullPath : null;
    }

    createSpinEmbed(title, description, color = 0x00ff00, imagePath = null) {
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp()
            .setFooter({ 
                text: 'Daily Spin System • Powered by Seedy', 
                iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
            });

        if (imagePath) {
            embed.setImage(`attachment://${path.basename(imagePath)}`);
        }

        return embed;
    }
}

module.exports = SpinService;
