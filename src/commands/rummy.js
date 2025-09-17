const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rummy')
        .setDescription('Play Rummy against the bot!')
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
                        ephemeral: true
                    });
                }
            }

            // Initialize game state
            const gameState = {
                deck: module.exports.createDeck(),
                userHand: [],
                botHand: [],
                discardPile: [],
                currentPlayer: 'user',
                gameOver: false,
                winner: null,
                bet: betAmount,
                userId: userId,
                username: username,
                createdAt: Date.now(),
                lastActivity: Date.now()
            };

            // Deal initial cards
            module.exports.dealCards(gameState);

            // Store game state with message ID for button handling
            const messageId = `rummy_${interaction.id}`;
            bot.gameManager.activeGames.set(messageId, gameState);

            // Create game embed
            const embed = new EmbedBuilder()
                .setTitle('🃏 Rummy Game')
                .setDescription(`**${username}** vs **Seedy Bot**\n\n${betAmount > 0 ? `💰 **Bet:** ${bot.economy.formatCurrency(betAmount)}` : '🎯 **Friendly Game**'}\n\n**Current Turn:** ${gameState.currentPlayer === 'user' ? `${username}` : 'Seedy Bot'}`)
                .setColor(0x4ecdc4)
                .addFields({
                    name: '**Your Hand**',
                    value: module.exports.renderHand(gameState.userHand),
                    inline: true
                }, {
                    name: '**Discard Pile**',
                    value: gameState.discardPile.length > 0 ? module.exports.renderCard(gameState.discardPile[gameState.discardPile.length - 1]) : 'Empty',
                    inline: true
                }, {
                    name: '**Game Info**',
                    value: `**Deck:** ${gameState.deck.length} cards\n**Your Cards:** ${gameState.userHand.length}\n**Bot Cards:** ${gameState.botHand.length}`,
                    inline: false
                })
                .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
                .setTimestamp()
                .setFooter({ 
                    text: 'Click buttons to draw or discard cards! • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            // Create game buttons
            const buttons = module.exports.createGameButtons(gameState, interaction.id);

            await interaction.reply({ 
                embeds: [embed], 
                components: buttons,
                ephemeral: false
            });

        } catch (error) {
            console.error('Error in rummy command:', error);
            await interaction.reply({
                content: '❌ There was an error starting the Rummy game!',
                ephemeral: true
            });
        }
    },

    createDeck() {
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck = [];

        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({ suit, rank, value: module.exports.getCardValue(rank) });
            }
        }

        // Shuffle deck
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    },

    getCardValue(rank) {
        if (rank === 'A') return 1;
        if (['J', 'Q', 'K'].includes(rank)) return 10;
        return parseInt(rank);
    },

    dealCards(gameState) {
        // Deal 7 cards to each player
        for (let i = 0; i < 7; i++) {
            gameState.userHand.push(gameState.deck.pop());
            gameState.botHand.push(gameState.deck.pop());
        }

        // Start discard pile with one card
        gameState.discardPile.push(gameState.deck.pop());
    },

    renderHand(hand) {
        if (hand.length === 0) return 'No cards';
        
        return hand.map(card => module.exports.renderCard(card)).join(' ');
    },

    renderCard(card) {
        const color = ['♥️', '♦️'].includes(card.suit) ? '🔴' : '⚫';
        return `${color} ${card.rank}${card.suit}`;
    },

    createGameButtons(gameState, interactionId) {
        const row = new ActionRowBuilder();
        
        const drawButton = new ButtonBuilder()
            .setCustomId(`rummy_${interactionId}_draw`)
            .setLabel('Draw from Deck')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🃏');

        const discardButton = new ButtonBuilder()
            .setCustomId(`rummy_${interactionId}_discard`)
            .setLabel('Draw from Discard')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🗑️');

        const endTurnButton = new ButtonBuilder()
            .setCustomId(`rummy_${interactionId}_end`)
            .setLabel('End Turn')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        row.addComponents(drawButton, discardButton, endTurnButton);
        return [row];
    },

    calculateHandValue(hand) {
        // Simple scoring: sum of card values
        return hand.reduce((total, card) => total + card.value, 0);
    },

    checkRummy(hand) {
        // Check for sets (3+ cards of same rank) and runs (3+ consecutive cards of same suit)
        const sets = module.exports.findSets(hand);
        const runs = module.exports.findRuns(hand);
        
        return sets.length > 0 || runs.length > 0;
    },

    findSets(hand) {
        const sets = [];
        const rankGroups = {};

        // Group cards by rank
        for (const card of hand) {
            if (!rankGroups[card.rank]) {
                rankGroups[card.rank] = [];
            }
            rankGroups[card.rank].push(card);
        }

        // Find sets of 3 or more
        for (const rank in rankGroups) {
            if (rankGroups[rank].length >= 3) {
                sets.push(rankGroups[rank]);
            }
        }

        return sets;
    },

    findRuns(hand) {
        const runs = [];
        const suitGroups = {};

        // Group cards by suit
        for (const card of hand) {
            if (!suitGroups[card.suit]) {
                suitGroups[card.suit] = [];
            }
            suitGroups[card.suit].push(card);
        }

        // Find runs of 3 or more consecutive cards
        for (const suit in suitGroups) {
            const cards = suitGroups[suit].sort((a, b) => a.value - b.value);
            let currentRun = [cards[0]];

            for (let i = 1; i < cards.length; i++) {
                if (cards[i].value === cards[i-1].value + 1) {
                    currentRun.push(cards[i]);
                } else {
                    if (currentRun.length >= 3) {
                        runs.push([...currentRun]);
                    }
                    currentRun = [cards[i]];
                }
            }

            if (currentRun.length >= 3) {
                runs.push(currentRun);
            }
        }

        return runs;
    },

    cooldown: 10
};
