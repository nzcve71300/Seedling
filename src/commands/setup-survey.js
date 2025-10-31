const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-survey')
        .setDescription('Set up the survey response channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel where survey responses will be sent')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, bot) {
        const channel = interaction.options.getChannel('channel');

        if (!channel.isTextBased()) {
            return await interaction.reply({
                content: '❌ Please select a text channel.',
                flags: MessageFlags.Ephemeral
            });
        }

        await bot.surveyManager.setSurveyChannel(interaction.guild.id, channel.id);

        const embed = new EmbedBuilder()
            .setTitle('✅ Survey Channel Configured')
            .setDescription(`Survey responses will now be sent to ${channel}`)
            .setColor(0x006400)
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    },

    cooldown: 5
};
