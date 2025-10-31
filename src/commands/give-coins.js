const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give-coins')
        .setDescription('Give coins to a user (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to give coins to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of coins to give')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1000000))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for giving coins')
                .setRequired(false)),

    async execute(interaction, bot) {
        try {
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const reason = interaction.options.getString('reason') || 'Admin gift';

            // Check if user has SeedyAdmin role
            if (!bot.hasSeedyAdminRole(interaction.member)) {
                return interaction.reply({
                    content: '❌ You need the **SeedyAdmin** role to use this command!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Get current balance
            const currentBalance = await bot.economy.getBalance(targetUser.id);
            const newBalance = await bot.economy.addMoney(
                targetUser.id, 
                amount, 
                `Admin gift from ${interaction.user.tag}: ${reason}`,
                targetUser.username
            );

            // Create success embed
            const embed = new EmbedBuilder()
                .setTitle('💰 Coins Given Successfully!')
                .setDescription(`**${targetUser.tag}** has received **${bot.economy.formatCurrency(amount)}**!`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '**RECIPIENT**',
                        value: `${targetUser.tag} (${targetUser.id})`,
                        inline: true
                    },
                    {
                        name: '**AMOUNT GIVEN**',
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
                        name: '**GIVEN BY**',
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
            console.error('Error in give-coins command:', error);
            await interaction.reply({
                content: '❌ There was an error giving coins!',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    cooldown: 5
};
