const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

class TicketService {
    constructor(bot) {
        this.bot = bot;
        this.database = bot.database;
        this.client = bot.client;
        this.transcriptService = null; // Will be set after TranscriptService is initialized
    }

    setTranscriptService(transcriptService) {
        this.transcriptService = transcriptService;
    }

    /**
     * Get next ticket number for guild
     */
    async getNextTicketNumber(guildId) {
        const [result] = await this.database.pool.execute(
            'SELECT MAX(ticket_number) as max_num FROM tickets WHERE guild_id = ?',
            [guildId]
        );
        return (result[0].max_num || 0) + 1;
    }

    /**
     * Create ticket panel
     */
    async createTicketPanel(guildId, channelId, adminRoleId, modRoleId, heading, description) {
        try {
            const channel = await this.client.channels.fetch(channelId);

            // Create embed
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle(heading)
                .setDescription(description)
                .setFooter({ text: 'Click a button below to create a ticket' })
                .setTimestamp();

            // Create buttons
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_seedys_support')
                        .setLabel("Seedy's Support Ticket")
                        .setEmoji('🌱')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('ticket_rule_breaking')
                        .setLabel('Rule-breaking Ticket')
                        .setEmoji('⚠️')
                        .setStyle(ButtonStyle.Danger)
                );

            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_shop_errors')
                        .setLabel('Real Money Seed Shop Errors')
                        .setEmoji('💰')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('ticket_ingame_shop')
                        .setLabel('Ingame Shop Errors')
                        .setEmoji('🛒')
                        .setStyle(ButtonStyle.Primary)
                );

            const row3 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_dispute')
                        .setLabel('Dispute resolution Ticket')
                        .setEmoji('⚖️')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Send message
            const message = await channel.send({
                embeds: [embed],
                components: [row1, row2, row3]
            });

