const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uno')
        .setDescription('Play Uno against the bot!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet (optional)')
                .setRequired(false)
                .setMinValue(10)
                .setMaxValue(1000)),

    async execute(interaction, bot) {
        try {
            const betAmount = interaction.options.getInteger('bet') || 0;
            const userId = interaction.user.id;
            const username = interaction.user.username;

            // Check if user has enough money for bet
            if (betAmount > 0) {
                const hasFunds = await bot.economy.checkFunds(userId, betAmount);
                if (!hasFunds) {
                    const balance = await bot.economy.getBalance(userId);
                    return interaction.reply({
                        content: `❌ You don't have enough coins! You have **${bot.economy.formatCurrency(balance)}** but need **${bot.economy.formatCurrency(betAmount)}** to bet.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            // Initialize game state
            const gameState = {
                deck: this.createDeck(),
                userHand: [],
                botHand: [],
                discardPile: [],
                currentPlayer: 'user',
                gameDirection: 1, // 1 for clockwise, -1 for counterclockwise
                gameOver: false,
                winner: null,
                bet: betAmount,
                userId: userId,
                username: username
            };

            // Deal initial cards
            this.dealCards(gameState);

            // Start discard pile
            gameState.discardPile.push(gameState.deck.pop());

            // Store game state
            bot.gameManager.activeGames.set(interaction.id, gameState);

            // Create game embed
            const embed = new EmbedBuilder()
                .setTitle('🃏 Uno Game')
                .setDescription(`**${username}** vs **Seedy Bot**\n\n${betAmount > 0 ? `💰 **Bet:** ${bot.economy.formatCurrency(betAmount)}` : '🎯 **Friendly Game**'}\n\n**Current Turn:** ${gameState.currentPlayer === 'user' ? `${username}` : 'Seedy Bot'}`)
                .setColor(0x4ecdc4)
                .addFields({
                    name: '**Your Hand**',
                    value: this.renderHand(gameState.userHand),
                    inline: true
                }, {
                    name: '**Top Card**',
                    value: this.renderCard(gameState.discardPile[gameState.discardPile.length - 1]),
                    inline: true
                }, {
                    name: '**Game Info**',
                    value: `**Deck:** ${gameState.deck.length} cards\n**Your Cards:** ${gameState.userHand.length}\n**Bot Cards:** ${gameState.botHand.length}`,
                    inline: false
                })
                .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
                .setTimestamp()
                .setFooter({ 
                    text: 'Click buttons to play cards or draw! • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            // Create game buttons
            const buttons = this.createGameButtons(gameState.userHand);

            await interaction.reply({ 
                embeds: [embed], 
                components: buttons
            });

        } catch (error) {
            console.error('Error in uno command:', error);
            await interaction.reply({
                content: '❌ There was an error starting the Uno game!',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    createDeck() {
        const colors = ['🔴', '🟡', '🟢', '🔵'];
        const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        const specials = ['Skip', 'Reverse', 'Draw2'];
        const wilds = ['Wild', 'Wild+4'];
        const deck = [];

        // Add number cards (2 of each except 0)
        for (const color of colors) {
            deck.push({ color, value: '0', type: 'number' });
            for (const number of numbers.slice(1)) {
                deck.push({ color, value: number, type: 'number' });
                deck.push({ color, value: number, type: 'number' });
            }
        }

        // Add special cards (2 of each)
        for (const color of colors) {
            for (const special of specials) {
                deck.push({ color, value: special, type: 'special' });
                deck.push({ color, value: special, type: 'special' });
            }
        }

        // Add wild cards (4 of each)
        for (const wild of wilds) {
            for (let i = 0; i < 4; i++) {
                deck.push({ color: '⚫', value: wild, type: 'wild' });
            }
        }

        // Shuffle deck
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    },

    dealCards(gameState) {
        // Deal 7 cards to each player
        for (let i = 0; i < 7; i++) {
            gameState.userHand.push(gameState.deck.pop());
            gameState.botHand.push(gameState.deck.pop());
        }
    },

    renderHand(hand) {
        if (hand.length === 0) return 'No cards';
        
        return hand.map(card => this.renderCard(card)).join(' ');
    },

    renderCard(card) {
        if (card.type === 'wild') {
            return `⚫ ${card.value}`;
        }
        return `${card.color} ${card.value}`;
    },

    createGameButtons(hand) {
        const rows = [];
        const maxCardsPerRow = 5;
        
        for (let i = 0; i < hand.length; i += maxCardsPerRow) {
            const row = new ActionRowBuilder();
            const rowCards = hand.slice(i, i + maxCardsPerRow);
            
            for (const card of rowCards) {
                const button = new ButtonBuilder()
                    .setCustomId(`uno_${hand.indexOf(card)}`)
                    .setLabel(this.renderCard(card))
                    .setStyle(ButtonStyle.Primary);
                
                row.addComponents(button);
            }
            
            rows.push(row);
        }

        // Add draw button
        const drawRow = new ActionRowBuilder();
        const drawButton = new ButtonBuilder()
            .setCustomId('uno_draw')
            .setLabel('Draw Card')
            .setStyle(ButtonStyle.Secondary);
        
        drawRow.addComponents(drawButton);
        rows.push(drawRow);

        return rows;
    },

    canPlayCard(card, topCard) {
        if (card.type === 'wild') return true;
        if (card.color === topCard.color) return true;
        if (card.value === topCard.value) return true;
        return false;
    },

    getPlayableCards(hand, topCard) {
        return hand.filter(card => this.canPlayCard(card, topCard));
    },

    calculateHandValue(hand) {
        return hand.reduce((total, card) => {
            if (card.type === 'number') return total + parseInt(card.value);
            if (card.value === 'Skip' || card.value === 'Reverse' || card.value === 'Draw2') return total + 20;
            if (card.value === 'Wild' || card.value === 'Wild+4') return total + 50;
            return total;
        }, 0);
    },

    cooldown: 10
};
