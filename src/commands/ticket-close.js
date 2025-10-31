const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-close')
        .setDescription('Close the current ticket'),

    async execute(interaction) {
        const bot = global.seedyBot;
        if (!bot || !bot.ticketService) {
            return await interaction.reply({
                content: '❌ Ticket service not available.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            // Check if this is a ticket channel
            const [tickets] = await bot.database.pool.execute(
                'SELECT * FROM tickets WHERE channel_id = ? AND status = ?',
                [interaction.channel.id, 'open']
            );

            if (tickets.length === 0) {
                return await interaction.reply({
                    content: '❌ This is not an active ticket channel.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const ticket = tickets[0];

            await interaction.reply({
                content: '🔒 Closing ticket...',
                flags: MessageFlags.Ephemeral
            });

            // Close the ticket
            await bot.ticketService.closeTicket(ticket.id, interaction.user.id);

        } catch (error) {
            console.error('Error in ticket-close command:', error);
            await interaction.reply({
                content: '❌ An error occurred while closing the ticket.',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        }
    },
};

