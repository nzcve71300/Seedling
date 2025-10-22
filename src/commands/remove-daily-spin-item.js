const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-daily-spin-item')
        .setDescription('Remove a daily spin item')
        .addStringOption(option =>
            option.setName('server')
                .setDescription('Server nickname to remove items from')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item to remove')
                .setRequired(true)
                .setAutocomplete(true)),

    async execute(interaction, bot) {
        try {
            const serverNickname = interaction.options.getString('server');
            const itemId = interaction.options.getString('item');

            // Check if SpinService is available
            if (!bot.spinService) {
                return interaction.reply({
                    content: '❌ Spin service is not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Get the item details
            const item = await bot.spinService.database.get('SELECT * FROM spin_items WHERE id = ? AND server_nickname = ?', [itemId, serverNickname]);
            
            if (!item) {
                return interaction.reply({
                    content: '❌ Item not found on the specified server.',
                    ephemeral: true
                });
            }

            // Remove the spin item
            await bot.spinService.removeSpinItem(itemId);

            const embed = new EmbedBuilder()
                .setTitle('✅ Spin Item Removed!')
                .setDescription(`**${item.display_name}** has been removed from the daily spin pool.`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '**SERVER**',
                        value: serverNickname,
                        inline: false
                    },
                    {
                        name: '**REMOVED ITEM**',
                        value: `${item.display_name} (${item.short_name} x${item.quantity})`,
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Spin Item Management • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.reply({ embeds: [embed] });

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
