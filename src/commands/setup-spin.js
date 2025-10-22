const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-spin')
        .setDescription('Setup the daily spin system configuration')
        .addChannelOption(option =>
            option.setName('command_channel')
                .setDescription('Channel where users can perform spin commands')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .addChannelOption(option =>
            option.setName('log_channel')
                .setDescription('Channel where spin logs will be sent')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .addIntegerOption(option =>
            option.setName('cooldown_hours')
                .setDescription('Hours between spins (default: 24)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(168)), // Max 1 week

    async execute(interaction, bot) {
        try {
            const commandChannel = interaction.options.getChannel('command_channel');
            const logChannel = interaction.options.getChannel('log_channel');
            const cooldownHours = interaction.options.getInteger('cooldown_hours') || 24;

            // Check if SpinService is available
            if (!bot.spinService) {
                return interaction.reply({
                    content: '❌ Spin service is not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Setup spin configuration
            await bot.spinService.setupSpinConfig(
                interaction.guild.id,
                commandChannel.id,
                logChannel.id,
                cooldownHours
            );

            // Create success embed
            const embed = new EmbedBuilder()
                .setTitle('✅ Daily Spin System Setup Complete!')
                .setDescription('The daily spin system has been configured successfully.')
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '**COMMAND CHANNEL**',
                        value: `${commandChannel}`,
                        inline: false
                    },
                    {
                        name: '**LOG CHANNEL**',
                        value: `${logChannel}`,
                        inline: false
                    },
                    {
                        name: '**COOLDOWN**',
                        value: `${cooldownHours} hours`,
                        inline: false
                    },
                    {
                        name: '**NEXT STEPS**',
                        value: 'Use `/add-daily-spin-item` to add items for players to win!',
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Spin System Setup • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in setup-spin command:', error);
            await interaction.reply({
                content: '❌ There was an error setting up the spin system!',
                ephemeral: true
            });
        }
    },

    cooldown: 5
};
