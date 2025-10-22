const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import custom modules
const EconomyService = require('./services/EconomyService');
const GameManager = require('./services/GameManager');
const SurveyManager = require('./services/SurveyManager');
const DatabaseService = require('./services/DatabaseService');
const ServerService = require('./services/ServerService');
const RCONService = require('./services/RCONService');
const RCEManagerService = require('./services/RCEManagerService');
const SpinService = require('./services/SpinService');
const DiscordNotificationService = require('./services/DiscordNotificationService');
const GiveawayService = require('./services/GiveawayService');
const TicketService = require('./services/TicketService');
const TranscriptService = require('./services/TranscriptService');

class SeedyBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessageReactions
            ]
        });

        this.commands = new Collection();
        this.cooldowns = new Collection();
        
        // Game cleanup interval (clean up expired games every 5 minutes)
        setInterval(() => {
            this.cleanupExpiredGames();
        }, 5 * 60 * 1000);
        
        // Initialize services
        this.database = new DatabaseService();
        this.economy = new EconomyService(this.database);
        this.gameManager = new GameManager(this.economy);
        this.surveyManager = new SurveyManager(this.database);
        this.serverService = null; // Will be initialized after database is ready
        this.rconService = new RCONService();
        this.rceManager = null; // Will be initialized after database is ready
        this.spinService = null; // Will be initialized after database is ready
        this.discordNotifications = null; // Will be initialized after client is ready
        this.giveawayService = null; // Will be initialized after client is ready
        this.ticketService = null; // Will be initialized after client is ready
        this.transcriptService = null; // Will be initialized after client is ready
        // AI Service removed

        // Channel IDs
        this.zorpChannelId = '1387306698192064554';
        this.supportChannelId = '1360485036973097224';
        
        // Allowed server ID
        this.allowedServerId = '1359052156996681881';

        // Channel monitoring system
        this.channelKeywords = {
            'announcement': {
                keywords: ['announcement', 'announcements', 'news', 'update', 'updates'],
                channelId: '1360935343553122375',
                title: '📢 Announcements',
                description: 'Check out the latest announcements and news!'
            },
            'votes': {
                keywords: ['vote', 'votes', 'voting', 'poll', 'polls', 'election'],
                channelId: '1362029892052582520',
                title: '🗳️ Voting',
                description: 'Participate in server votes and polls!'
            },
            'information': {
                keywords: ['information', 'info', 'informations', 'details', 'help', 'support'],
                channelId: '1395761174368223393',
                title: 'ℹ️ Information',
                description: 'Find important server information here!'
            },
            'advertising': {
                keywords: ['advertising', 'advertise', 'promote', 'promotion', 'server ad', 'server advertising'],
                channelId: '1370145190387384390',
                title: '📢 Server Advertising',
                description: 'Advertise your server here!'
            },
            'alliance': {
                keywords: ['alliance', 'alliances', 'register', 'registration', 'partner', 'partnership'],
                channelId: '1396771029518389269',
                title: '🤝 Alliance Registration',
                description: 'Register for server alliances!'
            },
            'giveaway': {
                keywords: ['giveaway', 'giveaways', 'prize', 'prizes', 'contest', 'win'],
                channelId: '1390350799003189322',
                title: '🎁 Giveaways',
                description: 'Check out active giveaways and contests!'
            },
            'battlepass': {
                keywords: ['battlepass', 'battle pass', 'pass', 'season', 'rewards'],
                channelId: '1390208214343090277',
                title: '🎮 Battlepass',
                description: 'View the current battlepass and rewards!'
            },
            'ticket': {
                keywords: ['ticket', 'tickets', 'support', 'help', 'issue', 'problem'],
                channelId: '1360485036973097224',
                title: '🎫 Support Tickets',
                description: 'Create a support ticket for help!'
            },
            'seedtag': {
                keywords: ['seed tag', 'seedtag', 'club', 'membership', 'premium'],
                channelId: '1414866149845504101',
                title: '🌱 SEED TAG Club',
                description: 'Join the exclusive SEED TAG Club!'
            },
            'mainchat': {
                keywords: ['main chat', 'general', 'chat', 'talk', 'discuss'],
                channelId: '1359716367997341716',
                title: '💬 Main Chat',
                description: 'Join the main server chat!'
            },
            'worldwide': {
                keywords: ['worldwide', 'global', 'international', 'world chat'],
                channelId: '1359716323898167626',
                title: '🌍 World Wide Chat',
                description: 'Chat with people from around the world!'
            },
            'botcommands': {
                keywords: ['bot commands', 'bot command', 'commands', 'bot', 'seedy'],
                channelId: '1359716430412517457',
                title: '🤖 Bot Commands',
                description: 'Use bot commands here!'
            },
            'clips': {
                keywords: ['clips', 'clip', 'video', 'videos', 'recording', 'recordings'],
                channelId: '1406902542419492874',
                title: '🎬 Your Clips',
                description: 'Share your awesome clips and videos!'
            },
            'verified': {
                keywords: ['verified', 'verification', 'link', 'linked', 'connect'],
                channelId: '1412748207825490021',
                title: '✅ Verified & Linked',
                description: 'Get verified and link your accounts!'
            },
            'zorp': {
                keywords: ['zorp', 'zorps', 'rider', 'rider infos', 'zorp info'],
                channelId: '1387306698192064554',
                title: '🌱 ZORP & Rider Infos',
                description: 'Find all ZORP and Rider information here!'
            },
            'roles': {
                keywords: ['roles', 'role', 'choose role', 'select role', 'permissions'],
                channelId: '1359714343112937508',
                title: '🎭 Choose Your Roles',
                description: 'Select your server roles and permissions!'
            },
            'rules': {
                keywords: ['rules', 'rule', 'guidelines', 'policy', 'policies'],
                channelId: '1359714261487845609',
                title: '📋 Rules',
                description: 'Read the server rules and guidelines!'
            },
            'kits': {
                keywords: ['kit', 'kits', 'free kit', 'elite kit', 'kit list', 'items', 'gear'],
                channelId: '1424328508381073468',
                title: '🧥 Total SEED Kits Overview 🪖',
                description: 'Check out all available kits and items!'
            },
            'guides': {
                keywords: ['guide', 'guides', 'tutorial', 'tutorials', 'how to', 'help'],
                channelId: '1387311000776347701',
                title: '📚 Guides',
                description: 'Find helpful guides and tutorials!'
            }
        };

        this.setupEventHandlers();
        this.loadCommands();
    }

    setupEventHandlers() {
        // Bot ready event
        this.client.once(Events.ClientReady, async (readyClient) => {
            console.log('🔥 ClientReady event triggered!');
            console.log(`🌱 Seedy is ready! Logged in as ${readyClient.user.tag}`);
            this.client.user.setActivity('with seeds and helping users!', { type: 'PLAYING' });
            
            console.log('🔧 Starting ClientReady event handler...');
            
            // Initialize database
            console.log('📊 Initializing database...');
            await this.database.initialize();
            console.log('✅ Database initialized');
            
            // Initialize ServerService after database is ready
            console.log('🖥️ Initializing ServerService...');
            this.serverService = new ServerService(this.database);
            console.log('✅ ServerService initialized');
            
            // Initialize RCEManagerService after database is ready
            console.log('🔌 Initializing RCEManagerService...');
            this.rceManager = new RCEManagerService(this.database);
            console.log('✅ RCEManagerService initialized');
            
            // Initialize SpinService after database is ready
            console.log('🎰 Initializing SpinService...');
            this.spinService = new SpinService(this.database, this.rceManager);
            console.log('✅ SpinService initialized');
            
            // Initialize Discord notification service
            console.log('📢 Initializing Discord notification service...');
            this.discordNotifications = new DiscordNotificationService(this.client);
            console.log('✅ Discord notification service initialized');
            
            // Initialize Giveaway service
            console.log('🎉 Initializing Giveaway service...');
            this.giveawayService = new GiveawayService(this);
            await this.giveawayService.loadActiveGiveaways();
            console.log('✅ Giveaway service initialized');
            
            // Initialize Ticket services
            console.log('🎫 Initializing Ticket services...');
            this.ticketService = new TicketService(this);
            this.transcriptService = new TranscriptService(this);
            this.ticketService.setTranscriptService(this.transcriptService);
            console.log('✅ Ticket services initialized');
            
            // Start RCON polling for player counts
            console.log('🔄 About to start RCON polling...');
            await this.startRCONPolling();
            console.log('✅ RCON polling call completed');
            
            // Create SeedyAdmin role in all guilds
            console.log('👑 Creating SeedyAdmin roles...');
            await this.createSeedyAdminRole();
            console.log('✅ SeedyAdmin roles created');
            
            console.log('🎉 ClientReady event handler completed');
        });

        // Message handling
        this.client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) return;
            
            // Check if message is from the allowed server
            if (message.guild && message.guild.id !== this.allowedServerId) {
                return; // Ignore messages from unauthorized servers
            }

            // Log ticket messages for transcripts
            if (this.transcriptService) {
                try {
                    const [tickets] = await this.database.pool.execute(
                        'SELECT * FROM tickets WHERE channel_id = ? AND status = ?',
                        [message.channel.id, 'open']
                    );
                    
                    if (tickets.length > 0) {
                        await this.transcriptService.saveMessage(
                            tickets[0].id,
                            message.author.id,
                            message.author.username,
                            message.content
                        );
                    }
                } catch (error) {
                    console.error('Error logging ticket message:', error);
                }
            }

            // Handle channel keyword monitoring
            await this.handleChannelMonitoring(message);

            // Handle bot mentions (AI removed)
            if (message.mentions.has(this.client.user)) {
                await this.handleMention(message);
            }

            // Handle commands
            if (message.content.startsWith(process.env.BOT_PREFIX || '!')) {
                await this.handleCommand(message);
            }
        });

        // Guild join event
        this.client.on(Events.GuildCreate, async (guild) => {
            console.log(`🌱 Seedy joined new server: ${guild.name} (${guild.id})`);
            
            // Check if this is the allowed server
            if (guild.id !== this.allowedServerId) {
                console.log(`❌ Unauthorized server detected. Leaving ${guild.name} (${guild.id})`);
                
                // Send a message to the server owner before leaving
                try {
                    const owner = await guild.fetchOwner();
                    await owner.send({
                        content: `❌ **Seedy Bot Access Denied**\n\nThis bot is restricted to a specific server and cannot be used on other servers.\n\nIf you believe this is an error, please contact the bot owner.`
                    });
                } catch (error) {
                    console.log('Could not send DM to server owner:', error.message);
                }
                
                // Leave the server
                await guild.leave();
                return;
            }
            
            // Create SeedyAdmin role for the allowed server
            await this.createSeedyAdminRole(guild);
        });

        // Interaction handling for surveys and buttons
        this.client.on(Events.InteractionCreate, async (interaction) => {
            // Check if interaction is from the allowed server
            if (interaction.guild && interaction.guild.id !== this.allowedServerId) {
                return interaction.reply({
                    content: '❌ This bot is restricted to a specific server.',
                    ephemeral: true
                });
            }
            
            if (interaction.isChatInputCommand()) {
                await this.handleSlashCommand(interaction);
            } else if (interaction.isButton()) {
                // Check if it's a game button, survey button, giveaway button, or ticket button
                if (interaction.customId.startsWith('ttt_') || interaction.customId.startsWith('c4_') || 
                    interaction.customId.startsWith('bs_') || interaction.customId.startsWith('rummy_') ||
                    interaction.customId.startsWith('poker_') || interaction.customId.startsWith('uno_')) {
                    await this.handleGameButton(interaction);
                } else if (interaction.customId.startsWith('giveaway_enter_')) {
                    await this.handleGiveawayEntry(interaction);
                } else if (interaction.customId.startsWith('ticket_')) {
                    await this.handleTicketButton(interaction);
                } else {
                    await this.surveyManager.handleButton(interaction);
                }
            } else if (interaction.isModalSubmit()) {
                if (interaction.customId === 'giveaway_create_modal') {
                    await this.handleGiveawayCreateModal(interaction);
                } else if (interaction.customId.startsWith('ticket_modal_')) {
                    await this.handleTicketModal(interaction);
                } else if (interaction.customId.startsWith('daily_claim_modal_')) {
                    await this.handleDailyClaimModal(interaction);
                } else if (interaction.customId.startsWith('edit_spin_item_modal_')) {
                    await this.handleEditSpinItemModal(interaction);
                } else {
                    await this.surveyManager.handleModal(interaction, this);
                }
            } else if (interaction.isStringSelectMenu()) {
                await this.handleServerSelectMenu(interaction);
            } else if (interaction.isAutocomplete()) {
                await this.handleAutocomplete(interaction);
            }
        });
    }

    async handleChannelMonitoring(message) {
        // Ignore keyword monitoring in specific channels (but still allow commands)
        const ignoredChannels = ['1418704572905554040'];
        if (ignoredChannels.includes(message.channel.id)) {
            return;
        }
        
        const content = message.content.toLowerCase();
        
        // Check for channel keywords
        for (const [category, config] of Object.entries(this.channelKeywords)) {
            if (config.keywords.some(keyword => content.includes(keyword.toLowerCase()))) {
                const embed = new EmbedBuilder()
                    .setTitle(config.title)
                    .setDescription(`Hello ${message.author}, ${config.description}`)
                    .setColor(0x006400) // Dark green
                    .setTimestamp();

                // Add main channel
                embed.addFields({
                    name: '📍 Main Channel',
                    value: `<#${config.channelId}>`,
                    inline: false
                });

                // Add additional channels if they exist (like for kits)
                if (config.additionalChannels) {
                    let additionalChannels = '';
                    config.additionalChannels.forEach(channel => {
                        additionalChannels += `• **${channel.name}**: <#${channel.id}>\n`;
                    });
                    
                    embed.addFields({
                        name: '📂 Additional Channels',
                        value: additionalChannels,
                        inline: false
                    });
                }

                // Special handling for specific categories (include images)
                if (category === 'zorp') {
                    embed.setImage('https://i.imgur.com/O8xh49D.png');
                } else if (category === 'kits') {
                    embed.setImage('https://i.imgur.com/l30wM88.jpeg');
                } else if (category === 'seedtag') {
                    embed.setImage('https://i.imgur.com/mcLzmW2.png');
                } else {
                    // Default image for all other responses
                    embed.setImage('https://i.imgur.com/ieP1fd5.jpeg');
                }

                await message.reply({ embeds: [embed] });
                return; // Only respond to the first match
            }
        }
    }

    async handleMention(message) {
        try {
            // Extract the question from the message (remove the mention)
            const content = message.content.replace(/<@!?\d+>/g, '').trim();
            
            if (!content) {
                return; // No question asked, just a mention
            }

            // Simple responses without AI
            const responses = [
                "🌱 Hello there! I'm Seedy, your friendly Discord bot! How can I help you today?",
                "🎮 Hey! Want to play a game or need help with something? I'm here for you!",
                "🌱 Hi! I can help with games, ZORP questions, or just chat! What's up?",
                "🎯 Hello! I'm Seedy and I'm here to make your Discord experience awesome!",
                "🌱 Hey there! Need help with anything? I'm your friendly neighborhood bot!",
                "🎮 Hi! I love helping out! What can I do for you today?"
            ];

            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            
            const embed = new EmbedBuilder()
                .setTitle('🌱 Seedy Response')
                .setDescription(randomResponse)
                .setColor(0x00ff00)
                .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
                .setFooter({ 
                    text: 'Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Mention handling error:', error);
            // Don't send error message to avoid spam, just log it
        }
    }

    async handleCommand(message) {
        const args = message.content.slice((process.env.BOT_PREFIX || '!').length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = this.commands.get(commandName) || 
                       this.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) return;

        // Check permissions for non-economy commands
        if (!this.isEconomyCommand(commandName) && !this.hasSeedyAdminRole(message.member)) {
            return message.reply('❌ You need the **SeedyAdmin** role to use this command!');
        }

        // Cooldown check
        if (this.cooldowns.has(command.name)) {
            const cooldown = this.cooldowns.get(command.name);
            if (Date.now() < cooldown) {
                const timeLeft = (cooldown - Date.now()) / 1000;
                return message.reply(`⏰ Please wait ${timeLeft.toFixed(1)} seconds before using this command again.`);
            }
        }

        try {
            await command.execute(message, args, this);
            
            // Set cooldown
            this.cooldowns.set(command.name, Date.now() + (command.cooldown || 3000));
        } catch (error) {
            console.error(`Error executing command ${commandName}:`, error);
            await message.reply('There was an error executing that command!');
        }
    }

    loadCommands() {
        const commandsPath = path.join(__dirname, 'commands');
        if (!fs.existsSync(commandsPath)) {
            fs.mkdirSync(commandsPath, { recursive: true });
            return;
        }

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                this.commands.set(command.data.name, command);
                console.log(`✅ Loaded command: ${command.data.name}`);
            } else {
                console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
            }
        }
    }

    async createSeedyAdminRole(guild = null) {
        const guilds = guild ? [guild] : this.client.guilds.cache.values();
        
        for (const guild of guilds) {
            try {
                // Check if role already exists
                const existingRole = guild.roles.cache.find(role => role.name === 'SeedyAdmin');
                if (existingRole) {
                    console.log(`✅ SeedyAdmin role already exists in ${guild.name}`);
                    continue;
                }

                // Create the role
                const role = await guild.roles.create({
                    name: 'SeedyAdmin',
                    color: 0x00ff00, // Green color
                    reason: 'Seedy bot admin role for command permissions'
                });

                console.log(`✅ Created SeedyAdmin role in ${guild.name}`);
            } catch (error) {
                console.error(`❌ Failed to create SeedyAdmin role in ${guild.name}:`, error);
            }
        }
    }

    async startRCONPolling() {
        try {
            console.log('🔄 Starting RCON polling for player counts...');
            
            // Get all servers with RCON configuration
            console.log('🔍 Querying database for servers with RCON configuration...');
            const servers = await this.database.all(`
                SELECT id, name, rcon_ip, rcon_port, rcon_password 
                FROM servers 
                WHERE rcon_ip IS NOT NULL 
                AND rcon_port IS NOT NULL 
                AND rcon_password IS NOT NULL
            `);

            console.log('📋 Database query result:', servers);

            if (servers.length === 0) {
                console.log('⚠️ No servers with RCON configuration found');
                return;
            }

            console.log(`📊 Found ${servers.length} servers with RCON configuration`);
            console.log('🔧 Server details:', servers.map(s => ({
                id: s.id,
                name: s.name,
                rcon_ip: s.rcon_ip,
                rcon_port: s.rcon_port,
                has_password: !!s.rcon_password
            })));

            // Start polling with database update callback
            console.log('🚀 Calling rconService.startPolling...');
            await this.rconService.startPolling(servers, async (serverId, data) => {
                try {
                    console.log(`💾 Updating database for server ${serverId} with data:`, data);
                    await this.database.run(`
                        UPDATE servers 
                        SET current_players = ?, max_players = ?, status = ?, updated_at = ?
                        WHERE id = ?
                    `, [
                        data.current_players || 0, 
                        data.max_players || 0, 
                        data.status || 'Offline', 
                        data.updated_at || new Date().toISOString(), 
                        serverId
                    ]);
                    
                    console.log(`✅ Updated server ${serverId} player count: ${data.current_players}/${data.max_players}`);
                } catch (error) {
                    console.error(`❌ Error updating server ${serverId}:`, error);
                }
            });

            console.log('✅ RCON polling started successfully');
        } catch (error) {
            console.error('❌ Failed to start RCON polling:', error);
            console.error('❌ Error details:', error.stack);
        }
    }

    isEconomyCommand(commandName) {
        const economyCommands = ['balance', 'daily', 'leaderboard', 'hangman', 'tictactoe', 'connect4', 'battleship', 'rummy', 'poker', 'uno'];
        return economyCommands.includes(commandName);
    }

    hasSeedyAdminRole(member) {
        if (!member) return false;
        return member.roles.cache.some(role => role.name === 'SeedyAdmin');
    }

    async handleSlashCommand(interaction) {
        const command = this.commands.get(interaction.commandName);

        if (!command) {
            return interaction.reply({
                content: '❌ Command not found!',
                ephemeral: true
            });
        }

        // Check permissions for non-economy commands
        if (!this.isEconomyCommand(interaction.commandName) && !this.hasSeedyAdminRole(interaction.member)) {
            return interaction.reply({
                content: '❌ You need the **SeedyAdmin** role to use this command!',
                ephemeral: true
            });
        }

        try {
            await command.execute(interaction, this);
        } catch (error) {
            console.error(`Error executing slash command ${interaction.commandName}:`, error);
            await interaction.reply({
                content: 'There was an error executing that command!',
                ephemeral: true
            });
        }
    }

    async handleServerSelectMenu(interaction) {
        try {
            // Check if ServerService is initialized
            if (!this.serverService) {
                return interaction.reply({
                    content: '❌ ServerService is not initialized yet. Please try again in a moment.',
                    ephemeral: true
                });
            }

            const customId = interaction.customId;
            const selectedServer = interaction.values[0];

            if (customId === 'server_info_select') {
                // Handle server info selection from send-server-msg
                const serverData = this.serverService.getServer(selectedServer);
                
                if (!serverData) {
                    return interaction.reply({
                        content: '❌ Server not found!',
                        ephemeral: true
                    });
                }

                const embed = this.serverService.createServerEmbed(serverData, 0x00ff00);
                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (customId === 'delete_server_select') {
                // Handle server deletion
                const serverData = this.serverService.getServer(selectedServer);
                
                if (!serverData) {
                    return interaction.reply({
                        content: '❌ Server not found!',
                        ephemeral: true
                    });
                }

                await this.serverService.deleteServer(selectedServer);

                const embed = new EmbedBuilder()
                    .setTitle('✅ Server Deleted Successfully!')
                    .setDescription(`**${selectedServer}** has been removed from the server database.`)
                    .setColor(0x00ff00)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Server Management • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (customId === 'disconnect_server_select') {
                // Handle server connection deletion
                if (!this.rceManager) {
                    return interaction.reply({
                        content: '❌ RCE Manager service is not available.',
                        ephemeral: true
                    });
                }

                const connectionData = await this.rceManager.getServerConnection(selectedServer);
                
                if (!connectionData) {
                    return interaction.reply({
                        content: '❌ Server connection not found!',
                        ephemeral: true
                    });
                }

                await this.rceManager.removeServerConnection(selectedServer);

                const embed = new EmbedBuilder()
                    .setTitle('✅ Server Connection Removed Successfully!')
                    .setDescription(`**${selectedServer}** has been removed from the server connections database.`)
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '**NICKNAME**',
                            value: connectionData.nickname,
                            inline: false
                        },
                        {
                            name: '**SERVER IP**',
                            value: connectionData.server_ip,
                            inline: false
                        },
                        {
                            name: '**RCON PORT**',
                            value: connectionData.rcon_port.toString(),
                            inline: false
                        }
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Server Connection Management • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (customId === 'edit_spin_item_server_select') {
                // Handle edit spin item server selection
                if (!this.spinService) {
                    return interaction.reply({
                        content: '❌ Spin service is not available.',
                        ephemeral: true
                    });
                }

                const items = await this.spinService.getSpinItems(selectedServer);
                
                if (items.length === 0) {
                    return interaction.reply({
                        content: `❌ No spin items found for server "${selectedServer}".`,
                        ephemeral: true
                    });
                }

                // Create item selection dropdown
                const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
                const itemSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId('edit_spin_item_select')
                    .setPlaceholder('Select an item to edit...')
                    .setMinValues(1)
                    .setMaxValues(1);

                items.forEach(item => {
                    itemSelectMenu.addOptions({
                        label: item.display_name,
                        description: `${item.short_name} x${item.quantity}`,
                        value: item.id.toString()
                    });
                });

                const row = new ActionRowBuilder().addComponents(itemSelectMenu);

                const embed = new EmbedBuilder()
                    .setTitle('✏️ Edit Spin Item')
                    .setDescription(`Select an item from **${selectedServer}** to edit.`)
                    .setColor(0x4ecdc4)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Spin Item Management • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                await interaction.reply({ 
                    embeds: [embed], 
                    components: [row],
                    ephemeral: true 
                });

            } else if (customId === 'remove_spin_item_select') {
                // Handle remove spin item selection
                if (!this.spinService) {
                    return interaction.reply({
                        content: '❌ Spin service is not available.',
                        ephemeral: true
                    });
                }

                const itemId = parseInt(selectedServer);
                await this.spinService.removeSpinItem(itemId);

                const embed = new EmbedBuilder()
                    .setTitle('✅ Spin Item Removed!')
                    .setDescription('The spin item has been removed successfully.')
                    .setColor(0x00ff00)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Spin Item Management • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (customId === 'daily_spin_server_select') {
                // Handle daily spin server selection
                await this.handleDailySpinServerSelection(interaction, selectedServer);

            } else if (customId === 'daily_claim_server_select') {
                // Handle daily claim server selection
                await this.handleDailyClaimServerSelection(interaction, selectedServer);

            } else if (customId.startsWith('add_spin_item_server_select_')) {
                // Handle add spin item server selection
                const parts = customId.split('_');
                const displayName = parts[4];
                const shortName = parts[5];
                const quantity = parseInt(parts[6]);
                await this.handleAddSpinItemServerSelection(interaction, selectedServer, displayName, shortName, quantity);

            } else if (customId === 'remove_spin_item_server_select') {
                // Handle remove spin item server selection
                await this.handleRemoveSpinItemServerSelection(interaction, selectedServer);

            } else if (customId.startsWith('clear_cooldown_server_select_')) {
                // Handle clear cooldown server selection
                const userId = customId.split('_')[4];
                await this.handleClearCooldownServerSelection(interaction, selectedServer, userId);

            } else if (customId.startsWith('edit_server_select_')) {
                // Handle server editing
                const updatesString = customId.replace('edit_server_select_', '');
                const updates = JSON.parse(updatesString);
                
                const serverData = this.serverService.getServer(selectedServer);
                
                if (!serverData) {
                    return interaction.reply({
                        content: '❌ Server not found!',
                        ephemeral: true
                    });
                }

                const updatedServer = await this.serverService.editServer(selectedServer, updates);

                const embed = new EmbedBuilder()
                    .setTitle('✅ Server Updated Successfully!')
                    .setDescription(`**${updatedServer.server_name}** has been updated in the server database.`)
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '**SERVER ID**',
                            value: updatedServer.server_id,
                            inline: false
                        },
                        {
                            name: '**SERVER TYPE**',
                            value: updatedServer.server_type,
                            inline: false
                        },
                        {
                            name: '**GAME TYPE**',
                            value: updatedServer.game_type,
                            inline: false
                        },
                        {
                            name: '**TEAM SIZE**',
                            value: updatedServer.team_size,
                            inline: false
                        },
                        {
                            name: '**LAST WIPE**',
                            value: updatedServer.last_wipe,
                            inline: false
                        },
                        {
                            name: '**NEXT WIPE**',
                            value: updatedServer.next_wipe,
                            inline: false
                        },
                        {
                            name: '**BP WIPE**',
                            value: updatedServer.bp_wipe,
                            inline: false
                        }
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Server Management • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Error handling server select menu:', error);
            await interaction.reply({
                content: '❌ There was an error processing your selection!',
                ephemeral: true
            });
        }
    }

    async handleGameButton(interaction) {
        try {
            // Try multiple ways to find the game
            let gameState = null;
            let gameId = null;

            // Method 1: Try to find game by custom ID pattern
            const customId = interaction.customId;
            if (customId.startsWith('ttt_')) {
                // For TicTacToe, look for the game with the interaction ID
                const interactionId = customId.split('_')[1];
                gameId = `ttt_${interactionId}`;
                gameState = this.gameManager.activeGames.get(gameId);
            } else {
                // For other games, try message ID
                gameId = interaction.message.id;
                gameState = this.gameManager.activeGames.get(gameId);
            }

            // Method 2: Try to find by user ID if direct lookup fails
            if (!gameState) {
                for (const [id, state] of this.gameManager.activeGames.entries()) {
                    if (state.userId === interaction.user.id && !state.gameOver) {
                        gameState = state;
                        gameId = id;
                        break;
                    }
                }
            }

            if (!gameState) {
                return interaction.reply({
                    content: '❌ Game not found or has expired! Please start a new game with `/tictactoe`, `/connect4`, `/battleship`, `/rummy`, `/poker`, or `/uno`.',
                    ephemeral: true
                });
            }

            // Check if it's the user's turn
            if (gameState.currentPlayer !== 'user' && gameState.currentPlayer !== 'R' && gameState.currentPlayer !== 'X') {
                return interaction.reply({
                    content: '❌ It\'s not your turn!',
                    ephemeral: true
                });
            }

            // Check if it's the right user
            if (gameState.userId !== interaction.user.id) {
                return interaction.reply({
                    content: '❌ This is not your game!',
                    ephemeral: true
                });
            }

            // Update last activity timestamp
            gameState.lastActivity = Date.now();

            // Handle different game types
            if (interaction.customId.startsWith('ttt_')) {
                await this.handleTicTacToeButton(interaction, gameState);
            } else if (interaction.customId.startsWith('c4_')) {
                await this.handleConnect4Button(interaction, gameState);
            } else if (interaction.customId.startsWith('bs_')) {
                await this.handleBattleshipButton(interaction, gameState);
            } else if (interaction.customId.startsWith('rummy_')) {
                await this.handleRummyButton(interaction, gameState);
            } else if (interaction.customId.startsWith('poker_')) {
                await this.handlePokerButton(interaction, gameState);
            } else if (interaction.customId.startsWith('uno_')) {
                await this.handleUnoButton(interaction, gameState);
            }

        } catch (error) {
            console.error('Error handling game button:', error);
            await interaction.reply({
                content: '❌ There was an error processing your move!',
                ephemeral: true
            });
        }
    }

    async handleGiveawayEntry(interaction) {
        try {
            const giveawayId = parseInt(interaction.customId.split('_')[2]);
            const userId = interaction.user.id;
            const username = interaction.user.username;

            const result = await this.giveawayService.enterGiveaway(giveawayId, userId, username);

            if (result.success) {
                // Send success DM
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle('🎉 Successfully Entered!')
                        .setDescription(`Hello ${username},\n\nYou successfully entered the giveaway for **${result.giveaway.giveaway_name}**`)
                        .addFields(
                            { name: '🎁 Prize', value: result.giveaway.description, inline: false }
                        )
                        .setFooter({ text: 'SEED Giveaway System' })
                        .setTimestamp();

                    await interaction.user.send({ embeds: [dmEmbed] });
                } catch (dmError) {
                    console.error('Failed to send DM:', dmError);
                }

                await interaction.reply({
                    content: '✅ You have successfully entered the giveaway! Check your DMs for confirmation.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `❌ ${result.message}`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error handling giveaway entry:', error);
            await interaction.reply({
                content: '❌ An error occurred while entering the giveaway.',
                ephemeral: true
            });
        }
    }

    async handleGiveawayCreateModal(interaction) {
        try {
            const name = interaction.fields.getTextInputValue('giveaway_name');
            const description = interaction.fields.getTextInputValue('giveaway_description');
            const maxWinners = parseInt(interaction.fields.getTextInputValue('giveaway_max_winners'));
            const timeStr = interaction.fields.getTextInputValue('giveaway_time');

            // Validate inputs
            if (isNaN(maxWinners) || maxWinners < 1) {
                return await interaction.reply({
                    content: '❌ Max winners must be a positive number!',
                    ephemeral: true
                });
            }

            // Parse time
            const duration = this.giveawayService.parseTime(timeStr);
            if (!duration) {
                return await interaction.reply({
                    content: '❌ Invalid time format! Use: 1m (minutes), 1h (hours), or 1d (days)',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            // Create giveaway
            const giveaway = await this.giveawayService.createGiveaway(
                name,
                description,
                maxWinners,
                timeStr,
                interaction.channel.id,
                interaction.user.id,
                interaction.guild.id
            );

            // Post giveaway
            await this.giveawayService.postGiveaway(giveaway);

            // Send confirmation (ephemeral - only you can see)
            const endTimestamp = Math.floor(new Date(giveaway.end_time).getTime() / 1000);
            const confirmEmbed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ Giveaway Created!')
                .setDescription(`Giveaway **${name}** has been created successfully!`)
                .addFields(
                    { name: '🎁 Prize', value: description, inline: false },
                    { name: '🏆 Winners', value: `${maxWinners}`, inline: false },
                    { name: '⏰ Ends', value: `<t:${endTimestamp}:R>`, inline: false },
                    { name: '👥 Entries', value: '0', inline: false }
                )
                .setFooter({ text: 'SEED Giveaway System • Only you can see this message' })
                .setTimestamp();

            await interaction.editReply({ embeds: [confirmEmbed] });

        } catch (error) {
            console.error('Error creating giveaway:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ An error occurred while creating the giveaway.'
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while creating the giveaway.',
                    ephemeral: true
                });
            }
        }
    }

    async handleTicketButton(interaction) {
        try {
            const customId = interaction.customId;

            // Handle close button
            if (customId.startsWith('ticket_close_')) {
                const ticketId = parseInt(customId.split('_')[2]);
                
                await interaction.reply({
                    content: '🔒 Closing ticket...',
                    ephemeral: true
                });

                await this.ticketService.closeTicket(ticketId, interaction.user.id);
                return;
            }

            // Handle ticket type selection buttons
            const ticketTypes = {
                'ticket_seedys_support': "Seedy's Support Ticket",
                'ticket_rule_breaking': 'Rule-breaking Ticket',
                'ticket_shop_errors': 'Real Money Seed Shop Errors',
                'ticket_ingame_shop': 'Ingame Shop Errors',
                'ticket_dispute': 'Dispute resolution Ticket'
            };

            const ticketType = ticketTypes[customId];
            if (!ticketType) {
                return await interaction.reply({
                    content: '❌ Unknown ticket type.',
                    ephemeral: true
                });
            }

            // Show modal
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

            const modal = new ModalBuilder()
                .setCustomId(`ticket_modal_${customId}`)
                .setTitle(ticketType);

            const nameInput = new TextInputBuilder()
                .setCustomId('in_game_name')
                .setLabel("What's your in-game name?")
                .setPlaceholder('Enter your in-game name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const helpInput = new TextInputBuilder()
                .setCustomId('help_description')
                .setLabel('How can we help?')
                .setPlaceholder('Describe your issue in detail')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000);

            const firstRow = new ActionRowBuilder().addComponents(nameInput);
            const secondRow = new ActionRowBuilder().addComponents(helpInput);

            modal.addComponents(firstRow, secondRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error handling ticket button:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            }).catch(() => {});
        }
    }

    async handleTicketModal(interaction) {
        try {
            const customId = interaction.customId;
            const ticketTypeKey = customId.replace('ticket_modal_', '');
            
            const ticketTypes = {
                'ticket_seedys_support': "Seedy's Support Ticket",
                'ticket_rule_breaking': 'Rule-breaking Ticket',
                'ticket_shop_errors': 'Real Money Seed Shop Errors',
                'ticket_ingame_shop': 'Ingame Shop Errors',
                'ticket_dispute': 'Dispute resolution Ticket'
            };

            const ticketType = ticketTypes[ticketTypeKey];
            const inGameName = interaction.fields.getTextInputValue('in_game_name');
            const helpDescription = interaction.fields.getTextInputValue('help_description');

            await interaction.deferReply({ ephemeral: true });

            // Get panel to get admin role
            const panel = await this.ticketService.getPanel(interaction.guild.id);
            if (!panel) {
                return await interaction.editReply({
                    content: '❌ Ticket system not set up. Contact an administrator.'
                });
            }

            // Create ticket channel
            const result = await this.ticketService.createTicketChannel(
                interaction.guild,
                interaction.user,
                ticketType,
                inGameName,
                helpDescription,
                panel.admin_role_id
            );

            await interaction.editReply({
                content: `✅ Ticket created! Please check ${result.channel}`
            });

        } catch (error) {
            console.error('Error handling ticket modal:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ An error occurred while creating your ticket.'
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while creating your ticket.',
                    ephemeral: true
                });
            }
        }
    }

    async handleDailyClaimModal(interaction) {
        try {
            const customId = interaction.customId;
            const serverNickname = customId.replace('daily_claim_modal_', '');
            
            const inGameName = interaction.fields.getTextInputValue('in_game_name');
            const confirmInGameName = interaction.fields.getTextInputValue('confirm_in_game_name');

            // Validate that both names match
            if (inGameName !== confirmInGameName) {
                return await interaction.reply({
                    content: '❌ In-game names do not match! Please try again.',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: false });

            // Check if user has a pending prize (this would need to be tracked in the database)
            // For now, we'll simulate a successful claim
            const username = interaction.user.username;
            const userId = interaction.user.id;

            // Check cooldown using the same system as daily-spin
            const cooldownCheck = await this.spinService.checkUserCooldown(userId, serverNickname);
            if (!cooldownCheck.canSpin) {
                const hoursLeft = Math.ceil(cooldownCheck.timeLeft);
                return await interaction.editReply({
                    content: `⏰ You must wait ${hoursLeft} more hours before claiming your prize again!`
                });
            }

            // Get the last won item (from the most recent spin)
            const lastSpinLog = await this.spinService.database.get(
                'SELECT * FROM spin_logs WHERE user_id = ? AND server_nickname = ? AND action = ? ORDER BY created_at DESC LIMIT 1',
                [userId, serverNickname, 'spin']
            );

            if (!lastSpinLog || !lastSpinLog.item_display_name) {
                return await interaction.editReply({
                    content: '❌ No pending prize found for today. Please spin first!'
                });
            }

            // Create item object for claiming
            const item = {
                display_name: lastSpinLog.item_display_name,
                short_name: lastSpinLog.item_short_name,
                quantity: lastSpinLog.quantity
            };

            // Claim the prize
            const claimResult = await this.spinService.claimPrize(userId, username, serverNickname, inGameName, item);

            if (claimResult.success) {
                // Set cooldown after successful claim (same as spinning)
                await this.spinService.setUserCooldown(userId, serverNickname);
                
                // Send success message to command channel
                const successEmbed = new EmbedBuilder()
                    .setTitle('🌱PRIZE CLAIMED🌱')
                    .setDescription(`**${username}** claimed **${item.display_name}**`)
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '**In Game Name**',
                            value: inGameName,
                            inline: false
                        },
                        {
                            name: '**Server**',
                            value: serverNickname,
                            inline: false
                        },
                        {
                            name: '**Delivery**',
                            value: 'Delivered to game server (1 server action).',
                            inline: false
                        }
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Prize Claim • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                await interaction.followUp({ embeds: [successEmbed] });

                // Send to log channel
                const config = await this.spinService.getSpinConfig(interaction.guild.id);
                if (config) {
                    const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
                    if (logChannel) {
                        await logChannel.send({ embeds: [successEmbed] });
                    }
                }

            } else {
                await interaction.editReply({
                    content: `❌ ${claimResult.message}`
                });
            }

        } catch (error) {
            console.error('Error handling daily claim modal:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ An error occurred while claiming your prize.'
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while claiming your prize.',
                    ephemeral: true
                });
            }
        }
    }

    async handleEditSpinItemModal(interaction) {
        try {
            const customId = interaction.customId;
            const itemId = customId.replace('edit_spin_item_modal_', '');
            
            const displayName = interaction.fields.getTextInputValue('display_name');
            const shortName = interaction.fields.getTextInputValue('short_name');
            const quantity = parseInt(interaction.fields.getTextInputValue('quantity'));

            // Validate quantity
            if (isNaN(quantity) || quantity < 1 || quantity > 1000) {
                return await interaction.reply({
                    content: '❌ Quantity must be a number between 1 and 1000!',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            // Edit the spin item
            await this.spinService.updateSpinItem(itemId, displayName, shortName, quantity);

            const embed = new EmbedBuilder()
                .setTitle('✅ Daily Spin Item Updated!')
                .setDescription(`**${displayName}** has been updated successfully.`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '**DISPLAY NAME**',
                        value: displayName,
                        inline: false
                    },
                    {
                        name: '**SHORT NAME**',
                        value: shortName,
                        inline: false
                    },
                    {
                        name: '**QUANTITY**',
                        value: quantity.toString(),
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Spin Item Management • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error handling edit spin item modal:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ An error occurred while updating the spin item.'
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while updating the spin item.',
                    ephemeral: true
                });
            }
        }
    }

    async handleDailySpinServerSelection(interaction, serverNickname) {
        try {
            const userId = interaction.user.id;
            const username = interaction.user.username;

            // Check cooldown
            const cooldownCheck = await this.spinService.checkUserCooldown(userId, serverNickname);
            if (!cooldownCheck.canSpin) {
                const hoursLeft = Math.ceil(cooldownCheck.timeLeft);
                return await interaction.reply({
                    content: `⏰ You must wait ${hoursLeft} more hours before spinning again!`,
                    ephemeral: true
                });
            }

            // Get spinning GIF
            const spinningGifPath = this.spinService.getAssetPath('spinning.gif');
            if (!spinningGifPath) {
                return await interaction.reply({
                    content: '❌ Spin animation not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Create initial spinning embed
            const spinningEmbed = this.spinService.createSpinEmbed(
                '🎰 Spinning the wheel...',
                'Good luck!',
                0x00ff00,
                spinningGifPath
            );

            const spinningAttachment = new AttachmentBuilder(spinningGifPath, { name: 'spinning.gif' });
            await interaction.update({ 
                embeds: [spinningEmbed], 
                files: [spinningAttachment],
                components: []
            });

            // Wait 7 seconds
            await new Promise(resolve => setTimeout(resolve, 7000));

            // Perform the spin
            const spinResult = await this.spinService.performSpin(userId, username, serverNickname, interaction.guild.id);

            let finalEmbed;
            let finalAttachment = null;

            if (spinResult.success) {
                // User won an item
                const winImagePath = this.spinService.getAssetPath('win.png') || this.spinService.getAssetPath('win.jpg');
                
                finalEmbed = this.spinService.createSpinEmbed(
                    '🎉 Congratulations!',
                    `You won: **${spinResult.item.display_name}** x${spinResult.item.quantity}\n\nUse \`/daily-claim\` to claim your prize!`,
                    0x00ff00,
                    winImagePath
                );

                if (winImagePath) {
                    finalAttachment = new AttachmentBuilder(winImagePath, { name: 'win.png' });
                }

                // Log to log channel
                const config = await this.spinService.getSpinConfig(interaction.guild.id);
                if (config) {
                    const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🎰 Daily Spin - Win!')
                            .setDescription(`**${username}** won **${spinResult.item.display_name}** x${spinResult.item.quantity}`)
                            .setColor(0x00ff00)
                            .addFields(
                                { name: '**Server**', value: serverNickname, inline: true },
                                { name: '**User**', value: `<@${userId}>`, inline: true },
                                { name: '**Prize**', value: `${spinResult.item.display_name} x${spinResult.item.quantity}`, inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: 'Spin System Log • Powered by Seedy' });

                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

            } else if (spinResult.error === 'failure') {
                // User failed (20% chance)
                const failImagePath = this.spinService.getAssetPath('fail.png') || this.spinService.getAssetPath('fail.jpg');
                
                finalEmbed = this.spinService.createSpinEmbed(
                    '😔 Better luck next time!',
                    'You didn\'t win anything this time. Try again later!',
                    0xff6b6b,
                    failImagePath
                );

                if (failImagePath) {
                    finalAttachment = new AttachmentBuilder(failImagePath, { name: 'fail.png' });
                }

                // Log to log channel
                const config = await this.spinService.getSpinConfig(interaction.guild.id);
                if (config) {
                    const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🎰 Daily Spin - Fail')
                            .setDescription(`**${username}** didn't win anything`)
                            .setColor(0xff6b6b)
                            .addFields(
                                { name: '**Server**', value: serverNickname, inline: true },
                                { name: '**User**', value: `<@${userId}>`, inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: 'Spin System Log • Powered by Seedy' });

                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

            } else {
                // Other errors
                finalEmbed = this.spinService.createSpinEmbed(
                    '❌ Error',
                    spinResult.message || 'Something went wrong. Please try again later.',
                    0xff0000
                );
            }

            // Update the message
            const updateOptions = { embeds: [finalEmbed] };
            if (finalAttachment) {
                updateOptions.files = [finalAttachment];
            }

            await interaction.editReply(updateOptions);

        } catch (error) {
            console.error('Error handling daily spin server selection:', error);
            await interaction.reply({
                content: '❌ There was an error processing your spin!',
                ephemeral: true
            });
        }
    }

    async handleDailyClaimServerSelection(interaction, serverNickname) {
        try {
            // Create modal
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
            const modal = new ModalBuilder()
                .setCustomId(`daily_claim_modal_${serverNickname}`)
                .setTitle('Claim Your Daily Prize');

            const inGameNameInput = new TextInputBuilder()
                .setCustomId('in_game_name')
                .setLabel('In Game Name')
                .setPlaceholder('Enter your in-game name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50);

            const confirmNameInput = new TextInputBuilder()
                .setCustomId('confirm_in_game_name')
                .setLabel('Confirm In Game Name')
                .setPlaceholder('Confirm your in-game name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50);

            const firstRow = new ActionRowBuilder().addComponents(inGameNameInput);
            const secondRow = new ActionRowBuilder().addComponents(confirmNameInput);

            modal.addComponents(firstRow, secondRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error handling daily claim server selection:', error);
            await interaction.reply({
                content: '❌ There was an error processing your claim request!',
                ephemeral: true
            });
        }
    }

    async handleAddSpinItemServerSelection(interaction, serverNickname, displayName, shortName, quantity) {
        try {
            // Add the spin item
            const item = await this.spinService.addSpinItem(serverNickname, displayName, shortName, quantity);

            // Create success embed
            const embed = new EmbedBuilder()
                .setTitle('✅ Daily Spin Item Added!')
                .setDescription(`**${displayName}** has been added to the daily spin pool.`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '**SERVER**',
                        value: serverNickname,
                        inline: false
                    },
                    {
                        name: '**DISPLAY NAME**',
                        value: displayName,
                        inline: false
                    },
                    {
                        name: '**SHORT NAME**',
                        value: shortName,
                        inline: false
                    },
                    {
                        name: '**QUANTITY**',
                        value: quantity.toString(),
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Spin Item Management • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.update({ embeds: [embed], components: [] });

        } catch (error) {
            console.error('Error handling add spin item server selection:', error);
            await interaction.reply({
                content: '❌ There was an error adding the spin item!',
                ephemeral: true
            });
        }
    }

    async handleRemoveSpinItemServerSelection(interaction, serverNickname) {
        try {
            // Get spin items for the server
            const items = await this.spinService.getSpinItems(serverNickname);
            
            if (items.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ No Spin Items Found')
                    .setDescription(`No spin items found for server "${serverNickname}".\n\nUse \`/add-daily-spin-item\` to add items first.`)
                    .setColor(0xff0000)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Spin Item Management • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                return await interaction.update({ embeds: [embed], components: [] });
            }

            // Create item selection dropdown
            const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('remove_spin_item_select')
                .setPlaceholder('Select an item to remove...')
                .setMinValues(1)
                .setMaxValues(1);

            items.forEach(item => {
                selectMenu.addOptions({
                    label: item.display_name,
                    description: `${item.short_name} x${item.quantity}`,
                    value: item.id.toString()
                });
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Remove Daily Spin Item')
                .setDescription(`Select an item from **${serverNickname}** to remove.\n\n⚠️ **This action cannot be undone!**`)
                .setColor(0xff6b6b)
                .setTimestamp()
                .setFooter({ 
                    text: 'Spin Item Management • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.update({ 
                embeds: [embed], 
                components: [row]
            });

        } catch (error) {
            console.error('Error handling remove spin item server selection:', error);
            await interaction.reply({
                content: '❌ There was an error loading the spin items!',
                ephemeral: true
            });
        }
    }

    async handleClearCooldownServerSelection(interaction, serverNickname, userId) {
        try {
            // Clear cooldown for specific server
            await this.spinService.clearUserCooldown(userId, serverNickname);

            const user = await interaction.client.users.fetch(userId);
            const embed = new EmbedBuilder()
                .setTitle('✅ Cooldown Cleared!')
                .setDescription(`Cleared daily spin cooldown for **${user.username}** on server **${serverNickname}**.`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '**USER**',
                        value: `${user} (${user.username})`,
                        inline: false
                    },
                    {
                        name: '**SERVER**',
                        value: serverNickname,
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Spin Cooldown Management • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.update({ embeds: [embed], components: [] });

        } catch (error) {
            console.error('Error handling clear cooldown server selection:', error);
            await interaction.reply({
                content: '❌ There was an error clearing the cooldown!',
                ephemeral: true
            });
        }
    }

    async handleAutocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);
            
            if (focusedOption.name === 'server') {
                // Get connected servers for autocomplete
                if (!this.rceManager) {
                    return interaction.respond([]);
                }

                const connectedServers = await this.rceManager.getAllServerConnections();
                const filteredServers = connectedServers
                    .filter(server => 
                        server.nickname.toLowerCase().includes(focusedOption.value.toLowerCase())
                    )
                    .slice(0, 25); // Discord limit

                const choices = filteredServers.map(server => ({
                    name: server.nickname,
                    value: server.nickname
                }));

                await interaction.respond(choices);
            } else if (focusedOption.name === 'item') {
                // Get spin items for autocomplete
                if (!this.spinService) {
                    return interaction.respond([]);
                }

                // Get the server from the interaction options
                const serverNickname = interaction.options.getString('server');
                if (!serverNickname) {
                    return interaction.respond([]);
                }

                const items = await this.spinService.getSpinItems(serverNickname);
                const filteredItems = items
                    .filter(item => 
                        item.display_name.toLowerCase().includes(focusedOption.value.toLowerCase()) ||
                        item.short_name.toLowerCase().includes(focusedOption.value.toLowerCase())
                    )
                    .slice(0, 25); // Discord limit

                const choices = filteredItems.map(item => ({
                    name: `${item.display_name} (${item.short_name} x${item.quantity})`,
                    value: item.id.toString()
                }));

                await interaction.respond(choices);
            }
        } catch (error) {
            console.error('Error handling autocomplete:', error);
            await interaction.respond([]);
        }
    }

    async handleTicTacToeButton(interaction, gameState) {
        const position = parseInt(interaction.customId.split('_')[2]); // ttt_interactionId_position
        
        if (gameState.board[position] !== '') {
            return interaction.reply({
                content: '❌ That position is already taken!',
                ephemeral: true
            });
        }

        // User move
        gameState.board[position] = 'X';
        
        // Check for winner
        const winner = this.checkTicTacToeWinner(gameState.board);
        if (winner) {
            await this.endTicTacToeGame(interaction, gameState, winner);
            return;
        }

        // Bot move
        const botMove = this.getTicTacToeBestMove(gameState.board);
        if (botMove !== -1) {
            gameState.board[botMove] = 'O';
            
            // Check for winner again
            const winner2 = this.checkTicTacToeWinner(gameState.board);
            if (winner2) {
                await this.endTicTacToeGame(interaction, gameState, winner2);
                return;
            }
        }

        // Update game display
        await this.updateTicTacToeDisplay(interaction, gameState);
    }

    checkTicTacToeWinner(board) {
        const winningCombinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];

        for (const combo of winningCombinations) {
            const [a, b, c] = combo;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }

        return board.includes('') ? null : 'tie';
    }

    getTicTacToeBestMove(board) {
        // Simple AI logic
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = 'O';
                if (this.checkTicTacToeWinner(board) === 'O') {
                    board[i] = '';
                    return i;
                }
                board[i] = '';
            }
        }

        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = 'X';
                if (this.checkTicTacToeWinner(board) === 'X') {
                    board[i] = '';
                    return i;
                }
                board[i] = '';
            }
        }

        if (board[4] === '') return 4;
        const corners = [0, 2, 6, 8];
        for (const corner of corners) {
            if (board[corner] === '') return corner;
        }
        const edges = [1, 3, 5, 7];
        for (const edge of edges) {
            if (board[edge] === '') return edge;
        }

        return -1;
    }

    async endTicTacToeGame(interaction, gameState, winner) {
        let result = '';
        let reward = 0;

        if (winner === 'X') {
            result = `🎉 **${gameState.username} wins!**`;
            reward = gameState.bet * 2;
            await this.economy.addMoney(gameState.userId, reward, 'Tic-Tac-Toe win');
            await this.economy.updateGameStats(gameState.userId, 'tictactoe', true);
        } else if (winner === 'O') {
            result = `🤖 **Seedy Bot wins!**`;
            await this.economy.removeMoney(gameState.userId, gameState.bet, 'Tic-Tac-Toe loss');
            await this.economy.updateGameStats(gameState.userId, 'tictactoe', false);
        } else {
            result = `🤝 **It's a tie!**`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎮 Tic-Tac-Toe Game - Finished!')
            .setDescription(`${result}\n\n${reward > 0 ? `💰 **Reward:** ${this.economy.formatCurrency(reward)}` : ''}`)
            .setColor(winner === 'X' ? 0x00ff00 : winner === 'O' ? 0xff0000 : 0xffff00)
            .addFields({
                name: '**Final Board**',
                value: this.renderTicTacToeBoard(gameState.board),
                inline: false
            })
            .setTimestamp()
            .setFooter({ text: 'Game Over • Powered by Seedy' });

        await interaction.update({ embeds: [embed], components: [] });
        this.gameManager.activeGames.delete(gameId);
    }

    async updateTicTacToeDisplay(interaction, gameState) {
        const embed = new EmbedBuilder()
            .setTitle('🎮 Tic-Tac-Toe Game')
            .setDescription(`**${gameState.username}** vs **Seedy Bot**\n\n${gameState.bet > 0 ? `💰 **Bet:** ${this.economy.formatCurrency(gameState.bet)}` : '🎯 **Friendly Game**'}\n\n**Current Turn:** ${gameState.currentPlayer === 'X' ? gameState.username : 'Seedy Bot'}`)
            .setColor(0x4ecdc4)
            .addFields({
                name: '**Game Board**',
                value: this.renderTicTacToeBoard(gameState.board),
                inline: false
            })
            .setTimestamp()
            .setFooter({ text: 'Click a button to make your move! • Powered by Seedy' });

        // Extract interaction ID from the game ID
        const interactionId = gameId.replace('ttt_', '');
        const buttons = this.createTicTacToeButtons(gameState.board, interactionId);
        await interaction.update({ embeds: [embed], components: buttons });
    }

    renderTicTacToeBoard(board) {
        const displayBoard = board.map((cell, index) => {
            if (cell === '') return `${index + 1}`;
            return cell === 'X' ? '❌' : '⭕';
        });

        return `\`\`\`
 ${displayBoard[0]} │ ${displayBoard[1]} │ ${displayBoard[2]}
───┼───┼───
 ${displayBoard[3]} │ ${displayBoard[4]} │ ${displayBoard[5]}
───┼───┼───
 ${displayBoard[6]} │ ${displayBoard[7]} │ ${displayBoard[8]}
\`\`\``;
    }

    createTicTacToeButtons(board, interactionId) {
        const rows = [];
        
        for (let i = 0; i < 3; i++) {
            const row = new ActionRowBuilder();
            for (let j = 0; j < 3; j++) {
                const index = i * 3 + j;
                const button = new ButtonBuilder()
                    .setCustomId(`ttt_${interactionId}_${index}`)
                    .setLabel(board[index] === '' ? `${index + 1}` : (board[index] === 'X' ? '❌' : '⭕'))
                    .setStyle(board[index] === '' ? ButtonStyle.Secondary : ButtonStyle.Primary)
                    .setDisabled(board[index] !== '');
                
                row.addComponents(button);
            }
            rows.push(row);
        }

        return rows;
    }

    // Placeholder methods for other games (to be implemented)
    async handleConnect4Button(interaction, gameState) {
        const column = parseInt(interaction.customId.split('_')[2]); // c4_interactionId_column
        
        // Find lowest empty spot in column
        let row = -1;
        for (let i = 5; i >= 0; i--) {
            if (gameState.board[i][column] === '') {
                row = i;
                break;
            }
        }
        
        if (row === -1) {
            return interaction.reply({
                content: '❌ That column is full! Choose another column.',
                ephemeral: true
            });
        }
        
        // Place user piece
        gameState.board[row][column] = 'R';
        gameState.moves++;
        
        // Check for win
        if (this.checkConnect4Winner(gameState.board, row, column, 'R')) {
            await this.endConnect4Game(interaction, gameState, 'user');
            return;
        }
        
        // Check for tie
        if (gameState.moves >= 42) {
            await this.endConnect4Game(interaction, gameState, 'tie');
            return;
        }
        
        // Bot move (AI)
        const botColumn = this.getConnect4BotMove(gameState.board);
        if (botColumn !== -1) {
            let botRow = -1;
            for (let i = 5; i >= 0; i--) {
                if (gameState.board[i][botColumn] === '') {
                    botRow = i;
                    break;
                }
            }
            
            if (botRow !== -1) {
                gameState.board[botRow][botColumn] = 'Y';
                gameState.moves++;
                
                if (this.checkConnect4Winner(gameState.board, botRow, botColumn, 'Y')) {
                    await this.endConnect4Game(interaction, gameState, 'bot');
                    return;
                }
            }
        }
        
        // Update display
        await this.updateConnect4Display(interaction, gameState);
    }

    async handleBattleshipButton(interaction, gameState) {
        const customId = interaction.customId;
        const parts = customId.split('_');
        
        if (parts.length < 4) {
            return interaction.reply({
                content: '❌ Invalid button format!',
                ephemeral: true
            });
        }
        
        const coordinate = parts[3]; // bs_interactionId_coordinate
        
        // Parse coordinate (A1, B2, etc.)
        let row, col;
        if (coordinate.match(/^[A-J]$/)) {
            // Letter button - need to wait for number
            gameState.selectedLetter = coordinate;
            return interaction.reply({
                content: `🎯 Selected column **${coordinate}**. Now click a row number (1-10)!`,
                ephemeral: true
            });
        } else if (coordinate.match(/^[1-9]|10$/)) {
            // Number button - need letter
            if (!gameState.selectedLetter) {
                return interaction.reply({
                    content: '❌ Please select a column first (A-J)!',
                    ephemeral: true
                });
            }
            
            row = parseInt(coordinate) - 1;
            col = gameState.selectedLetter.charCodeAt(0) - 65;
            gameState.selectedLetter = null; // Reset selection
        } else {
            return interaction.reply({
                content: '❌ Invalid coordinate!',
                ephemeral: true
            });
        }
        
        // Check if already shot
        if (gameState.userShots[row][col] !== '') {
            return interaction.reply({
                content: '❌ You already shot there!',
                ephemeral: true
            });
        }
        
        // Make shot
        const hit = gameState.botBoard[row][col] === 'S';
        gameState.userShots[row][col] = hit ? 'H' : 'M';
        
        if (hit) {
            gameState.botBoard[row][col] = 'H';
        }
        
        // Check if game over
        if (this.checkBattleshipGameOver(gameState.botBoard)) {
            await this.endBattleshipGame(interaction, gameState, 'user');
            return;
        }
        
        // Bot's turn
        await this.botBattleshipMove(gameState);
        
        // Check if bot won
        if (this.checkBattleshipGameOver(gameState.userBoard)) {
            await this.endBattleshipGame(interaction, gameState, 'bot');
            return;
        }
        
        // Update display
        await this.updateBattleshipDisplay(interaction, gameState);
    }

    async handleRummyButton(interaction, gameState) {
        const customId = interaction.customId;
        const parts = customId.split('_');
        
        if (parts.length < 3) {
            return interaction.reply({
                content: '❌ Invalid button format!',
                ephemeral: true
            });
        }
        
        const action = parts[2]; // rummy_interactionId_action
        
        if (action === 'draw') {
            // Draw from deck
            if (gameState.deck.length === 0) {
                return interaction.reply({
                    content: '❌ Deck is empty!',
                    ephemeral: true
                });
            }
            
            const card = gameState.deck.pop();
            gameState.userHand.push(card);
            
            await interaction.reply({
                content: `🃏 Drew **${this.renderRummyCard(card)}** from the deck!`,
                ephemeral: true
            });
            
        } else if (action === 'discard') {
            // Draw from discard pile
            if (gameState.discardPile.length === 0) {
                return interaction.reply({
                    content: '❌ Discard pile is empty!',
                    ephemeral: true
                });
            }
            
            const card = gameState.discardPile.pop();
            gameState.userHand.push(card);
            
            await interaction.reply({
                content: `🗑️ Drew **${this.renderRummyCard(card)}** from the discard pile!`,
                ephemeral: true
            });
            
        } else if (action === 'end') {
            // End turn - bot's turn
            gameState.currentPlayer = 'bot';
            
            // Bot's turn
            await this.botRummyMove(gameState);
            
            // Check if game over
            if (gameState.userHand.length === 0 || gameState.botHand.length === 0) {
                await this.endRummyGame(interaction, gameState);
                return;
            }
            
            gameState.currentPlayer = 'user';
        }
        
        // Update display
        await this.updateRummyDisplay(interaction, gameState);
    }

    async handlePokerButton(interaction, gameState) {
        // Implementation for Poker
        await interaction.reply({ content: 'Poker button handling - Coming soon!', ephemeral: true });
    }

    async handleUnoButton(interaction, gameState) {
        // Implementation for Uno
        await interaction.reply({ content: 'Uno button handling - Coming soon!', ephemeral: true });
    }

    // Rummy helper methods
    renderRummyCard(card) {
        const color = ['♥️', '♦️'].includes(card.suit) ? '🔴' : '⚫';
        return `${color} ${card.rank}${card.suit}`;
    }

    async botRummyMove(gameState) {
        // Simple AI - draw from deck or discard pile randomly
        if (Math.random() < 0.7 && gameState.deck.length > 0) {
            // Draw from deck
            const card = gameState.deck.pop();
            gameState.botHand.push(card);
        } else if (gameState.discardPile.length > 0) {
            // Draw from discard pile
            const card = gameState.discardPile.pop();
            gameState.botHand.push(card);
        }
        
        // Bot discards a random card
        if (gameState.botHand.length > 0) {
            const randomIndex = Math.floor(Math.random() * gameState.botHand.length);
            const discardedCard = gameState.botHand.splice(randomIndex, 1)[0];
            gameState.discardPile.push(discardedCard);
        }
    }

    async endRummyGame(interaction, gameState) {
        let result = '';
        let reward = 0;
        let color = 0x4ecdc4;

        if (gameState.userHand.length === 0) {
            result = `🎉 **${gameState.username} wins!** 🃏`;
            reward = gameState.bet * 2;
            color = 0x2ecc71;
            await this.economy.addMoney(gameState.userId, reward, 'Rummy win');
            await this.economy.updateGameStats(gameState.userId, 'rummy', true);
        } else {
            result = `🤖 **Seedy Bot wins!** 🃏`;
            color = 0xe74c3c;
            await this.economy.updateGameStats(gameState.userId, 'rummy', false);
        }

        const embed = new EmbedBuilder()
            .setTitle('🃏 Rummy Game - Finished!')
            .setDescription(`${result}\n\n${gameState.bet > 0 ? `💰 **Reward:** ${this.economy.formatCurrency(reward)}` : '🎯 **Friendly Game**'}`)
            .setColor(color)
            .addFields({
                name: '**🃏 Final Hands**',
                value: `**${gameState.username}:** ${gameState.userHand.length} cards\n**Seedy Bot:** ${gameState.botHand.length} cards`,
                inline: false
            })
            .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
            .setTimestamp()
            .setFooter({ text: 'Game Over • Powered by Seedy' });

        await interaction.update({ embeds: [embed], components: [] });
        // Find and delete the game from activeGames
        for (const [id, state] of this.gameManager.activeGames.entries()) {
            if (state.userId === gameState.userId && !state.gameOver) {
                this.gameManager.activeGames.delete(id);
                break;
            }
        }
    }

    async updateRummyDisplay(interaction, gameState) {
        const embed = new EmbedBuilder()
            .setTitle('🃏 Rummy Game')
            .setDescription(`**${gameState.username}** vs **Seedy Bot**\n\n${gameState.bet > 0 ? `💰 **Bet:** ${this.economy.formatCurrency(gameState.bet)}` : '🎯 **Friendly Game**'}\n\n**Current Turn:** ${gameState.currentPlayer === 'user' ? `🃏 ${gameState.username}` : '🤖 Seedy Bot'}`)
            .setColor(0x4ecdc4)
            .addFields({
                name: '**🃏 Your Hand**',
                value: this.renderRummyHand(gameState.userHand),
                inline: true
            }, {
                name: '**🗑️ Discard Pile**',
                value: gameState.discardPile.length > 0 ? this.renderRummyCard(gameState.discardPile[gameState.discardPile.length - 1]) : 'Empty',
                inline: true
            }, {
                name: '**📊 Game Info**',
                value: `**Deck:** ${gameState.deck.length} cards\n**Your Cards:** ${gameState.userHand.length}\n**Bot Cards:** ${gameState.botHand.length}`,
                inline: false
            })
            .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
            .setTimestamp()
            .setFooter({ text: '🃏 Click buttons to draw or discard cards! • Powered by Seedy' });

        // Find the game ID for this user
        let gameId = null;
        for (const [id, state] of this.gameManager.activeGames.entries()) {
            if (state.userId === gameState.userId && !state.gameOver) {
                gameId = id;
                break;
            }
        }
        
        if (gameId) {
            const interactionId = gameId.replace('rummy_', '');
            const buttons = this.createRummyButtons(gameState, interactionId);
            await interaction.update({ embeds: [embed], components: buttons });
        } else {
            await interaction.update({ embeds: [embed], components: [] });
        }
    }

    renderRummyHand(hand) {
        if (hand.length === 0) return 'No cards';
        return hand.map(card => this.renderRummyCard(card)).join(' ');
    }

    createRummyButtons(gameState, interactionId) {
        const row = new ActionRowBuilder();
        
        const drawButton = new ButtonBuilder()
            .setCustomId(`rummy_${interactionId}_draw`)
            .setLabel('Draw from Deck')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🃏');

        const discardButton = new ButtonBuilder()
            .setCustomId(`rummy_${interactionId}_discard`)
            .setLabel('Draw from Discard')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🗑️')
            .setDisabled(gameState.discardPile.length === 0);

        const endTurnButton = new ButtonBuilder()
            .setCustomId(`rummy_${interactionId}_end`)
            .setLabel('End Turn')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        row.addComponents(drawButton, discardButton, endTurnButton);
        return [row];
    }

    // Battleship helper methods
    checkBattleshipGameOver(board) {
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                if (board[row][col] === 'S') {
                    return false; // Still has ships
                }
            }
        }
        return true; // All ships sunk
    }

    async botBattleshipMove(gameState) {
        // Simple AI - random shots
        let row, col;
        do {
            row = Math.floor(Math.random() * 10);
            col = Math.floor(Math.random() * 10);
        } while (gameState.botShots[row][col] !== '');

        const hit = gameState.userBoard[row][col] === 'S';
        gameState.botShots[row][col] = hit ? 'H' : 'M';
        
        if (hit) {
            gameState.userBoard[row][col] = 'H';
        }
    }

    async endBattleshipGame(interaction, gameState, winner) {
        let result = '';
        let reward = 0;
        let color = 0x3498db;

        if (winner === 'user') {
            result = `🎉 **${gameState.username} wins!** 🚢`;
            reward = gameState.bet * 2;
            color = 0x2ecc71;
            await this.economy.addMoney(gameState.userId, reward, 'Battleship win');
            await this.economy.updateGameStats(gameState.userId, 'battleship', true);
        } else {
            result = `🤖 **Seedy Bot wins!** 🚢`;
            color = 0xe74c3c;
            await this.economy.updateGameStats(gameState.userId, 'battleship', false);
        }

        const embed = new EmbedBuilder()
            .setTitle('🚢⚓ Battleship Game - Finished!')
            .setDescription(`${result}\n\n${gameState.bet > 0 ? `💰 **Reward:** ${this.economy.formatCurrency(reward)}` : '🎯 **Friendly Game**'}`)
            .setColor(color)
            .addFields({
                name: '**🌊 Your Ocean**',
                value: this.renderBattleshipBoard(gameState.userBoard, true),
                inline: true
            }, {
                name: '**🎯 Enemy Ocean**',
                value: this.renderBattleshipBoard(gameState.botBoard, true),
                inline: true
            })
            .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
            .setTimestamp()
            .setFooter({ text: 'Game Over • Powered by Seedy' });

        await interaction.update({ embeds: [embed], components: [] });
        // Find and delete the game from activeGames
        for (const [id, state] of this.gameManager.activeGames.entries()) {
            if (state.userId === gameState.userId && !state.gameOver) {
                this.gameManager.activeGames.delete(id);
                break;
            }
        }
    }

    async updateBattleshipDisplay(interaction, gameState) {
        const embed = new EmbedBuilder()
            .setTitle('🚢⚓ Battleship Game')
            .setDescription(`**${gameState.username}** 🚢 vs **Seedy Bot** 🤖\n\n${gameState.bet > 0 ? `💰 **Bet:** ${this.economy.formatCurrency(gameState.bet)}` : '🎯 **Friendly Game**'}\n\n**Current Turn:** ${gameState.currentPlayer === 'user' ? `🚢 ${gameState.username}` : '🤖 Seedy Bot'}`)
            .setColor(0x3498db)
            .addFields({
                name: '**🌊 Your Ocean**',
                value: this.renderBattleshipBoard(gameState.userBoard, true),
                inline: true
            }, {
                name: '**🎯 Enemy Ocean**',
                value: this.renderBattleshipBoard(gameState.userShots, false),
                inline: true
            })
            .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
            .setTimestamp()
            .setFooter({ text: '🎯 Click coordinates to attack! • Powered by Seedy' });

        // Find the game ID for this user
        let gameId = null;
        for (const [id, state] of this.gameManager.activeGames.entries()) {
            if (state.userId === gameState.userId && !state.gameOver) {
                gameId = id;
                break;
            }
        }
        
        if (gameId) {
            const interactionId = gameId.replace('bs_', '');
            const buttons = this.createBattleshipButtons(gameState, interactionId);
            await interaction.update({ embeds: [embed], components: buttons });
        } else {
            await interaction.update({ embeds: [embed], components: [] });
        }
    }

    renderBattleshipBoard(board, showShips = false) {
        let display = '```\n';
        display += '   A B C D E F G H I J\n';
        
        for (let row = 0; row < 10; row++) {
            display += `${row + 1} `;
            if (row < 9) display += ' ';
            
            for (let col = 0; col < 10; col++) {
                const cell = board[row][col];
                if (cell === 'S' && showShips) {
                    display += '🚢 ';
                } else if (cell === 'H') {
                    display += '💥 ';
                } else if (cell === 'M') {
                    display += '❌ ';
                } else {
                    display += '🌊 ';
                }
            }
            display += '\n';
        }
        
        display += '```';
        return display;
    }

    createBattleshipButtons(gameState, interactionId) {
        const rows = [];
        
        // Create coordinate buttons (5 rows of 2 buttons each for letters A-J)
        for (let row = 0; row < 5; row++) {
            const buttonRow = new ActionRowBuilder();
            for (let col = 0; col < 2; col++) {
                const letterIndex = row * 2 + col;
                if (letterIndex < 10) {
                    const letter = String.fromCharCode(65 + letterIndex);
                    const button = new ButtonBuilder()
                        .setCustomId(`bs_${interactionId}_${letter}`)
                        .setLabel(letter)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎯');
                    
                    buttonRow.addComponents(button);
                }
            }
            rows.push(buttonRow);
        }

        // Add number buttons (1-10) - split into two rows to avoid button limit
        const numberRow1 = new ActionRowBuilder();
        const numberRow2 = new ActionRowBuilder();
        
        for (let i = 1; i <= 5; i++) {
            const button = new ButtonBuilder()
                .setCustomId(`bs_${interactionId}_${i}`)
                .setLabel(`${i}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔢');
            
            numberRow1.addComponents(button);
        }
        
        for (let i = 6; i <= 10; i++) {
            const button = new ButtonBuilder()
                .setCustomId(`bs_${interactionId}_${i}`)
                .setLabel(`${i}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔢');
            
            numberRow2.addComponents(button);
        }
        
        rows.push(numberRow1, numberRow2);

        return rows;
    }

    // Connect 4 helper methods
    checkConnect4Winner(board, row, col, player) {
        // Check horizontal
        let count = 1;
        for (let c = col - 1; c >= 0 && board[row][c] === player; c--) count++;
        for (let c = col + 1; c < 7 && board[row][c] === player; c++) count++;
        if (count >= 4) return true;

        // Check vertical
        count = 1;
        for (let r = row - 1; r >= 0 && board[r][col] === player; r--) count++;
        for (let r = row + 1; r < 6 && board[r][col] === player; r++) count++;
        if (count >= 4) return true;

        // Check diagonal \
        count = 1;
        for (let r = row - 1, c = col - 1; r >= 0 && c >= 0 && board[r][c] === player; r--, c--) count++;
        for (let r = row + 1, c = col + 1; r < 6 && c < 7 && board[r][c] === player; r++, c++) count++;
        if (count >= 4) return true;

        // Check diagonal /
        count = 1;
        for (let r = row - 1, c = col + 1; r >= 0 && c < 7 && board[r][c] === player; r--, c++) count++;
        for (let r = row + 1, c = col - 1; r < 6 && c >= 0 && board[r][c] === player; r++, c--) count++;
        if (count >= 4) return true;

        return false;
    }

    getConnect4BotMove(board) {
        // Try to win
        for (let col = 0; col < 7; col++) {
            if (this.canWinInColumn(board, col, 'Y')) return col;
        }
        
        // Try to block
        for (let col = 0; col < 7; col++) {
            if (this.canWinInColumn(board, col, 'R')) return col;
        }
        
        // Prefer center columns
        const centerCols = [3, 2, 4, 1, 5, 0, 6];
        for (const col of centerCols) {
            if (this.isColumnAvailable(board, col)) return col;
        }
        
        return -1;
    }

    canWinInColumn(board, col, player) {
        if (!this.isColumnAvailable(board, col)) return false;
        
        // Find the row where the piece would be placed
        let row = -1;
        for (let i = 5; i >= 0; i--) {
            if (board[i][col] === '') {
                row = i;
                break;
            }
        }
        
        if (row === -1) return false;
        
        // Temporarily place piece and check for win
        board[row][col] = player;
        const canWin = this.checkConnect4Winner(board, row, col, player);
        board[row][col] = '';
        
        return canWin;
    }

    isColumnAvailable(board, col) {
        return board[0][col] === '';
    }

    async endConnect4Game(interaction, gameState, winner) {
        let result = '';
        let reward = 0;
        let color = 0x4ecdc4;

        if (winner === 'user') {
            result = `🎉 **${gameState.username} wins!** 🔴`;
            reward = gameState.bet * 2;
            color = 0xff6b6b;
            await this.economy.addMoney(gameState.userId, reward, 'Connect 4 win');
            await this.economy.updateGameStats(gameState.userId, 'connect4', true);
        } else if (winner === 'bot') {
            result = `🤖 **Seedy Bot wins!** 🟡`;
            color = 0xffd93d;
            await this.economy.updateGameStats(gameState.userId, 'connect4', false);
        } else {
            result = `🤝 **It's a tie!**`;
            reward = gameState.bet; // Return bet
            color = 0x95a5a6;
            if (gameState.bet > 0) {
                await this.economy.addMoney(gameState.userId, reward, 'Connect 4 tie');
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('🔴🟡 Connect 4 Game - Finished!')
            .setDescription(`${result}\n\n${gameState.bet > 0 ? `💰 **Reward:** ${this.economy.formatCurrency(reward)}` : '🎯 **Friendly Game**'}`)
            .setColor(color)
            .addFields({
                name: '**🎮 Final Board**',
                value: this.renderConnect4Board(gameState.board),
                inline: false
            })
            .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
            .setTimestamp()
            .setFooter({ text: 'Game Over • Powered by Seedy' });

        await interaction.update({ embeds: [embed], components: [] });
        // Find and delete the game from activeGames
        for (const [id, state] of this.gameManager.activeGames.entries()) {
            if (state.userId === gameState.userId && !state.gameOver) {
                this.gameManager.activeGames.delete(id);
                break;
            }
        }
    }

    async updateConnect4Display(interaction, gameState) {
        const embed = new EmbedBuilder()
            .setTitle('🔴🟡 Connect 4 Game')
            .setDescription(`**${gameState.username}** 🔴 vs **Seedy Bot** 🟡\n\n${gameState.bet > 0 ? `💰 **Bet:** ${this.economy.formatCurrency(gameState.bet)}` : '🎯 **Friendly Game**'}\n\n**Current Turn:** ${gameState.currentPlayer === 'R' ? `🔴 ${gameState.username}` : '🟡 Seedy Bot'}`)
            .setColor(0x4ecdc4)
            .addFields({
                name: '**🎮 Game Board**',
                value: this.renderConnect4Board(gameState.board),
                inline: false
            })
            .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
            .setTimestamp()
            .setFooter({ text: '🎯 Click a column number to drop your piece! • Powered by Seedy' });

        // Find the game ID for this user
        let gameId = null;
        for (const [id, state] of this.gameManager.activeGames.entries()) {
            if (state.userId === gameState.userId && !state.gameOver) {
                gameId = id;
                break;
            }
        }
        
        if (gameId) {
            const interactionId = gameId.replace('c4_', '');
            const buttons = this.createConnect4Buttons(gameState.board, interactionId);
            await interaction.update({ embeds: [embed], components: buttons });
        } else {
            await interaction.update({ embeds: [embed], components: [] });
        }
    }

    renderConnect4Board(board) {
        let display = '```\n';
        display += '  1   2   3   4   5   6   7\n';
        display += '┌───┬───┬───┬───┬───┬───┬───┐\n';
        
        for (let row = 0; row < 6; row++) {
            display += '│';
            for (let col = 0; col < 7; col++) {
                const cell = board[row][col];
                if (cell === 'R') {
                    display += ' 🔴 │';
                } else if (cell === 'Y') {
                    display += ' 🟡 │';
                } else {
                    display += '   │';
                }
            }
            display += '\n';
            if (row < 5) {
                display += '├───┼───┼───┼───┼───┼───┼───┤\n';
            }
        }
        
        display += '└───┴───┴───┴───┴───┴───┴───┘\n';
        display += '```';
        
        return display;
    }

    createConnect4Buttons(board, interactionId) {
        const row = new ActionRowBuilder();
        
        for (let col = 0; col < 7; col++) {
            const isFull = board[0][col] !== '';
            const button = new ButtonBuilder()
                .setCustomId(`c4_${interactionId}_${col}`)
                .setLabel(`${col + 1}`)
                .setStyle(isFull ? ButtonStyle.Danger : ButtonStyle.Primary)
                .setDisabled(isFull)
                .setEmoji(isFull ? '❌' : '⬇️');
            
            row.addComponents(button);
        }

        return [row];
    }

    cleanupExpiredGames() {
        const now = Date.now();
        const maxInactivity = 15 * 60 * 1000; // 15 minutes of inactivity

        for (const [gameId, gameState] of this.gameManager.activeGames.entries()) {
            if (gameState.lastActivity && (now - gameState.lastActivity) > maxInactivity) {
                console.log(`Cleaning up inactive game: ${gameId}`);
                this.gameManager.activeGames.delete(gameId);
            }
        }
    }

    async start() {
        try {
            await this.client.login(process.env.DISCORD_TOKEN);
        } catch (error) {
            console.error('Failed to start Seedy bot:', error);
            process.exit(1);
        }
    }
}

// Start the bot
const seedyBot = new SeedyBot();
global.seedyBot = seedyBot; // Make bot instance available globally for API server
seedyBot.start();

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    seedyBot.rconService.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    seedyBot.rconService.stopPolling();
    process.exit(0);
});

module.exports = SeedyBot;