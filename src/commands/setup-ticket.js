const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('Set up the ticket system')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the ticket panel to')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Admin role that can view and manage tickets')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('heading')
                .setDescription('Ticket panel heading')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Ticket panel description')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('mod_role')
                .setDescription('Moderator role that can view and help with tickets')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const bot = global.seedyBot;
        if (!bot || !bot.ticketService) {
            return await interaction.reply({
                content: '❌ Ticket service not available.',
                ephemeral: true
            });
        }

        try {
            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('role');
            const modRole = interaction.options.getRole('mod_role');
            const heading = interaction.options.getString('heading');
            const description = interaction.options.getString('description');

            await interaction.deferReply({ ephemeral: true });

            // Create ticket panel
            const panel = await bot.ticketService.createTicketPanel(
                interaction.guild.id,
                channel.id,
                role.id,
                modRole?.id || null,
                heading,
                description
            );

            await interaction.editReply({
                content: `✅ Ticket panel created successfully in ${channel}!\n\n` +
                        `**Admin Role:** ${role}\n` +
                        `**Moderator Role:** ${modRole || 'None'}\n` +
                        `**Heading:** ${heading}\n\n` +
                        `Users can now create tickets by clicking the buttons in ${channel}.`
            });

        } catch (error) {
            console.error('Error in setup-ticket command:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ An error occurred while setting up the ticket system.'
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while setting up the ticket system.',
                    ephemeral: true
                });
            }
        }
    },
};

