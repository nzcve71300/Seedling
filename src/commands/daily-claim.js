const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily-claim')
        .setDescription('Claim your daily spin prize!')
        .addStringOption(option =>
            option.setName('server')
                .setDescription('Select the server to claim on')
                .setRequired(true)
                .setAutocomplete(true)),

    async execute(interaction, bot) {
        try {
            const serverNickname = interaction.options.getString('server');

            // Check if SpinService is available
            if (!bot.spinService) {
                return interaction.reply({
                    content: '❌ Spin service is not available. Please contact an administrator.',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Check spin configuration
            const config = await bot.spinService.getSpinConfig(interaction.guild.id);
            if (!config) {
                return interaction.reply({
                    content: '❌ Spin system is not configured. Please contact an administrator.',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Check if user is in the correct channel
            if (interaction.channel.id !== config.command_channel_id) {
                return interaction.reply({
                    content: `❌ You can only use spin commands in <#${config.command_channel_id}>!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Create modal
            const modal = new ModalBuilder()
                .setCustomId(`daily_claim_modal_${serverNickname}`)
                .setTitle('Claim Your Daily Prize');

            const inGameNameInput = new TextInputBuilder()
                .setCustomId('in_game_name')
                .setLabel('In Game Name')
                .setPlaceholder('Enter your in-game name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50);

            const confirmNameInput = new TextInputBuilder()
                .setCustomId('confirm_in_game_name')
                .setLabel('Confirm In Game Name')
                .setPlaceholder('Confirm your in-game name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50);

            const firstRow = new ActionRowBuilder().addComponents(inGameNameInput);
            const secondRow = new ActionRowBuilder().addComponents(confirmNameInput);

            modal.addComponents(firstRow, secondRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error in daily-claim command:', error);
            await interaction.reply({
                content: '❌ There was an error processing your claim request!',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    cooldown: 5
};
