const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('connect-server')
        .setDescription('Connect to a Rust console server using RCON')
        .addStringOption(option =>
            option.setName('nickname')
                .setDescription('A unique nickname for this server connection')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('server_ip')
                .setDescription('The IP address of the Rust server')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('rcon_port')
                .setDescription('The RCON port of the server (usually 28016)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(65535))
        .addStringOption(option =>
            option.setName('rcon_password')
                .setDescription('The RCON password for the server')
                .setRequired(true)),

    async execute(interaction, bot) {
        try {
            const nickname = interaction.options.getString('nickname');
            const serverIp = interaction.options.getString('server_ip');
            const rconPort = interaction.options.getInteger('rcon_port');
            const rconPassword = interaction.options.getString('rcon_password');

            // Validate inputs
            if (!nickname || nickname.length < 2 || nickname.length > 50) {
                return interaction.reply({
                    content: '❌ Nickname must be between 2 and 50 characters long!',
                    ephemeral: true
                });
            }

            if (!serverIp || !this.isValidIP(serverIp)) {
                return interaction.reply({
                    content: '❌ Please provide a valid IP address!',
                    ephemeral: true
                });
            }

            if (!rconPassword || rconPassword.length < 1) {
                return interaction.reply({
                    content: '❌ RCON password cannot be empty!',
                    ephemeral: true
                });
            }

            // Check if RCEManagerService is available
            if (!bot.rceManager) {
                return interaction.reply({
                    content: '❌ RCE Manager service is not available. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Add server connection
            const connection = await bot.rceManager.addServerConnection(
                nickname,
                serverIp,
                rconPort,
                rconPassword,
                interaction.user.id
            );

            // Create success embed
            const embed = new EmbedBuilder()
                .setTitle('✅ Server Connection Added Successfully!')
                .setDescription(`**${nickname}** has been added to the server connections database.`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '**NICKNAME**',
                        value: connection.nickname,
                        inline: false
                    },
                    {
                        name: '**SERVER IP**',
                        value: connection.server_ip,
                        inline: false
                    },
                    {
                        name: '**RCON PORT**',
                        value: connection.rcon_port.toString(),
                        inline: false
                    },
                    {
                        name: '**STATUS**',
                        value: 'Disconnected (Ready to connect)',
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Server Connection Management • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in connect-server command:', error);
            
            let errorMessage = '❌ There was an error adding the server connection!';
            if (error.message === 'A server connection with this nickname already exists') {
                errorMessage = '❌ A server connection with this nickname already exists! Please choose a different nickname.';
            }

            await interaction.reply({
                content: errorMessage,
                ephemeral: true
            });
        }
    },

    isValidIP(ip) {
        // Basic IP validation (supports both IPv4 and IPv6)
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
        
        return ipv4Regex.test(ip) || ipv6Regex.test(ip) || domainRegex.test(ip);
    },

    cooldown: 5
};
