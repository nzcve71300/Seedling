const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-daily-spin-item')
        .setDescription('Add an item to the daily spin pool')
        .addStringOption(option =>
            option.setName('display_name')
                .setDescription('Display name of the item (e.g., Assault Rifle)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('short_name')
                .setDescription('Short name of the item (e.g., rifle.ak)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Quantity to give (default: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1000)),

    async execute(interaction, bot) {
        try {
            const displayName = interaction.options.getString('display_name');
            const shortName = interaction.options.getString('short_name');
            const quantity = interaction.options.getInteger('quantity') || 1;

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
                .setCustomId(`add_spin_item_server_select_${displayName}_${shortName}_${quantity}`)
                .setPlaceholder('Select a server to add the item to...')
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
                .setTitle('➕ Add Daily Spin Item')
                .setDescription(`Select a server to add **${displayName}** to.`)
                .setColor(0x4ecdc4)
                .addFields(
                    {
                        name: '**ITEM DETAILS**',
                        value: `**Display Name:** ${displayName}\n**Short Name:** ${shortName}\n**Quantity:** ${quantity}`,
                        inline: false
                    }
                )
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
            console.error('Error in add-daily-spin-item command:', error);
            await interaction.reply({
                content: '❌ There was an error adding the spin item!',
                ephemeral: true
            });
        }
    },

    cooldown: 5
};
