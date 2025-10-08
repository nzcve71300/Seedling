const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('g-create')
        .setDescription('Create a new giveaway')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Create modal for giveaway details
        const modal = new ModalBuilder()
            .setCustomId('giveaway_create_modal')
            .setTitle('Create New Giveaway');

        // Giveaway name input
        const nameInput = new TextInputBuilder()
            .setCustomId('giveaway_name')
            .setLabel('Giveaway Name')
            .setPlaceholder('e.g. Elite Kit Giveaway')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        // Description input
        const descriptionInput = new TextInputBuilder()
            .setCustomId('giveaway_description')
            .setLabel('Description')
            .setPlaceholder('What are you giving away?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);

        // Max winners input
        const winnersInput = new TextInputBuilder()
            .setCustomId('giveaway_max_winners')
            .setLabel('Max Winners')
            .setPlaceholder('e.g. 1, 2, 5')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(3);

        // Time input
        const timeInput = new TextInputBuilder()
            .setCustomId('giveaway_time')
            .setLabel('Time')
            .setPlaceholder('e.g. 1m, 1h, 1d (m=minutes, h=hours, d=days)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(10);

        // Add inputs to modal
        const firstRow = new ActionRowBuilder().addComponents(nameInput);
        const secondRow = new ActionRowBuilder().addComponents(descriptionInput);
        const thirdRow = new ActionRowBuilder().addComponents(winnersInput);
        const fourthRow = new ActionRowBuilder().addComponents(timeInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

        // Show modal to user
        await interaction.showModal(modal);
    },
};

