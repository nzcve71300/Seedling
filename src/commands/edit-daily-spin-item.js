const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-daily-spin-item')
        .setDescription('Edit a daily spin item'),

    async execute(interaction, bot) {
        try {
            // Check if SpinService is available
            if (!bot.spinService) {
                return interaction.reply({
                    content: '❌ Spin service is not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Get all spin items grouped by server
            const allItems = await bot.spinService.database.all('SELECT * FROM spin_items ORDER BY server_nickname, display_name');
            
            if (allItems.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ No Spin Items Found')
                    .setDescription('There are no spin items to edit.\n\nUse `/add-daily-spin-item` to add items first.')
                    .setColor(0xff0000)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Spin Item Management • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Create server selection dropdown
            const servers = [...new Set(allItems.map(item => item.server_nickname))];
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('edit_spin_item_server_select')
                .setPlaceholder('Select a server to edit items...')
                .setMinValues(1)
                .setMaxValues(1);

            servers.forEach(server => {
                const serverItems = allItems.filter(item => item.server_nickname === server);
                selectMenu.addOptions({
                    label: server,
                    description: `${serverItems.length} items available`,
                    value: server
                });
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('✏️ Edit Daily Spin Item')
                .setDescription('Select a server to edit its spin items.')
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

        } catch (error) {
            console.error('Error in edit-daily-spin-item command:', error);
            await interaction.reply({
                content: '❌ There was an error loading the spin items!',
                ephemeral: true
            });
        }
    },

    cooldown: 5
};
