const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-channel')
        .setDescription('Set up a channel for payment logs and notifications')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to send payment logs to')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            
            // Check if the channel is a text channel
            if (channel.type !== 0) { // 0 = GUILD_TEXT
                return await interaction.reply({
                    content: '❌ Please select a text channel for payment logs.',
                    ephemeral: true
                });
            }

            // Check if the bot has permission to send messages in the channel
            const permissions = channel.permissionsFor(interaction.guild.members.me);
            if (!permissions.has('SendMessages') || !permissions.has('EmbedLinks')) {
                return await interaction.reply({
                    content: '❌ I need permission to send messages and embed links in that channel.',
                    ephemeral: true
                });
            }

            // Store the channel ID in the database
            const db = interaction.client.database;
            await db.setSetting('payment_log_channel', channel.id);

            // Create confirmation embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Payment Log Channel Set Up')
                .setDescription(`Payment logs will now be sent to ${channel}`)
                .addFields(
                    { name: 'Channel', value: `${channel}`, inline: true },
                    { name: 'Channel ID', value: `\`${channel.id}\``, inline: true },
                    { name: 'Set by', value: `${interaction.user}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'SEED Payment System' });

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            // Send a test message to the channel
            const testEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔔 Payment Log Channel Activated')
                .setDescription('This channel will now receive payment notifications and logs from the SEED website.')
                .addFields(
                    { name: 'Setup by', value: `${interaction.user}`, inline: true },
                    { name: 'Setup at', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'SEED Payment System' });

            await channel.send({ embeds: [testEmbed] });

        } catch (error) {
            console.error('Error in setup-channel command:', error);
            await interaction.reply({
                content: '❌ An error occurred while setting up the payment log channel.',
                ephemeral: true
            });
        }
    },
};
