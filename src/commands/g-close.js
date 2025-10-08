const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('g-close')
        .setDescription('Close an active giveaway early')
        .addStringOption(option =>
            option.setName('giveaway_name')
                .setDescription('Name of the giveaway to close')
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
            const giveaways = await bot.giveawayService.getActiveGiveaways();
            
            const filtered = giveaways
                .filter(g => g.giveaway_name.toLowerCase().includes(focusedValue))
                .slice(0, 25)
                .map(g => ({
                    name: `${g.giveaway_name} (ID: ${g.id})`,
                    value: g.id.toString()
                }));

            await interaction.respond(filtered);
        } catch (error) {
            console.error('Error in g-close autocomplete:', error);
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

            // Close the giveaway
            await bot.giveawayService.closeGiveaway(giveawayId);

            await interaction.editReply({
                content: `✅ Giveaway closed successfully! Winners have been announced.`
            });

        } catch (error) {
            console.error('Error in g-close command:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ An error occurred while closing the giveaway.'
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while closing the giveaway.',
                    flags: 64
                });
            }
        }
    },
};

