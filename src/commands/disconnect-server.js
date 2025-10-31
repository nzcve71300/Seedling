const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('disconnect-server')
        .setDescription('Remove a server connection from the database'),

    async execute(interaction, bot) {
        try {
            // Check if RCEManagerService is available
            if (!bot.rceManager) {
                return interaction.reply({
                    content: '❌ RCE Manager service is not available. Please contact an administrator.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const connections = await bot.rceManager.getAllServerConnections();

            if (connections.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ No Server Connections Found')
                    .setDescription('There are no server connections in the database to remove.\n\nUse `/connect-server` to add server connections first.')
                    .setColor(0xff0000)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Server Connection Management • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            // Create server connection selection dropdown
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('disconnect_server_select')
                .setPlaceholder('Select a server connection to remove...')
                .setMinValues(1)
                .setMaxValues(1);

            connections.forEach(connection => {
                const statusEmoji = connection.status === 'connected' ? '🟢' : 
                                   connection.status === 'disconnected' ? '🔴' : '🟡';
                
                selectMenu.addOptions({
                    label: connection.nickname,
                    description: `${statusEmoji} ${connection.server_ip}:${connection.rcon_port}`,
                    value: connection.nickname
                });
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Remove Server Connection')
                .setDescription('Select a server connection from the dropdown below to remove it from the database.\n\n⚠️ **This action cannot be undone!**')
                .setColor(0xff6b6b)
                .setTimestamp()
                .setFooter({ 
                    text: 'Server Connection Management • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error('Error in disconnect-server command:', error);
            await interaction.reply({
                content: '❌ There was an error loading the server connections list!',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    cooldown: 5
};
