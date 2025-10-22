const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily-spin')
        .setDescription('Spin the daily wheel for a chance to win items!')
        .addStringOption(option =>
            option.setName('server')
                .setDescription('Select the server to spin on')
                .setRequired(true)),

    async execute(interaction, bot) {
        try {
            const serverNickname = interaction.options.getString('server');
            const userId = interaction.user.id;
            const username = interaction.user.username;

            // Check if SpinService is available
            if (!bot.spinService) {
                return interaction.reply({
                    content: '❌ Spin service is not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Check spin configuration
            const config = await bot.spinService.getSpinConfig(interaction.guild.id);
            if (!config) {
                return interaction.reply({
                    content: '❌ Spin system is not configured. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Check if user is in the correct channel
            if (interaction.channel.id !== config.command_channel_id) {
                return interaction.reply({
                    content: `❌ You can only use spin commands in <#${config.command_channel_id}>!`,
                    ephemeral: true
                });
            }

            // Check cooldown
            const cooldownCheck = await bot.spinService.checkUserCooldown(userId, serverNickname);
            if (!cooldownCheck.canSpin) {
                const hoursLeft = Math.ceil(cooldownCheck.timeLeft);
                return interaction.reply({
                    content: `⏰ You must wait ${hoursLeft} more hours before spinning again!`,
                    ephemeral: true
                });
            }

            // Get spinning GIF
            const spinningGifPath = bot.spinService.getAssetPath('spinning.gif');
            if (!spinningGifPath) {
                return interaction.reply({
                    content: '❌ Spin animation not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Create initial spinning embed
            const spinningEmbed = bot.spinService.createSpinEmbed(
                '🎰 Spinning the wheel...',
                'Good luck!',
                0x00ff00,
                spinningGifPath
            );

            const spinningAttachment = new AttachmentBuilder(spinningGifPath, { name: 'spinning.gif' });
            await interaction.reply({ 
                embeds: [spinningEmbed], 
                files: [spinningAttachment] 
            });

            // Wait 7 seconds
            await new Promise(resolve => setTimeout(resolve, 7000));

            // Perform the spin
            const spinResult = await bot.spinService.performSpin(userId, username, serverNickname, interaction.guild.id);

            let finalEmbed;
            let finalAttachment = null;

            if (spinResult.success) {
                // User won an item
                const winImagePath = bot.spinService.getAssetPath('win.png') || bot.spinService.getAssetPath('win.jpg');
                
                finalEmbed = bot.spinService.createSpinEmbed(
                    '🎉 Congratulations!',
                    `You won: **${spinResult.item.display_name}** x${spinResult.item.quantity}\n\nUse \`/daily-claim ${serverNickname}\` to claim your prize!`,
                    0x00ff00,
                    winImagePath
                );

                if (winImagePath) {
                    finalAttachment = new AttachmentBuilder(winImagePath, { name: 'win.png' });
                }

                // Log to log channel
                const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🎰 Daily Spin - Win!')
                        .setDescription(`**${username}** won **${spinResult.item.display_name}** x${spinResult.item.quantity}`)
                        .setColor(0x00ff00)
                        .addFields(
                            { name: '**Server**', value: serverNickname, inline: true },
                            { name: '**User**', value: `<@${userId}>`, inline: true },
                            { name: '**Prize**', value: `${spinResult.item.display_name} x${spinResult.item.quantity}`, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Spin System Log • Powered by Seedy' });

                    await logChannel.send({ embeds: [logEmbed] });
                }

            } else if (spinResult.error === 'failure') {
                // User failed (20% chance)
                const failImagePath = bot.spinService.getAssetPath('fail.png') || bot.spinService.getAssetPath('fail.jpg');
                
                finalEmbed = bot.spinService.createSpinEmbed(
                    '😔 Better luck next time!',
                    'You didn\'t win anything this time. Try again later!',
                    0xff6b6b,
                    failImagePath
                );

                if (failImagePath) {
                    finalAttachment = new AttachmentBuilder(failImagePath, { name: 'fail.png' });
                }

                // Log to log channel
                const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🎰 Daily Spin - Fail')
                        .setDescription(`**${username}** didn't win anything`)
                        .setColor(0xff6b6b)
                        .addFields(
                            { name: '**Server**', value: serverNickname, inline: true },
                            { name: '**User**', value: `<@${userId}>`, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Spin System Log • Powered by Seedy' });

                    await logChannel.send({ embeds: [logEmbed] });
                }

            } else {
                // Other errors
                finalEmbed = bot.spinService.createSpinEmbed(
                    '❌ Error',
                    spinResult.message || 'Something went wrong. Please try again later.',
                    0xff0000
                );
            }

            // Update the message
            const updateOptions = { embeds: [finalEmbed] };
            if (finalAttachment) {
                updateOptions.files = [finalAttachment];
            }

            await interaction.editReply(updateOptions);

        } catch (error) {
            console.error('Error in daily-spin command:', error);
            await interaction.reply({
                content: '❌ There was an error processing your spin!',
                ephemeral: true
            });
        }
    },

    cooldown: 5
};
