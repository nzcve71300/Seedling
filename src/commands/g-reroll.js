const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('g-reroll')
        .setDescription('Reroll winners for a giveaway')
        .addStringOption(option =>
            option.setName('giveaway_name')
                .setDescription('Name of the giveaway to reroll')
                .setRequired(true)
                .setAutocomplete(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async autocomplete(interaction) {
        const bot = global.seedyBot;
        if (!bot || !bot.giveawayService) {
            await interaction.respond([]);
            return;
        }

        try {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            // Get all giveaways (including ended ones for reroll)
            const [giveaways] = await bot.database.pool.execute(
                'SELECT * FROM giveaways WHERE status = "ended" ORDER BY end_time DESC LIMIT 50'
            );
            
            const filtered = giveaways
                .filter(g => g.giveaway_name.toLowerCase().includes(focusedValue))
                .slice(0, 25)
                .map(g => ({
                    name: `${g.giveaway_name} (ID: ${g.id})`,
                    value: g.id.toString()
                }));

            await interaction.respond(filtered);
        } catch (error) {
            console.error('Error in g-reroll autocomplete:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const bot = global.seedyBot;
        if (!bot || !bot.giveawayService) {
            return await interaction.reply({
                content: '❌ Giveaway service not available.',
                flags: 64
            });
        }

        try {
            const giveawayId = parseInt(interaction.options.getString('giveaway_name'));

            await interaction.deferReply({ flags: 64 });

            // Reroll the giveaway
            const result = await bot.giveawayService.rerollGiveaway(giveawayId);

            if (result.success) {
                await interaction.editReply({
                    content: `✅ Giveaway rerolled successfully! New winners have been announced.`
                });
            } else {
                await interaction.editReply({
                    content: `❌ ${result.message}`
                });
            }

        } catch (error) {
            console.error('Error in g-reroll command:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ An error occurred while rerolling the giveaway.'
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while rerolling the giveaway.',
                    flags: 64
                });
            }
        }
    },
};

