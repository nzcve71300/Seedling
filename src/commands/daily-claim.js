const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily-claim')
        .setDescription('Claim your daily spin prize!'),

    async execute(interaction, bot) {
        try {
            // Check if SpinService is available
            if (!bot.spinService) {
                return interaction.reply({
                    content: '❌ Spin service is not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Check spin configuration
            const config = await bot.spinService.getSpinConfig(interaction.guild.id);
            if (!config) {
                return interaction.reply({
                    content: '❌ Spin system is not configured. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Check if user is in the correct channel
            if (interaction.channel.id !== config.command_channel_id) {
                return interaction.reply({
                    content: `❌ You can only use spin commands in <#${config.command_channel_id}>!`,
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
                .setCustomId('daily_claim_server_select')
                .setPlaceholder('Select a server to claim on...')
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
                .setTitle('🎁 Daily Claim')
                .setDescription('Select a server to claim your prize!')
                .setColor(0x4ecdc4)
                .setTimestamp()
                .setFooter({ 
                    text: 'Daily Claim System • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                ephemeral: true 
            });

        } catch (error) {
            console.error('Error in daily-claim command:', error);
            await interaction.reply({
                content: '❌ There was an error processing your claim request!',
                ephemeral: true
            });
        }
    },

    cooldown: 5
};
