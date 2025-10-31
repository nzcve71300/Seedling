const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your seed balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check balance for (optional)')
                .setRequired(false)),

    async execute(interaction, bot) {
        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const balance = await bot.economy.getBalance(targetUser.id);

            const embed = new EmbedBuilder()
                .setTitle('🌱 Balance')
                .setDescription(`${targetUser}'s balance: ${bot.economy.formatCurrency(balance)}`)
                .setColor(0x00ff00)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Balance command error:', error);
            await interaction.reply({
                content: '❌ Error checking balance. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    cooldown: 3
};
