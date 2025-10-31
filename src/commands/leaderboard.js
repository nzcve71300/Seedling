const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top players by seed balance'),

    async execute(interaction, bot) {
        const leaderboard = await bot.economy.getLeaderboard(10);

        if (leaderboard.length === 0) {
            return await interaction.reply({
                content: '📊 No players found on the leaderboard yet!',
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 Seed Leaderboard')
            .setDescription('Top players by seed balance')
            .setColor(0xffd700)
            .setTimestamp();

        let description = '';
        for (let i = 0; i < leaderboard.length; i++) {
            const player = leaderboard[i];
            const position = i + 1;
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
            
            description += `${medal} <@${player.user_id}> - ${bot.economy.formatCurrency(player.balance)}\n`;
        }

        embed.setDescription(description);

        await interaction.reply({ embeds: [embed] });
    },

    cooldown: 10
};
