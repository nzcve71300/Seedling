const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-server')
        .setDescription('Add a new server to the database')
        .addStringOption(option =>
            option.setName('server_name')
                .setDescription('The name of the server')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('server_id')
                .setDescription('The server ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('server_type')
                .setDescription('The type of server (e.g., PvP, PvE, Hybrid)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('game_type')
                .setDescription('The game type (e.g., Rust, ARK, etc.)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('team_size')
                .setDescription('The team size limit')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('last_wipe')
                .setDescription('When was the last wipe? (e.g., 2024-01-15)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('next_wipe')
                .setDescription('When is the next wipe? (e.g., 2024-02-15)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('bp_wipe')
                .setDescription('When was the last blueprint wipe? (e.g., 2024-01-01)')
                .setRequired(true)),

    async execute(interaction, bot) {
        try {
            const serverName = interaction.options.getString('server_name');
            const serverId = interaction.options.getString('server_id');
            const serverType = interaction.options.getString('server_type');
            const gameType = interaction.options.getString('game_type');
            const teamSize = interaction.options.getString('team_size');
            const lastWipe = interaction.options.getString('last_wipe');
            const nextWipe = interaction.options.getString('next_wipe');
            const bpWipe = interaction.options.getString('bp_wipe');

            // Add server to database
            const serverData = await bot.serverService.addServer(
                serverName, serverId, serverType, gameType, 
                teamSize, lastWipe, nextWipe, bpWipe
            );

            // Create success embed
            const embed = new EmbedBuilder()
                .setTitle('✅ Server Added Successfully!')
                .setDescription(`**${serverName}** has been added to the server database.`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '**SERVER ID**',
                        value: serverId,
                        inline: false
                    },
                    {
                        name: '**SERVER TYPE**',
                        value: serverType,
                        inline: false
                    },
                    {
                        name: '**GAME TYPE**',
                        value: gameType,
                        inline: false
                    },
                    {
                        name: '**TEAM SIZE**',
                        value: teamSize,
                        inline: false
                    },
                    {
                        name: '**LAST WIPE**',
                        value: lastWipe,
                        inline: false
                    },
                    {
                        name: '**NEXT WIPE**',
                        value: nextWipe,
                        inline: false
                    },
                    {
                        name: '**BP WIPE**',
                        value: bpWipe,
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Server Management • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in add-server command:', error);
            
            let errorMessage = '❌ There was an error adding the server!';
            if (error.message === 'Server with this name already exists') {
                errorMessage = '❌ A server with this name already exists! Please choose a different name.';
            }

            await interaction.reply({
                content: errorMessage,
                flags: MessageFlags.Ephemeral
            });
        }
    },

    cooldown: 5
};
