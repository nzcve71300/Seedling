const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-daily-spin-item')
        .setDescription('Remove a daily spin item'),

    async execute(interaction, bot) {
        try {
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
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('remove_spin_item_server_select')
                .setPlaceholder('Select a server to remove items from...')
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
                .setTitle('🗑️ Remove Daily Spin Item')
                .setDescription('Select a server to remove items from.')
                .setColor(0xff6b6b)
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

        } catch (error) {
            console.error('Error in remove-daily-spin-item command:', error);
            await interaction.reply({
                content: '❌ There was an error loading the spin items!',
                ephemeral: true
            });
        }
    },

    cooldown: 5
};
