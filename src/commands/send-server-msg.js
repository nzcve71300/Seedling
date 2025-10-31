const { SlashCommandBuilder, EmbedBuilder, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send-server-msg')
        .setDescription('Send a server message with embed and server selection dropdown')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the message to')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .addStringOption(option =>
            option.setName('embed_color')
                .setDescription('Choose the embed color')
                .setRequired(true)
                .addChoices(
                    { name: 'Green', value: '0x00ff00' },
                    { name: 'Red', value: '0xff0000' },
                    { name: 'Blue', value: '0x0000ff' },
                    { name: 'Yellow', value: '0xffff00' },
                    { name: 'Purple', value: '0x800080' },
                    { name: 'Orange', value: '0xffa500' },
                    { name: 'Pink', value: '0xffc0cb' },
                    { name: 'Cyan', value: '0x00ffff' },
                    { name: 'Magenta', value: '0xff00ff' },
                    { name: 'Lime', value: '0x00ff00' },
                    { name: 'Gold', value: '0xffd700' },
                    { name: 'Silver', value: '0xc0c0c0' },
                    { name: 'Dark Green', value: '0x006400' },
                    { name: 'Dark Blue', value: '0x000080' },
                    { name: 'Dark Red', value: '0x8b0000' },
                    { name: 'Teal', value: '0x008080' },
                    { name: 'Navy', value: '0x000080' },
                    { name: 'Maroon', value: '0x800000' },
                    { name: 'Olive', value: '0x808000' },
                    { name: 'Aqua', value: '0x00ffff' }
                ))
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The text content for the embed message')
                .setRequired(true)),

    async execute(interaction, bot) {
        try {
            // Check if ServerService is available
            if (!bot.serverService) {
                return interaction.reply({
                    content: '❌ ServerService is not available. Please try again in a moment.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const channel = interaction.options.getChannel('channel');
            const embedColor = parseInt(interaction.options.getString('embed_color'));
            const text = interaction.options.getString('text');

            // Check if user has permission to send messages in the target channel
            if (!channel.permissionsFor(interaction.member).has('SendMessages')) {
                return interaction.reply({
                    content: '❌ You don\'t have permission to send messages in that channel!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Create the main embed
            const embed = new EmbedBuilder()
                .setTitle('🖥️ Server Information')
                .setDescription(text)
                .setColor(embedColor)
                .setTimestamp()
                .setFooter({ 
                    text: 'Select a server below to view details • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            // Create the server selection dropdown
            const serverSelectMenu = bot.serverService.createServerSelectMenu('server_info_select');

            if (!serverSelectMenu) {
                embed.setDescription(`${text}\n\n⚠️ No servers available. Use \`/add-server\` to add servers first.`);
                await channel.send({ embeds: [embed] });
                
                return interaction.reply({
                    content: `✅ Message sent to ${channel}! (No servers available to display)`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Send the message with embed and dropdown
            await channel.send({ 
                embeds: [embed], 
                components: [serverSelectMenu] 
            });

            await interaction.reply({
                content: `✅ Server message sent to ${channel} successfully!`,
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error('Error in send-server-msg command:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            await interaction.reply({
                content: `❌ There was an error sending the server message!\n\n**Error:** ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    },

    cooldown: 10
};
