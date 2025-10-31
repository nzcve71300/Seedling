const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-server')
        .setDescription('Edit an existing server in the database')
        .addStringOption(option =>
            option.setName('new_name')
                .setDescription('The new name for the server')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('new_id')
                .setDescription('The new server ID')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('new_type')
                .setDescription('The new server type (e.g., PvP, PvE, Hybrid)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('new_game_type')
                .setDescription('The new game type (e.g., Rust, ARK, etc.)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('new_team_size')
                .setDescription('The new team size limit')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('new_last_wipe')
                .setDescription('The new last wipe date (e.g., 2024-01-15)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('new_next_wipe')
                .setDescription('The new next wipe date (e.g., 2024-02-15)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('new_bp_wipe')
                .setDescription('The new blueprint wipe date (e.g., 2024-01-01)')
                .setRequired(false)),

    async execute(interaction, bot) {
        try {
            const servers = bot.serverService.getAllServers();

            if (servers.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ No Servers Found')
                    .setDescription('There are no servers in the database to edit.\n\nUse `/add-server` to add servers first.')
                    .setColor(0xff0000)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Server Management • Powered by Seedy', 
                        iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                    });

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            // Check if any update fields are provided
            const updates = {};
            const newName = interaction.options.getString('new_name');
            const newId = interaction.options.getString('new_id');
            const newType = interaction.options.getString('new_type');
            const newGameType = interaction.options.getString('new_game_type');
            const newTeamSize = interaction.options.getString('new_team_size');
            const newLastWipe = interaction.options.getString('new_last_wipe');
            const newNextWipe = interaction.options.getString('new_next_wipe');
            const newBpWipe = interaction.options.getString('new_bp_wipe');

            if (newName) updates.server_name = newName;
            if (newId) updates.server_id = newId;
            if (newType) updates.server_type = newType;
            if (newGameType) updates.game_type = newGameType;
            if (newTeamSize) updates.team_size = newTeamSize;
            if (newLastWipe) updates.last_wipe = newLastWipe;
            if (newNextWipe) updates.next_wipe = newNextWipe;
            if (newBpWipe) updates.bp_wipe = newBpWipe;

            if (Object.keys(updates).length === 0) {
                return interaction.reply({
                    content: '❌ Please provide at least one field to update!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Create server selection dropdown
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`edit_server_select_${JSON.stringify(updates)}`)
                .setPlaceholder('Select a server to edit...')
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
                .setTitle('✏️ Edit Server')
                .setDescription('Select a server from the dropdown below to update it with the new information.')
                .setColor(0x4ecdc4)
                .addFields(
                    {
                        name: '📝 Fields to Update:',
                        value: Object.keys(updates).map(key => `• **${key.replace('_', ' ').toUpperCase()}**`).join('\n'),
                        inline: false
                    }
                )
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
            console.error('Error in edit-server command:', error);
            await interaction.reply({
                content: '❌ There was an error loading the server list!',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    cooldown: 5
};
