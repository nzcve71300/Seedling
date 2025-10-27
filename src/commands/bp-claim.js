const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { rconCommand } = require('../services/RCONService');
const { getUserBattlePass, claimBattlePassReward, getBattlePassItemsForTier } = require('../services/battlePassService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bp-claim')
        .setDescription('Claim your Battle Pass rewards')
        .addStringOption(option =>
            option.setName('server')
                .setDescription('Select the server to claim rewards on')
                .setRequired(true)
                .addChoices(
                    { name: 'Main Server', value: 'main' },
                    { name: 'EU Server', value: 'eu' },
                    { name: 'US Server', value: 'us' }
                )
        ),

    async execute(interaction) {
        try {
            const server = interaction.options.getString('server');
            const userId = interaction.user.id;

            // Get user's battle pass data
            const userBattlePass = await getUserBattlePass(userId);
            
            if (!userBattlePass) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('❌ No Battle Pass Found')
                    .setDescription('You don\'t have a Battle Pass. Visit the website to get started!')
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Check if user has any claimable rewards
            const claimableTiers = [];
            for (let tier = 1; tier <= userBattlePass.currentTier; tier++) {
                const requiredXp = tier * 100;
                const isUnlocked = userBattlePass.currentXp >= requiredXp;
                const isClaimed = userBattlePass.claimedTiers.includes(tier);
                const hasSubscription = userBattlePass.isSubscribed;
                
                if (isUnlocked && !isClaimed && (tier === 1 || hasSubscription)) {
                    claimableTiers.push(tier);
                }
            }

            if (claimableTiers.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🔒 No Rewards Available')
                    .setDescription('You don\'t have any claimable rewards at the moment. Keep playing to unlock more tiers!')
                    .addFields(
                        { name: 'Current Tier', value: `${userBattlePass.currentTier}`, inline: true },
                        { name: 'Current XP', value: `${userBattlePass.currentXp}`, inline: true },
                        { name: 'Next Tier XP', value: `${(userBattlePass.currentTier + 1) * 100}`, inline: true }
                    )
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Create modal for in-game name input
            const modal = new ModalBuilder()
                .setCustomId(`bp-claim-modal-${server}-${claimableTiers.join(',')}`)
                .setTitle('Claim Battle Pass Rewards');

            const inGameNameInput = new TextInputBuilder()
                .setCustomId('inGameName')
                .setLabel('Enter your in-game name')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Your exact in-game name')
                .setRequired(true)
                .setMaxLength(32);

            const actionRow = new ActionRowBuilder().addComponents(inGameNameInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error in bp-claim command:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your request. Please try again later.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async handleModalSubmit(interaction) {
        try {
            const customId = interaction.customId;
            const [_, __, server, tiersString] = customId.split('-');
            const claimableTiers = tiersString.split(',').map(Number);
            const inGameName = interaction.fields.getTextInputValue('inGameName');

            const userId = interaction.user.id;

            // Get user's battle pass data again to ensure it's current
            const userBattlePass = await getUserBattlePass(userId);
            
            if (!userBattlePass) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('❌ No Battle Pass Found')
                    .setDescription('You don\'t have a Battle Pass. Visit the website to get started!')
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Verify tiers are still claimable
            const validTiers = [];
            for (const tier of claimableTiers) {
                const requiredXp = tier * 100;
                const isUnlocked = userBattlePass.currentXp >= requiredXp;
                const isClaimed = userBattlePass.claimedTiers.includes(tier);
                const hasSubscription = userBattlePass.isSubscribed;
                
                if (isUnlocked && !isClaimed && (tier === 1 || hasSubscription)) {
                    validTiers.push(tier);
                }
            }

            if (validTiers.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🔒 No Valid Rewards')
                    .setDescription('The selected rewards are no longer claimable. Please try again.')
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Get server RCON details
            const serverConfig = getServerConfig(server);
            if (!serverConfig) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('❌ Server Error')
                    .setDescription('The selected server is not available. Please try a different server.')
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Claim rewards for each valid tier
            const claimedItems = [];
            const failedItems = [];

            for (const tier of validTiers) {
                try {
                    const success = await claimBattlePassReward(userId, tier, server);
                    if (success) {
                        // Get items for this tier
                        const tierItems = await getBattlePassItemsForTier(tier);
                        claimedItems.push(...tierItems);
                    } else {
                        failedItems.push(`Tier ${tier}`);
                    }
                } catch (error) {
                    console.error(`Error claiming tier ${tier}:`, error);
                    failedItems.push(`Tier ${tier}`);
                }
            }

            // Execute RCON commands for claimed items
            const rconCommands = [];
            for (const item of claimedItems) {
                const command = `inventory.giveto "${inGameName}" "${item.shortName}" ${item.quantity}`;
                rconCommands.push(command);
            }

            // Execute all RCON commands
            let rconSuccess = true;
            for (const command of rconCommands) {
                try {
                    await rconCommand(serverConfig, command);
                } catch (error) {
                    console.error('RCON command failed:', error);
                    rconSuccess = false;
                }
            }

            // Send in-game message
            if (rconSuccess && claimedItems.length > 0) {
                const inGameMessage = `say {${inGameName}} Claimed their BattlePass reward!`;
                try {
                    await rconCommand(serverConfig, inGameMessage);
                } catch (error) {
                    console.error('Failed to send in-game message:', error);
                }
            }

            // Create response embed
            const embed = new EmbedBuilder()
                .setColor(rconSuccess ? '#4CAF50' : '#FFA500')
                .setTitle(rconSuccess ? '✅ Rewards Claimed!' : '⚠️ Partial Success')
                .setDescription(`Battle Pass rewards have been ${rconSuccess ? 'successfully' : 'partially'} claimed for **${inGameName}** on **${serverConfig.name}**`)
                .addFields(
                    { name: 'Claimed Items', value: claimedItems.length > 0 ? claimedItems.map(item => `• ${item.displayName} x${item.quantity}`).join('\n') : 'None', inline: false },
                    { name: 'Failed Tiers', value: failedItems.length > 0 ? failedItems.join(', ') : 'None', inline: false }
                )
                .setTimestamp();

            if (rconSuccess) {
                embed.setFooter({ text: 'Check your inventory in-game!' });
            } else {
                embed.setFooter({ text: 'Some items may not have been delivered. Contact support if needed.' });
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in bp-claim modal submit:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Error')
                .setDescription('An error occurred while claiming your rewards. Please try again later.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};

// Helper function to get server configuration
function getServerConfig(server) {
    const servers = {
        'main': {
            name: 'Main Server',
            rcon_ip: process.env.MAIN_RCON_IP,
            rcon_port: process.env.MAIN_RCON_PORT,
            rcon_password: process.env.MAIN_RCON_PASSWORD
        },
        'eu': {
            name: 'EU Server',
            rcon_ip: process.env.EU_RCON_IP,
            rcon_port: process.env.EU_RCON_PORT,
            rcon_password: process.env.EU_RCON_PASSWORD
        },
        'us': {
            name: 'US Server',
            rcon_ip: process.env.US_RCON_IP,
            rcon_port: process.env.US_RCON_PORT,
            rcon_password: process.env.US_RCON_PASSWORD
        }
    };

    return servers[server];
}

