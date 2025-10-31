const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chan-set')
        .setDescription('Set a channel for specific bot functions')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to configure')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('channel_type')
                .setDescription('What this channel will be used for')
                .setRequired(true)
                .addChoices(
                    { name: 'Ticket Transcripts', value: 'ticket_transcripts' },
                    { name: 'Payment Logs', value: 'payment_logs' },
                    { name: 'Audit Logs', value: 'audit_logs' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const bot = global.seedyBot;
        if (!bot || !bot.ticketService) {
            return await interaction.reply({
                content: '❌ Ticket service not available.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const channel = interaction.options.getChannel('channel');
            const channelType = interaction.options.getString('channel_type');

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // Set channel setting
            await bot.ticketService.setChannelSetting(
                interaction.guild.id,
                channelType,
                channel.id
            );

            const typeNames = {
                'ticket_transcripts': '📜 Ticket Transcripts',
                'payment_logs': '💰 Payment Logs',
                'audit_logs': '📋 Audit Logs'
            };

            await interaction.editReply({
                content: `✅ Channel configured successfully!\n\n` +
                        `**Channel:** ${channel}\n` +
                        `**Type:** ${typeNames[channelType]}\n\n` +
                        `This channel will now receive ${typeNames[channelType].toLowerCase()}.`
            });

        } catch (error) {
            console.error('Error in chan-set command:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ An error occurred while configuring the channel.'
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while configuring the channel.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    },
};

