const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-daily-spin-item')
        .setDescription('Edit a daily spin item')
        .addStringOption(option =>
            option.setName('server')
                .setDescription('Server nickname to edit items on')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item to edit')
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
                    flags: MessageFlags.Ephemeral
                });
            }

            // Get the item details
            const item = await bot.spinService.database.get('SELECT * FROM spin_items WHERE id = ? AND server_nickname = ?', [itemId, serverNickname]);
            
            if (!item) {
                return interaction.reply({
                    content: '❌ Item not found on the specified server.',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Create modal for editing
            const modal = new ModalBuilder()
                .setCustomId(`edit_spin_item_modal_${itemId}`)
                .setTitle('Edit Daily Spin Item');

            const displayNameInput = new TextInputBuilder()
                .setCustomId('display_name')
                .setLabel('Display Name')
                .setPlaceholder('Enter the display name (e.g., Assault Rifle)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100)
                .setValue(item.display_name);

            const shortNameInput = new TextInputBuilder()
                .setCustomId('short_name')
                .setLabel('Short Name')
                .setPlaceholder('Enter the short name (e.g., rifle.ak)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100)
                .setValue(item.short_name);

            const quantityInput = new TextInputBuilder()
                .setCustomId('quantity')
                .setLabel('Quantity')
                .setPlaceholder('Enter the quantity (1-1000)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(4)
                .setValue(item.quantity.toString());

            const firstRow = new ActionRowBuilder().addComponents(displayNameInput);
            const secondRow = new ActionRowBuilder().addComponents(shortNameInput);
            const thirdRow = new ActionRowBuilder().addComponents(quantityInput);

            modal.addComponents(firstRow, secondRow, thirdRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error in edit-daily-spin-item command:', error);
            await interaction.reply({
                content: '❌ There was an error loading the spin items!',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    cooldown: 5
};
