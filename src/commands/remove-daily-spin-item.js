const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-daily-spin-item')
        .setDescription('Remove a daily spin item')
        .addStringOption(option =>
            option.setName('server')
                .setDescription('Server nickname to remove items from')
                .setRequired(true)
                .setAutocomplete(true)),

    async execute(interaction, bot) {
        try {
            const serverNickname = interaction.options.getString('server');

            // Check if SpinService is available
            if (!bot.spinService) {
                return interaction.reply({
                    content: '❌ Spin service is not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Get spin items for the server
            const items = await bot.spinService.getSpinItems(serverNickname);
            
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

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Create item selection dropdown
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
