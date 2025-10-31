const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily seed reward'),

    async execute(interaction, bot) {
        try {
            const result = await bot.economy.dailyReward(interaction.user.id, interaction.user.username);

            if (!result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('⏰ Daily Reward')
                    .setDescription(`You've already claimed your daily reward! Come back in ${result.hoursLeft} hours.`)
                    .setColor(0xff0000)
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setTitle('🌱 Daily Reward Claimed!')
                .setDescription(`You received ${bot.economy.formatCurrency(result.reward)}!\nStreak: ${result.streak} days`)
                .setColor(0x00ff00)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Daily command error:', error);
            await interaction.reply({
                content: '❌ Error claiming daily reward. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    cooldown: 5
};
