const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Chat with Seedy using AI')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Your message to Seedy')
                .setRequired(true)),

    async execute(interaction, bot) {
        const message = interaction.options.getString('message');
        
        await interaction.deferReply();

        try {
            // Simple responses without AI
            const responses = [
                "🌱 Thanks for chatting with me! I'm Seedy, your friendly Discord bot!",
                "🎮 Hey there! I love chatting! Want to play a game or need help with something?",
                "🌱 Hi! I'm here to help with games, ZORP questions, or just have fun conversations!",
                "🎯 Hello! Thanks for the message! I'm Seedy and I'm here to make your day better!",
                "🌱 Hey! I appreciate you reaching out! What can I help you with today?",
                "🎮 Hi there! I'm always happy to chat! How can I make your Discord experience awesome?"
            ];

            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            
            const embed = new EmbedBuilder()
                .setTitle('🌱 Seedy Response')
                .setDescription(randomResponse)
                .setColor(0x00ff00)
                .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
                .setFooter({ 
                    text: 'Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Chat command error:', error);
            await interaction.editReply({
                content: '❌ Sorry, I encountered an error processing your message. Please try again!',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    cooldown: 5
};
