const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-daily-spin-item')
        .setDescription('Add an item to the daily spin pool')
        .addStringOption(option =>
            option.setName('server')
                .setDescription('Server nickname to add the item to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('display_name')
                .setDescription('Display name of the item (e.g., Assault Rifle)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('short_name')
                .setDescription('Short name of the item (e.g., rifle.ak)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Quantity to give (default: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1000)),

    async execute(interaction, bot) {
        try {
            const serverNickname = interaction.options.getString('server');
            const displayName = interaction.options.getString('display_name');
            const shortName = interaction.options.getString('short_name');
            const quantity = interaction.options.getInteger('quantity') || 1;

            // Check if SpinService is available
            if (!bot.spinService) {
                return interaction.reply({
                    content: '❌ Spin service is not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Check if server connection exists
            if (!bot.rceManager || !bot.rceManager.getServerConnection(serverNickname)) {
                return interaction.reply({
                    content: `❌ Server connection "${serverNickname}" not found. Use \`/connect-server\` first.`,
                    ephemeral: true
                });
            }

            // Add the spin item
            const item = await bot.spinService.addSpinItem(serverNickname, displayName, shortName, quantity);

            // Create success embed
            const embed = new EmbedBuilder()
                .setTitle('✅ Daily Spin Item Added!')
                .setDescription(`**${displayName}** has been added to the daily spin pool.`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '**SERVER**',
                        value: serverNickname,
                        inline: false
                    },
                    {
                        name: '**DISPLAY NAME**',
                        value: displayName,
                        inline: false
                    },
                    {
                        name: '**SHORT NAME**',
                        value: shortName,
                        inline: false
                    },
                    {
                        name: '**QUANTITY**',
                        value: quantity.toString(),
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Spin Item Management • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in add-daily-spin-item command:', error);
            await interaction.reply({
                content: '❌ There was an error adding the spin item!',
                ephemeral: true
            });
        }
    },

    cooldown: 5
};
