const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

class SurveyManager {
    constructor(database) {
        this.database = database;
    }

    async createSurvey(interaction, question1, question2, question3, question4) {
        const embed = new EmbedBuilder()
            .setTitle('📋 Community Survey')
            .setDescription('🎯 **Help us improve our server!**\n\nYour feedback is valuable to us. Please take a moment to answer these questions and help shape our community.')
            .addFields(
                { 
                    name: '📝 **Question 1**', 
                    value: `> ${question1}`, 
                    inline: false 
                },
                { 
                    name: '📝 **Question 2**', 
                    value: `> ${question2}`, 
                    inline: false 
                },
                { 
                    name: '📝 **Question 3**', 
                    value: `> ${question3}`, 
                    inline: false 
                },
                { 
                    name: '📝 **Question 4**', 
                    value: `> ${question4}`, 
                    inline: false 
                }
            )
            .setColor(0x006400) // Dark green
            .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
            .setFooter({ 
                text: 'Your responses are anonymous and will help improve our server!', 
                iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
            })
            .setTimestamp();

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('answer_survey')
                    .setLabel('Participate in Survey')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📝')
            );

        await interaction.reply({
            embeds: [embed],
            components: [button]
        });
    }

    async handleButton(interaction) {
        if (interaction.customId === 'answer_survey') {
            const modal = new ModalBuilder()
                .setCustomId('survey_modal')
                .setTitle('📋 Community Survey Response');

            const question1Input = new TextInputBuilder()
                .setCustomId('question1')
                .setLabel('📝 Answer Question 1')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000)
                .setPlaceholder('Please provide a detailed answer to question 1...');

            const question2Input = new TextInputBuilder()
                .setCustomId('question2')
                .setLabel('📝 Answer Question 2')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000)
                .setPlaceholder('Please provide a detailed answer to question 2...');

            const question3Input = new TextInputBuilder()
                .setCustomId('question3')
                .setLabel('📝 Answer Question 3')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000)
                .setPlaceholder('Please provide a detailed answer to question 3...');

            const question4Input = new TextInputBuilder()
                .setCustomId('question4')
                .setLabel('📝 Answer Question 4')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000)
                .setPlaceholder('Please provide a detailed answer to question 4...');

            const firstActionRow = new ActionRowBuilder().addComponents(question1Input);
            const secondActionRow = new ActionRowBuilder().addComponents(question2Input);
            const thirdActionRow = new ActionRowBuilder().addComponents(question3Input);
            const fourthActionRow = new ActionRowBuilder().addComponents(question4Input);

            modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

            await interaction.showModal(modal);
        }
    }

    async handleModal(interaction, bot) {
        if (interaction.customId === 'survey_modal') {
            const question1 = interaction.fields.getTextInputValue('question1');
            const question2 = interaction.fields.getTextInputValue('question2');
            const question3 = interaction.fields.getTextInputValue('question3');
            const question4 = interaction.fields.getTextInputValue('question4');

            // Get survey channel
            const surveyConfig = await bot.database.get(
                'SELECT survey_channel_id FROM survey_config WHERE guild_id = ?',
                [interaction.guild.id]
            );

            if (!surveyConfig) {
                await interaction.reply({
                    content: '❌ Survey channel not configured. Please contact an administrator.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const surveyChannel = bot.client.channels.cache.get(surveyConfig.survey_channel_id);
            if (!surveyChannel) {
                await interaction.reply({
                    content: '❌ Survey channel not found. Please contact an administrator.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            // Save response to database
            await bot.database.run(
                'INSERT INTO survey_responses (survey_id, user_id, question1, question2, question3, question4) VALUES (?, ?, ?, ?, ?, ?)',
                ['current_survey', interaction.user.id, question1, question2, question3, question4]
            );

            // Send response to survey channel
            const responseEmbed = new EmbedBuilder()
                .setTitle('📋 New Survey Response')
                .setDescription(`**User:** ${interaction.user} (${interaction.user.tag})\n**Submitted:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                .addFields(
                    { 
                        name: '📝 **Question 1 Response**', 
                        value: question1.length > 1000 ? question1.substring(0, 1000) + '...' : question1, 
                        inline: false 
                    },
                    { 
                        name: '📝 **Question 2 Response**', 
                        value: question2.length > 1000 ? question2.substring(0, 1000) + '...' : question2, 
                        inline: false 
                    },
                    { 
                        name: '📝 **Question 3 Response**', 
                        value: question3.length > 1000 ? question3.substring(0, 1000) + '...' : question3, 
                        inline: false 
                    },
                    { 
                        name: '📝 **Question 4 Response**', 
                        value: question4.length > 1000 ? question4.substring(0, 1000) + '...' : question4, 
                        inline: false 
                    }
                )
                .setColor(0x006400)
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ 
                    text: `User ID: ${interaction.user.id} • Response #${Date.now()}`, 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            await surveyChannel.send({ embeds: [responseEmbed] });

            // Enhanced confirmation to user
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ Survey Submitted Successfully!')
                .setDescription('🎉 **Thank you for your feedback!**\n\nYour response has been recorded and will help us improve our server. We appreciate you taking the time to share your thoughts with us.')
                .setColor(0x00ff00)
                .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
                .setFooter({ 
                    text: 'Your feedback makes a difference!', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                })
                .setTimestamp();

            await interaction.reply({
                embeds: [confirmEmbed],
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async setSurveyChannel(guildId, channelId) {
        await this.database.run(
            'INSERT OR REPLACE INTO survey_config (guild_id, survey_channel_id) VALUES (?, ?)',
            [guildId, channelId]
        );
    }

    async getSurveyChannel(guildId) {
        const config = await this.database.get(
            'SELECT survey_channel_id FROM survey_config WHERE guild_id = ?',
            [guildId]
        );
        return config ? config.survey_channel_id : null;
    }

    async getSurveyResponses(surveyId = 'current_survey') {
        return await this.database.all(
            'SELECT * FROM survey_responses WHERE survey_id = ? ORDER BY created_at DESC',
            [surveyId]
        );
    }
}

module.exports = SurveyManager;
