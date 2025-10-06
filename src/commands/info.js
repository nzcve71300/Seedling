const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Get information about Seedy bot'),

    async execute(interaction, bot) {
        const embed = new EmbedBuilder()
            .setTitle('🌱 Seedy Bot Information')
            .setDescription('A comprehensive Discord bot with games and fun features!')
            .setColor(0x00ff00)
            .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
            .addFields(
                {
                    name: '📊 Version',
                    value: '1.0.0',
                    inline: true
                },
                {
                    name: '🎮 Features',
                    value: '• Economy System\n• Games (Hangman)\n• Moderation Tools\n• Survey System\n• ZORP Help',
                    inline: true
                },
                {
                    name: '🔗 Links',
                    value: '[GitHub Repository](https://github.com/nzcve71300/seedyy)\n[Report Issues](https://github.com/nzcve71300/seedyy/issues)',
                    inline: false
                },
                {
                    name: '⚡ Commands',
                    value: '• `/balance` - Check your balance\n• `/daily` - Claim daily rewards\n• `/hangman` - Play hangman\n• `/leaderboard` - View top users\n• `/chat` - Chat with Seedy\n• `/survey` - Create surveys',
                    inline: false
                }
            )
            .setFooter({ 
                text: 'Powered by Seedy • Made with ❤️', 
                iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    cooldown: 5
};
