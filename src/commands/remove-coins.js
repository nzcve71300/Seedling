const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-coins')
        .setDescription('Remove coins from a user (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remove coins from')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of coins to remove')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1000000))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for removing coins')
                .setRequired(false)),

    async execute(interaction, bot) {
        try {
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const reason = interaction.options.getString('reason') || 'Admin penalty';

            // Check if user has SeedyAdmin role
            if (!bot.hasSeedyAdminRole(interaction.member)) {
                return interaction.reply({
                    content: '❌ You need the **SeedyAdmin** role to use this command!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Check if user has enough coins
            const currentBalance = await bot.economy.getBalance(targetUser.id);
            if (currentBalance < amount) {
                return interaction.reply({
                    content: `❌ **${targetUser.tag}** only has **${bot.economy.formatCurrency(currentBalance)}** but you're trying to remove **${bot.economy.formatCurrency(amount)}**!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const newBalance = await bot.economy.removeMoney(
                targetUser.id, 
                amount, 
                `Admin removal by ${interaction.user.tag}: ${reason}`
            );

            // Create success embed
            const embed = new EmbedBuilder()
                .setTitle('💸 Coins Removed Successfully!')
                .setDescription(`**${amount}** coins have been removed from **${targetUser.tag}**!`)
                .setColor(0xff6b6b)
                .addFields(
                    {
                        name: '**USER**',
                        value: `${targetUser.tag} (${targetUser.id})`,
                        inline: true
                    },
                    {
                        name: '**AMOUNT REMOVED**',
                        value: bot.economy.formatCurrency(amount),
                        inline: true
                    },
                    {
                        name: '**NEW BALANCE**',
                        value: bot.economy.formatCurrency(newBalance),
                        inline: true
                    },
                    {
                        name: '**REASON**',
                        value: reason,
                        inline: false
                    },
                    {
                        name: '**REMOVED BY**',
                        value: interaction.user.tag,
                        inline: true
                    }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp()
                .setFooter({ 
                    text: 'Admin Economy Management • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in remove-coins command:', error);
            await interaction.reply({
                content: '❌ There was an error removing coins!',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    cooldown: 5
};
