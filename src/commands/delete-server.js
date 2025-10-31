const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete-server')
        .setDescription('Delete a server from the database'),

    async execute(interaction, bot) {
        try {
            const servers = bot.serverService.getAllServers();

            if (servers.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ No Servers Found')
                    .setDescription('There are no servers in the database to delete.\n\nUse `/add-server` to add servers first.')
                    .setColor(0xff0000)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Server Management • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            // Create server selection dropdown
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('delete_server_select')
                .setPlaceholder('Select a server to delete...')
                .setMinValues(1)
                .setMaxValues(1);

            servers.forEach(server => {
                selectMenu.addOptions({
                    label: server.server_name,
                    description: `${server.server_type} • ${server.game_type} • Team Size: ${server.team_size}`,
                    value: server.server_name
                });
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Delete Server')
                .setDescription('Select a server from the dropdown below to delete it from the database.\n\n⚠️ **This action cannot be undone!**')
                .setColor(0xff6b6b)
                .setTimestamp()
                .setFooter({ 
                    text: 'Server Management • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error('Error in delete-server command:', error);
            await interaction.reply({
                content: '❌ There was an error loading the server list!',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    cooldown: 5
};
