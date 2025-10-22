const { EmbedBuilder } = require('discord.js');

class DiscordNotificationService {
    constructor(client) {
        this.client = client;
    }

    async sendPaymentLog(paymentData) {
        try {
            // Get the payment log channel from database
            const channelId = await this.client.database.getSetting('payment_log_channel');
            
            if (!channelId) {
                console.log('⚠️ No payment log channel configured');
                return false;
            }

            const channel = this.client.channels.cache.get(channelId);
            if (!channel) {
                console.error('❌ Payment log channel not found:', channelId);
                return false;
            }

            // Create payment log embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('💰 Payment Received')
                .setDescription('A new payment has been processed successfully!')
                .addFields(
                    { name: '👤 Customer', value: `<@${paymentData.userId}>`, inline: true },
                    { name: '💳 Amount', value: `$${paymentData.amount}`, inline: true },
                    { name: '🛒 Items', value: paymentData.items.length.toString(), inline: true },
                    { name: '📦 Kit(s)', value: paymentData.items.map(item => `• ${item.name}`).join('\n'), inline: false },
                    { name: '🎭 Role(s)', value: paymentData.roles.map(role => `• ${role}`).join('\n'), inline: false },
                    { name: '🖥️ Server', value: paymentData.serverName || 'Unknown', inline: true },
                    { name: '🆔 Session ID', value: `\`${paymentData.sessionId}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'SEED Payment System' });

            // Add thumbnail if available
            if (paymentData.items.length > 0 && paymentData.items[0].image) {
                embed.setThumbnail(paymentData.items[0].image);
            }

            await channel.send({ embeds: [embed] });
            console.log('✅ Payment log sent to Discord channel');
            return true;

        } catch (error) {
            console.error('❌ Error sending payment log to Discord:', error);
            return false;
        }
    }

    async sendSubscriptionLog(subscriptionData) {
        try {
            // Get the payment log channel from database
            const channelId = await this.client.database.getSetting('payment_log_channel');
            
            if (!channelId) {
                console.log('⚠️ No payment log channel configured');
                return false;
            }

            const channel = this.client.channels.cache.get(channelId);
            if (!channel) {
                console.error('❌ Payment log channel not found:', channelId);
                return false;
            }

            // Create subscription log embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔄 Subscription Payment')
                .setDescription('A subscription payment has been processed!')
                .addFields(
                    { name: '👤 Customer', value: `<@${subscriptionData.userId}>`, inline: true },
                    { name: '💳 Amount', value: `$${subscriptionData.amount}`, inline: true },
                    { name: '📦 Kit(s)', value: subscriptionData.items.map(item => `• ${item.name}`).join('\n'), inline: false },
                    { name: '🎭 Role(s)', value: subscriptionData.roles.map(role => `• ${role}`).join('\n'), inline: false },
                    { name: '🖥️ Server', value: subscriptionData.serverName || 'Unknown', inline: true },
                    { name: '🆔 Subscription ID', value: `\`${subscriptionData.subscriptionId}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'SEED Payment System' });

            // Add thumbnail if available
            if (subscriptionData.items.length > 0 && subscriptionData.items[0].image) {
                embed.setThumbnail(subscriptionData.items[0].image);
            }

            await channel.send({ embeds: [embed] });
            console.log('✅ Subscription log sent to Discord channel');
            return true;

        } catch (error) {
            console.error('❌ Error sending subscription log to Discord:', error);
            return false;
        }
    }

    async sendPaymentFailedLog(failedPaymentData) {
        try {
            // Get the payment log channel from database
            const channelId = await this.client.database.getSetting('payment_log_channel');
            
            if (!channelId) {
                console.log('⚠️ No payment log channel configured');
                return false;
            }

            const channel = this.client.channels.cache.get(channelId);
            if (!channel) {
                console.error('❌ Payment log channel not found:', channelId);
                return false;
            }

            // Create failed payment log embed
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Payment Failed')
                .setDescription('A payment has failed or been cancelled.')
                .addFields(
                    { name: '👤 Customer', value: `<@${failedPaymentData.userId}>`, inline: true },
                    { name: '💳 Amount', value: `$${failedPaymentData.amount}`, inline: true },
                    { name: '📦 Kit(s)', value: failedPaymentData.items.map(item => `• ${item.name}`).join('\n'), inline: false },
                    { name: '🖥️ Server', value: failedPaymentData.serverName || 'Unknown', inline: true },
                    { name: '🆔 Session ID', value: `\`${failedPaymentData.sessionId}\``, inline: true },
                    { name: '⚠️ Reason', value: failedPaymentData.reason || 'Unknown', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'SEED Payment System' });

            await channel.send({ embeds: [embed] });
            console.log('✅ Payment failure log sent to Discord channel');
            return true;

        } catch (error) {
            console.error('❌ Error sending payment failure log to Discord:', error);
            return false;
        }
    }
}

module.exports = DiscordNotificationService;





