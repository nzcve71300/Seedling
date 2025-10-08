const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class GiveawayService {
    constructor(bot) {
        this.bot = bot;
        this.database = bot.database;
        this.client = bot.client;
        this.activeTimers = new Map();
    }

    /**
     * Parse time string (1m, 1h, 1d) to milliseconds
     */
    parseTime(timeStr) {
        const regex = /^(\d+)([mhd])$/;
        const match = timeStr.toLowerCase().match(regex);
        
        if (!match) {
            return null;
        }
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        const multipliers = {
            'm': 60 * 1000,        // minutes
            'h': 60 * 60 * 1000,   // hours
            'd': 24 * 60 * 60 * 1000  // days
        };
        
        return value * multipliers[unit];
    }

    /**
     * Format milliseconds to readable time
     */
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
        if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
        if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }

    /**
     * Create a new giveaway
     */
    async createGiveaway(name, description, maxWinners, timeStr, channelId, creatorId, guildId) {
        const duration = this.parseTime(timeStr);
        if (!duration) {
            throw new Error('Invalid time format. Use format like: 1m, 1h, 1d');
        }

        const endTime = new Date(Date.now() + duration);
        
        const [result] = await this.database.pool.execute(
            `INSERT INTO giveaways (giveaway_name, description, max_winners, channel_id, creator_id, guild_id, end_time, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [name, description, maxWinners, channelId, creatorId, guildId, endTime]
        );

        return {
            id: result.insertId,
            giveaway_name: name,
            description: description,
            max_winners: maxWinners,
            channel_id: channelId,
            creator_id: creatorId,
            guild_id: guildId,
            end_time: endTime,
            status: 'active'
        };
    }

    /**
     * Create giveaway embed
     */
    createGiveawayEmbed(giveaway, entries = 0) {
        const endTimestamp = Math.floor(new Date(giveaway.end_time).getTime() / 1000);
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle(`🎉 ${giveaway.giveaway_name}`)
            .setDescription(giveaway.description)
            .addFields(
                { name: '🏆 Winners', value: `${giveaway.max_winners}`, inline: false },
                { name: '👥 Entries', value: `${entries}`, inline: false },
                { name: '⏰ Ends', value: `<t:${endTimestamp}:F> (<t:${endTimestamp}:R>)`, inline: false }
            )
            .setFooter({ text: 'Click the 🌱 button below to enter!' })
            .setTimestamp();

        return embed;
    }

    /**
     * Create entry button
     */
    createEntryButton(giveawayId) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`giveaway_enter_${giveawayId}`)
                    .setLabel('Enter Giveaway')
                    .setEmoji('🌱')
                    .setStyle(ButtonStyle.Success)
            );

        return row;
    }

    /**
     * Post giveaway message
     */
    async postGiveaway(giveaway) {
        const channel = await this.client.channels.fetch(giveaway.channel_id);
        const embed = this.createGiveawayEmbed(giveaway, 0);
        const button = this.createEntryButton(giveaway.id);

        const message = await channel.send({
            embeds: [embed],
            components: [button]
        });

        // Update giveaway with message ID
        await this.database.pool.execute(
            'UPDATE giveaways SET message_id = ? WHERE id = ?',
            [message.id, giveaway.id]
        );

        // Schedule giveaway end
        this.scheduleGiveawayEnd(giveaway.id, new Date(giveaway.end_time).getTime() - Date.now());

        return message;
    }

    /**
     * Handle giveaway entry
     */
    async enterGiveaway(giveawayId, userId, username) {
        try {
            // Check if giveaway is active
            const [giveaways] = await this.database.pool.execute(
                'SELECT * FROM giveaways WHERE id = ? AND status = "active"',
                [giveawayId]
            );

            if (giveaways.length === 0) {
                return { success: false, message: 'This giveaway is no longer active.' };
            }

            const giveaway = giveaways[0];

            // Check if user already entered
            const [existingEntries] = await this.database.pool.execute(
                'SELECT * FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?',
                [giveawayId, userId]
            );

            if (existingEntries.length > 0) {
                return { success: false, message: 'You have already entered this giveaway!' };
            }

            // Add entry
            await this.database.pool.execute(
                'INSERT INTO giveaway_entries (giveaway_id, user_id, username) VALUES (?, ?, ?)',
                [giveawayId, userId, username]
            );

            // Get updated entry count
            const [countResult] = await this.database.pool.execute(
                'SELECT COUNT(*) as count FROM giveaway_entries WHERE giveaway_id = ?',
                [giveawayId]
            );
            const entryCount = countResult[0].count;

            // Update giveaway message
            await this.updateGiveawayMessage(giveaway, entryCount);

            return { success: true, giveaway: giveaway };
        } catch (error) {
            console.error('Error entering giveaway:', error);
            return { success: false, message: 'An error occurred while entering the giveaway.' };
        }
    }

    /**
     * Update giveaway message with new entry count
     */
    async updateGiveawayMessage(giveaway, entryCount) {
        try {
            if (!giveaway.message_id) return;

            const channel = await this.client.channels.fetch(giveaway.channel_id);
            const message = await channel.messages.fetch(giveaway.message_id);
            
            const embed = this.createGiveawayEmbed(giveaway, entryCount);
            const button = this.createEntryButton(giveaway.id);

            await message.edit({
                embeds: [embed],
                components: [button]
            });
        } catch (error) {
            console.error('Error updating giveaway message:', error);
        }
    }

    /**
     * Pick random winners (super random and fair)
     */
    async pickWinners(giveawayId, count) {
        const [entries] = await this.database.pool.execute(
            'SELECT * FROM giveaway_entries WHERE giveaway_id = ?',
            [giveawayId]
        );

        if (entries.length === 0) {
            return [];
        }

        // Use crypto.randomBytes for truly random selection
        const crypto = require('crypto');
        const winners = [];
        const availableEntries = [...entries];

        const actualWinnerCount = Math.min(count, availableEntries.length);

        for (let i = 0; i < actualWinnerCount; i++) {
            // Generate cryptographically secure random index
            const randomBytes = crypto.randomBytes(4);
            const randomValue = randomBytes.readUInt32BE(0);
            const randomIndex = randomValue % availableEntries.length;
            
            winners.push(availableEntries[randomIndex]);
            availableEntries.splice(randomIndex, 1);
        }

        return winners;
    }

    /**
     * End giveaway and announce winners
     */
    async endGiveaway(giveawayId) {
        try {
            const [giveaways] = await this.database.pool.execute(
                'SELECT * FROM giveaways WHERE id = ?',
                [giveawayId]
            );

            if (giveaways.length === 0) {
                console.error('Giveaway not found:', giveawayId);
                return;
            }

            const giveaway = giveaways[0];

            // Update giveaway status
            await this.database.pool.execute(
                'UPDATE giveaways SET status = "ended" WHERE id = ?',
                [giveawayId]
            );

            // Pick winners
            const winners = await this.pickWinners(giveawayId, giveaway.max_winners);

            if (winners.length === 0) {
                // No entries
                await this.announceNoWinners(giveaway);
                return;
            }

            // Save winners to database
            for (const winner of winners) {
                await this.database.pool.execute(
                    'INSERT INTO giveaway_winners (giveaway_id, user_id, username) VALUES (?, ?, ?)',
                    [giveawayId, winner.user_id, winner.username]
                );
            }

            // Notify winners and announce
            await this.announceWinners(giveaway, winners);

            // Clear timer
            if (this.activeTimers.has(giveawayId)) {
                clearTimeout(this.activeTimers.get(giveawayId));
                this.activeTimers.delete(giveawayId);
            }

        } catch (error) {
            console.error('Error ending giveaway:', error);
        }
    }

    /**
     * Announce winners
     */
    async announceWinners(giveaway, winners) {
        try {
            const channel = await this.client.channels.fetch(giveaway.channel_id);
            
            // Create winner announcement embed
            const winnerMentions = winners.map(w => `<@${w.user_id}>`).join(', ');
            
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle(`🎉 Giveaway Ended: ${giveaway.giveaway_name}`)
                .setDescription(`**Winners:**\n${winnerMentions}`)
                .addFields(
                    { name: '🎁 Prize', value: giveaway.description, inline: false }
                )
                .setFooter({ text: 'Congratulations to all winners!' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            // Update original giveaway message
            if (giveaway.message_id) {
                try {
                    const message = await channel.messages.fetch(giveaway.message_id);
                    const endedEmbed = new EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle(`🎉 ${giveaway.giveaway_name} (ENDED)`)
                        .setDescription(giveaway.description)
                        .addFields(
                            { name: '🏆 Winners', value: winnerMentions, inline: false }
                        )
                        .setFooter({ text: 'This giveaway has ended' })
                        .setTimestamp();

                    await message.edit({ embeds: [endedEmbed], components: [] });
                } catch (error) {
                    console.error('Error updating original message:', error);
                }
            }

            // DM each winner
            for (const winner of winners) {
                try {
                    const user = await this.client.users.fetch(winner.user_id);
                    const dmEmbed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle('🎉 Congratulations! You Won!')
                        .setDescription(`Hello ${user.username},\n\nYou won the giveaway: **${giveaway.giveaway_name}**`)
                        .addFields(
                            { name: '🎁 Prize', value: giveaway.description, inline: false }
                        )
                        .setFooter({ text: 'SEED Giveaway System' })
                        .setTimestamp();

                    await user.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.error(`Failed to DM winner ${winner.username}:`, error);
                }
            }
        } catch (error) {
            console.error('Error announcing winners:', error);
        }
    }

    /**
     * Announce no winners
     */
    async announceNoWinners(giveaway) {
        try {
            const channel = await this.client.channels.fetch(giveaway.channel_id);
            
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle(`🎉 Giveaway Ended: ${giveaway.giveaway_name}`)
                .setDescription('**No winners could be determined as there were no valid entries.**')
                .setFooter({ text: 'Better luck next time!' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            // Update original message
            if (giveaway.message_id) {
                try {
                    const message = await channel.messages.fetch(giveaway.message_id);
                    const endedEmbed = new EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle(`🎉 ${giveaway.giveaway_name} (ENDED)`)
                        .setDescription(giveaway.description)
                        .addFields(
                            { name: '🏆 Winners', value: 'No valid entries', inline: false }
                        )
                        .setFooter({ text: 'This giveaway has ended' })
                        .setTimestamp();

                    await message.edit({ embeds: [endedEmbed], components: [] });
                } catch (error) {
                    console.error('Error updating original message:', error);
                }
            }
        } catch (error) {
            console.error('Error announcing no winners:', error);
        }
    }

    /**
     * Schedule giveaway end
     */
    scheduleGiveawayEnd(giveawayId, delay) {
        // Clear existing timer if any
        if (this.activeTimers.has(giveawayId)) {
            clearTimeout(this.activeTimers.get(giveawayId));
        }

        // Schedule new timer
        const timer = setTimeout(async () => {
            await this.endGiveaway(giveawayId);
        }, delay);

        this.activeTimers.set(giveawayId, timer);
    }

    /**
     * Load active giveaways on bot start
     */
    async loadActiveGiveaways() {
        try {
            const [giveaways] = await this.database.pool.execute(
                'SELECT * FROM giveaways WHERE status = "active" AND end_time > NOW()'
            );

            console.log(`📊 Loading ${giveaways.length} active giveaways...`);

            for (const giveaway of giveaways) {
                const delay = new Date(giveaway.end_time).getTime() - Date.now();
                if (delay > 0) {
                    this.scheduleGiveawayEnd(giveaway.id, delay);
                    console.log(`⏰ Scheduled giveaway: ${giveaway.giveaway_name} (ends in ${this.formatTime(delay)})`);
                } else {
                    // End immediately if time has passed
                    await this.endGiveaway(giveaway.id);
                }
            }
        } catch (error) {
            console.error('Error loading active giveaways:', error);
        }
    }

    /**
     * Get all active giveaways
     */
    async getActiveGiveaways() {
        const [giveaways] = await this.database.pool.execute(
            'SELECT * FROM giveaways WHERE status = "active" ORDER BY end_time ASC'
        );
        return giveaways;
    }

    /**
     * Close giveaway early
     */
    async closeGiveaway(giveawayId) {
        await this.endGiveaway(giveawayId);
    }

    /**
     * Reroll giveaway winners
     */
    async rerollGiveaway(giveawayId) {
        try {
            const [giveaways] = await this.database.pool.execute(
                'SELECT * FROM giveaways WHERE id = ?',
                [giveawayId]
            );

            if (giveaways.length === 0) {
                return { success: false, message: 'Giveaway not found.' };
            }

            const giveaway = giveaways[0];

            // Delete old winners
            await this.database.pool.execute(
                'DELETE FROM giveaway_winners WHERE giveaway_id = ?',
                [giveawayId]
            );

            // Pick new winners
            const winners = await this.pickWinners(giveawayId, giveaway.max_winners);

            if (winners.length === 0) {
                return { success: false, message: 'No entries to reroll from.' };
            }

            // Save new winners
            for (const winner of winners) {
                await this.database.pool.execute(
                    'INSERT INTO giveaway_winners (giveaway_id, user_id, username) VALUES (?, ?, ?)',
                    [giveawayId, winner.user_id, winner.username]
                );
            }

            // Announce new winners
            const channel = await this.client.channels.fetch(giveaway.channel_id);
            const winnerMentions = winners.map(w => `<@${w.user_id}>`).join(', ');
            
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle(`🔄 Giveaway Rerolled: ${giveaway.giveaway_name}`)
                .setDescription(`**New Winners:**\n${winnerMentions}`)
                .addFields(
                    { name: '🎁 Prize', value: giveaway.description, inline: false }
                )
                .setFooter({ text: 'Congratulations to the new winners!' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            // DM new winners
            for (const winner of winners) {
                try {
                    const user = await this.client.users.fetch(winner.user_id);
                    const dmEmbed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle('🎉 Congratulations! You Won! (Reroll)')
                        .setDescription(`Hello ${user.username},\n\nYou won the rerolled giveaway: **${giveaway.giveaway_name}**`)
                        .addFields(
                            { name: '🎁 Prize', value: giveaway.description, inline: false }
                        )
                        .setFooter({ text: 'SEED Giveaway System' })
                        .setTimestamp();

                    await user.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.error(`Failed to DM winner ${winner.username}:`, error);
                }
            }

            return { success: true, winners: winners };
        } catch (error) {
            console.error('Error rerolling giveaway:', error);
            return { success: false, message: 'An error occurred while rerolling.' };
        }
    }
}

module.exports = GiveawayService;

