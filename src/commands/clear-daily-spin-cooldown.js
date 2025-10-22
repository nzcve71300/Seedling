const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear-daily-spin-cooldown')
        .setDescription('Clear a user\'s daily spin/claim cooldown')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to clear cooldown for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('server')
                .setDescription('Server to clear cooldown on (leave empty for all servers)')
                .setRequired(false)
                .setAutocomplete(true)),

    async execute(interaction, bot) {
        try {
            const user = interaction.options.getUser('user');
            const serverNickname = interaction.options.getString('server');

            // Check if SpinService is available
            if (!bot.spinService) {
                return interaction.reply({
                    content: '❌ Spin service is not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            if (serverNickname) {
                // Clear cooldown for specific server
                await bot.spinService.clearUserCooldown(user.id, serverNickname);

                const embed = new EmbedBuilder()
                    .setTitle('✅ Cooldown Cleared!')
                    .setDescription(`Cleared daily spin/claim cooldown for **${user.username}** on server **${serverNickname}**.`)
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '**USER**',
                            value: `${user} (${user.username})`,
                            inline: false
                        },
                        {
                            name: '**SERVER**',
                            value: serverNickname,
                            inline: false
                        }
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Spin Cooldown Management • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                await interaction.reply({ embeds: [embed] });

            } else {
                // Clear cooldown for all servers
                const allCooldowns = await bot.spinService.database.all(
                    'SELECT DISTINCT server_nickname FROM user_spin_cooldowns WHERE user_id = ?',
                    [user.id]
                );

                let clearedCount = 0;
                for (const cooldown of allCooldowns) {
                    await bot.spinService.clearUserCooldown(user.id, cooldown.server_nickname);
                    clearedCount++;
                }

                const embed = new EmbedBuilder()
                    .setTitle('✅ All Cooldowns Cleared!')
                    .setDescription(`Cleared daily spin/claim cooldowns for **${user.username}** on all servers.`)
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '**USER**',
                            value: `${user} (${user.username})`,
                            inline: false
                        },
                        {
                            name: '**SERVERS CLEARED**',
                            value: clearedCount.toString(),
                            inline: false
                        }
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Spin Cooldown Management • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in clear-daily-spin-cooldown command:', error);
            await interaction.reply({
                content: '❌ There was an error clearing the cooldown!',
                ephemeral: true
            });
        }
    },

    cooldown: 5
};