            // Save panel to database
            const [result] = await this.database.pool.execute(
                `INSERT INTO ticket_panels (guild_id, channel_id, message_id, admin_role_id, mod_role_id, heading, description) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [guildId, channelId, message.id, adminRoleId, modRoleId, heading, description]
            );

            return {
                id: result.insertId,
                message_id: message.id
            };

        } catch (error) {
            console.error('Error creating ticket panel:', error);
            throw error;
        }
    }

    /**
     * Get panel by guild
     */
    async getPanel(guildId) {
        const [panels] = await this.database.pool.execute(
            'SELECT * FROM ticket_panels WHERE guild_id = ? LIMIT 1',
            [guildId]
        );
        return panels[0] || null;
    }

    /**
     * Create ticket channel
     */
    async createTicketChannel(guild, user, ticketType, inGameName, helpDescription, adminRoleId) {
        try {
            const panel = await this.getPanel(guild.id);
            if (!panel) {
                throw new Error('Ticket panel not found');
            }

            const ticketNumber = await this.getNextTicketNumber(guild.id);
            const channelName = `🟩ticket-${ticketNumber}-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

            // Get or create category
            let category = panel.category_id ? await guild.channels.fetch(panel.category_id).catch(() => null) : null;
            
            if (!category) {
                category = await guild.channels.create({
                    name: '🎫 TICKETS',
                    type: ChannelType.GuildCategory
                });

                // Update panel with category ID
                await this.database.pool.execute(
                    'UPDATE ticket_panels SET category_id = ? WHERE id = ?',
                    [category.id, panel.id]
                );
            }

            // Build permission overwrites
            const permissionOverwrites = [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                },
                {
                    id: adminRoleId,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.ManageMessages
                    ]
                },
                {
                    id: this.client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageChannels
                    ]
                }
            ];

            // Add moderator role permissions if provided
            if (panel.mod_role_id) {
                permissionOverwrites.push({
                    id: panel.mod_role_id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                });
            }

            // Create ticket channel
            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: permissionOverwrites
            });

            // Save ticket to database
            const [result] = await this.database.pool.execute(
                `INSERT INTO tickets (ticket_number, guild_id, channel_id, user_id, username, ticket_type, in_game_name, description, admin_role_id, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
                [ticketNumber, guild.id, channel.id, user.id, user.username, ticketType, inGameName, helpDescription, adminRoleId]
            );

            const ticketId = result.insertId;

            // Create ticket embed
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle(`🎫 Ticket #${ticketNumber}`)
                .setDescription(`Welcome ${user}! Support will be with you shortly.`)
                .addFields(
                    { name: '📝 Ticket Type', value: ticketType, inline: true },
                    { name: '🎮 In-Game Name', value: inGameName || 'Not provided', inline: true },
                    { name: '❓ How can we help?', value: helpDescription || 'Not provided', inline: false }
                )
                .setFooter({ text: 'Use the button below to close this ticket' })
                .setTimestamp();

            // Create close button
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ticket_close_${ticketId}`)
                        .setLabel('Close Ticket')
                        .setEmoji('🔒')
                        .setStyle(ButtonStyle.Danger)
                );

            // Build ping content - ping user, admin role, and mod role if exists
            let pingContent = `${user} <@&${adminRoleId}>`;
            if (panel.mod_role_id) {
                pingContent += ` <@&${panel.mod_role_id}>`;
            }

            // Send ticket message
            await channel.send({
                content: pingContent,
                embeds: [embed],
                components: [row]
            });

            return {
                ticketId,
                ticketNumber,
                channel
            };

        } catch (error) {
            console.error('Error creating ticket channel:', error);
            throw error;
        }
    }

    /**
     * Close ticket
     */
    async closeTicket(ticketId, closedBy) {
        try {
            // Get ticket info
            const [tickets] = await this.database.pool.execute(
                'SELECT * FROM tickets WHERE id = ?',
                [ticketId]
            );

            if (tickets.length === 0) {
                throw new Error('Ticket not found');
            }

            const ticket = tickets[0];

            // Get channel
            const channel = await this.client.channels.fetch(ticket.channel_id).catch(() => null);
            if (!channel) {
                console.log('Channel already deleted');
                return;
            }

            // Rename channel to show it's closed
            const closedName = channel.name.replace('🟩', '🏁');
            await channel.setName(closedName);

            // Send closing message
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('🔒 Ticket Closing')
                .setDescription('This ticket will be closed and deleted in 1 minute.')
                .setFooter({ text: 'Transcript will be saved' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            // Update ticket status
            await this.database.pool.execute(
                'UPDATE tickets SET status = ?, closed_at = NOW(), closed_by = ? WHERE id = ?',
                ['closed', closedBy, ticketId]
            );

            // Wait 1 minute then delete
            setTimeout(async () => {
                try {
                    // Create transcript
                    if (this.transcriptService) {
                        const transcript = await this.transcriptService.createTranscript(ticketId);
                        console.log(`✅ Transcript created: ${transcript.filename}`);

                        // Send transcript to transcript channel
                        await this.sendTranscript(ticket.guild_id, ticket, transcript);
                    }

                    // Delete channel
                    await channel.delete();
                    console.log(`✅ Ticket channel deleted: ${channel.name}`);

                } catch (error) {
                    console.error('Error in delayed ticket deletion:', error);
                }
            }, 60000); // 1 minute

        } catch (error) {
            console.error('Error closing ticket:', error);
            throw error;
        }
    }

    /**
     * Send transcript to transcript channel
     */
    async sendTranscript(guildId, ticket, transcript) {
        try {
            // Get transcript channel from settings
            const [settings] = await this.database.pool.execute(
                'SELECT * FROM channel_settings WHERE guild_id = ? AND channel_type = ?',
                [guildId, 'ticket_transcripts']
            );

            if (settings.length === 0) {
                console.log('No transcript channel configured');
                return;
            }

            const channel = await this.client.channels.fetch(settings[0].channel_id).catch(() => null);
            if (!channel) {
                console.log('Transcript channel not found');
                return;
            }

            // Get all messages for the transcript
            const [messages] = await this.database.pool.execute(
                'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY sent_at ASC',
                [ticket.id]
            );

            // Create header embed
            const headerEmbed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle(`📜 ${ticket.username} - Ticket #${ticket.ticket_number}`)
                .setDescription('**TICKET BACKUP COPY**')
                .addFields(
                    { name: '👤 Ticket Owner', value: `<@${ticket.user_id}>`, inline: true },
                    { name: '🎫 Ticket Number', value: `#${ticket.ticket_number}`, inline: true },
                    { name: '📝 Ticket Type', value: ticket.ticket_type, inline: false },
                    { name: '🎮 In-Game Name', value: ticket.in_game_name || 'Not provided', inline: true },
                    { name: '💬 Messages', value: `${messages.length}`, inline: true },
                    { name: '👥 Participants', value: `${transcript.users.size}`, inline: true }
                )
                .setFooter({ text: 'SEED Ticket System' })
                .setTimestamp(new Date(ticket.closed_at || Date.now()));

            // Add users list
            const usersList = Array.from(transcript.users.entries())
                .map(([userId, data]) => `${data.count} - <@${userId}>`)
                .join('\n');

            headerEmbed.addFields({
                name: '📊 Users in transcript',
                value: usersList.substring(0, 1024) || 'No users',
                inline: false
            });

            // Send header
            await channel.send({ embeds: [headerEmbed] });

            // Format and send messages in code blocks
            if (messages.length === 0) {
                await channel.send('```\n⚠️ No messages in this ticket.\n```');
            } else {
                // Split messages into chunks (Discord 2000 char limit)
                let currentChunk = '```ansi\n';
                let chunkCount = 0;
                
                for (let i = 0; i < messages.length; i++) {
                    const msg = messages[i];
                    const timestamp = new Date(msg.sent_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    // Format with ANSI colors: green for timestamps/names
                    const line = `\u001b[32m[${timestamp}] ${msg.username}:\u001b[0m ${msg.content}\n`;
                    
                    // Check if adding this line would exceed limit
                    if ((currentChunk + line + '```').length > 1900) {
                        // Send current chunk
                        currentChunk += '```';
                        await channel.send(currentChunk);
                        chunkCount++;
                        
                        // Start new chunk
                        currentChunk = '```ansi\n' + line;
                        
                        // Small delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } else {
                        currentChunk += line;
                    }
                }
                
                // Send remaining chunk
                if (currentChunk !== '```ansi\n') {
                    currentChunk += '```';
                    await channel.send(currentChunk);
                }
            }

            // Send footer with transcript link
            const footerEmbed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setDescription('**✅ END OF TRANSCRIPT**')
                .setFooter({ text: `Ticket: closed-${ticket.ticket_number}-${ticket.username}` });
            
            // Add button if transcript URL is available
            if (transcript.url && transcript.url.startsWith('http')) {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('📄 View Full HTML Transcript')
                            .setStyle(ButtonStyle.Link)
                            .setURL(transcript.url)
                    );
                
                await channel.send({ embeds: [footerEmbed], components: [row] });
            } else {
                footerEmbed.addFields({
                    name: '📁 Transcript File',
                    value: `\`${transcript.filename}\`\nStored locally in \`Seedy/transcripts/\``,
                    inline: false
                });
                
                await channel.send({ embeds: [footerEmbed] });
            }

            console.log('✅ Transcript sent to channel');

        } catch (error) {
            console.error('Error sending transcript:', error);
        }
    }

    /**
     * Set channel setting
     */
    async setChannelSetting(guildId, channelType, channelId) {
        await this.database.pool.execute(
            `INSERT INTO channel_settings (guild_id, channel_type, channel_id) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE channel_id = ?, updated_at = NOW()`,
            [guildId, channelType, channelId, channelId]
        );
    }

    /**
     * Get channel setting
     */
    async getChannelSetting(guildId, channelType) {
        const [settings] = await this.database.pool.execute(
            'SELECT * FROM channel_settings WHERE guild_id = ? AND channel_type = ?',
            [guildId, channelType]
        );
        return settings[0] || null;
    }
}

module.exports = TicketService;

