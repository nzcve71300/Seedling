const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Get information about various topics')
        .addStringOption(option =>
            option.setName('topic')
                .setDescription('Choose a topic to get information about')
                .setRequired(false)
                .addChoices(
                    { name: 'Partnerships', value: 'partnerships' },
                    { name: 'Announcements', value: 'announcement' },
                    { name: 'Voting', value: 'votes' },
                    { name: 'Information', value: 'information' },
                    { name: 'Advertising', value: 'advertising' },
                    { name: 'Alliance', value: 'alliance' },
                    { name: 'Giveaways', value: 'giveaway' },
                    { name: 'Battlepass', value: 'battlepass' },
                    { name: 'Support Tickets', value: 'ticket' },
                    { name: 'SEED TAG Club', value: 'seedtag' },
                    { name: 'Main Chat', value: 'mainchat' },
                    { name: 'World Wide Chat', value: 'worldwide' },
                    { name: 'Bot Commands', value: 'botcommands' },
                    { name: 'Clips', value: 'clips' },
                    { name: 'Verified & Linked', value: 'verified' },
                    { name: 'ZORP & Rider', value: 'zorp' },
                    { name: 'Roles', value: 'roles' },
                    { name: 'Rules', value: 'rules' },
                    { name: 'Kits', value: 'kits' },
                    { name: 'Guides', value: 'guides' }
                )),

    async execute(interaction, bot) {
        const topic = interaction.options.getString('topic');
        
        // If no topic specified, show general bot info
        if (!topic) {
            const embed = new EmbedBuilder()
                .setTitle('🌱 Seedy Bot Information')
                .setDescription('A comprehensive Discord bot with games and fun features!')
                .setColor(0x00ff00)
                .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
                .addFields(
                    {
                        name: '📊 Version',
                        value: '1.0.0',
                        inline: true
                    },
                    {
                        name: '🎮 Features',
                        value: '• Economy System\n• Games (Hangman)\n• Moderation Tools\n• Survey System\n• ZORP Help',
                        inline: true
                    },
                    {
                        name: '🔗 Links',
                        value: '[GitHub Repository](https://github.com/nzcve71300/seedyy)\n[Report Issues](https://github.com/nzcve71300/seedyy/issues)',
                        inline: false
                    },
                    {
                        name: '⚡ Commands',
                        value: '• `/balance` - Check your balance\n• `/daily` - Claim daily rewards\n• `/hangman` - Play hangman\n• `/leaderboard` - View top users\n• `/chat` - Chat with Seedy\n• `/survey` - Create surveys',
                        inline: false
                    },
                    {
                        name: 'ℹ️ Information Topics',
                        value: 'Use `/info <topic>` to get information about:\n• Partnerships • Announcements • Voting • Information\n• Advertising • Alliance • Giveaways • Battlepass\n• Support Tickets • SEED TAG Club • Main Chat\n• World Wide Chat • Bot Commands • Clips\n• Verified & Linked • ZORP & Rider • Roles\n• Rules • Kits • Guides',
                        inline: false
                    }
                )
                .setFooter({ 
                    text: 'Powered by Seedy • Made with ❤️', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            return;
        }

        // Handle Partnerships separately (not in channelKeywords)
        if (topic === 'partnerships') {
            const embed = new EmbedBuilder()
                .setTitle('🤝 Partnerships')
                .setDescription('Interested in partnering with us? We offer various partnership opportunities!')
                .setColor(0x00ff00)
                .setImage('https://i.imgur.com/ieP1fd5.jpeg')
                .addFields({
                    name: '🔗 Check Out Our Partners',
                    value: '[Visit Partner Page](https://seedtag.club/partners)',
                    inline: false
                })
                .setFooter({ 
                    text: 'Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            return;
        }

        // Handle other topics from channelKeywords
        const config = bot.channelKeywords[topic];
        
        if (!config) {
            await interaction.reply({ 
                content: '❌ Sorry, I couldn\'t find information about that topic. Use `/info` without a topic to see all available topics!', 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(config.title)
            .setDescription(config.description)
            .setColor(0x00ff00)
            .addFields({
                name: '📍 Main Channel',
                value: `<#${config.channelId}>`,
                inline: false
            })
            .setFooter({ 
                text: 'Powered by Seedy', 
                iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
            })
            .setTimestamp();

        // Add additional channels if they exist
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

        // Add special images for specific topics
        if (topic === 'zorp') {
            embed.setImage('https://i.imgur.com/O8xh49D.png');
        } else if (topic === 'kits') {
            embed.setImage('https://i.imgur.com/l30wM88.jpeg');
        } else if (topic === 'seedtag') {
            embed.setImage('https://i.imgur.com/mcLzmW2.png');
        } else {
            embed.setImage('https://i.imgur.com/ieP1fd5.jpeg');
        }

        await interaction.reply({ embeds: [embed] });
    },

    cooldown: 5
};
