const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear-daily-spin-cooldown')
        .setDescription('Clear a user\'s daily spin cooldown')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to clear cooldown for')
                .setRequired(true)),

    async execute(interaction, bot) {
        try {
            const user = interaction.options.getUser('user');

            // Check if SpinService is available
            if (!bot.spinService) {
                return interaction.reply({
                    content: '❌ Spin service is not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Get connected servers
            if (!bot.rceManager) {
                return interaction.reply({
                    content: '❌ RCE Manager service is not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            const connectedServers = await bot.rceManager.getAllServerConnections();
            if (connectedServers.length === 0) {
                return interaction.reply({
                    content: '❌ No servers are connected. Please contact an administrator to connect servers first.',
                    ephemeral: true
                });
            }

            // Create server selection dropdown
            const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`clear_cooldown_server_select_${user.id}`)
                .setPlaceholder('Select a server to clear cooldown on...')
                .setMinValues(1)
                .setMaxValues(1);

            connectedServers.forEach(server => {
                const statusEmoji = server.status === 'connected' ? '🟢' : 
                                   server.status === 'disconnected' ? '🔴' : '🟡';
                
                selectMenu.addOptions({
                    label: server.nickname,
                    description: `${statusEmoji} ${server.server_ip}:${server.rcon_port}`,
                    value: server.nickname
                });
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('⏰ Clear Daily Spin Cooldown')
                .setDescription(`Select a server to clear cooldown for **${user.username}**.`)
                .setColor(0x4ecdc4)
                .addFields(
                    {
                        name: '**USER**',
                        value: `${user} (${user.username})`,
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Spin Cooldown Management • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                ephemeral: true 
            });

        } catch (error) {
            console.error('Error in clear-daily-spin-cooldown command:', error);
            await interaction.reply({
                content: '❌ There was an error clearing the cooldown!',
                ephemeral: true
            });
        }
    },

    cooldown: 5
};
