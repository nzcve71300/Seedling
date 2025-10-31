const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poker')
        .setDescription('Play Texas Hold\'em Poker against the bot!')
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
                communityCards: [],
                pot: betAmount * 2, // Both players bet
                userBet: betAmount,
                botBet: betAmount,
                currentPlayer: 'user',
                gamePhase: 'preflop', // preflop, flop, turn, river, showdown
                gameOver: false,
                winner: null,
                bet: betAmount,
                userId: userId,
                username: username
            };

            // Deal initial cards
            this.dealCards(gameState);

            // Store game state
            bot.gameManager.activeGames.set(interaction.id, gameState);

            // Create game embed
            const embed = new EmbedBuilder()
                .setTitle('🃏 Texas Hold\'em Poker')
                .setDescription(`**${username}** vs **Seedy Bot**\n\n${betAmount > 0 ? `💰 **Pot:** ${bot.economy.formatCurrency(gameState.pot)}` : '🎯 **Friendly Game**'}\n\n**Current Turn:** ${gameState.currentPlayer === 'user' ? `${username}` : 'Seedy Bot'}`)
                .setColor(0x4ecdc4)
                .addFields({
                    name: '**Your Hand**',
                    value: this.renderHand(gameState.userHand),
                    inline: true
                }, {
                    name: '**Community Cards**',
                    value: gameState.communityCards.length > 0 ? this.renderHand(gameState.communityCards) : 'No cards yet',
                    inline: true
                }, {
                    name: '**Game Info**',
                    value: `**Phase:** ${gameState.gamePhase}\n**Your Bet:** ${bot.economy.formatCurrency(gameState.userBet)}\n**Bot Bet:** ${bot.economy.formatCurrency(gameState.botBet)}`,
                    inline: false
                })
                .setThumbnail('https://i.imgur.com/ieP1fd5.jpeg')
                .setTimestamp()
                .setFooter({ 
                    text: 'Click buttons to make your move! • Powered by Seedy', 
                    iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
                });

            // Create game buttons
            const buttons = this.createGameButtons();

            await interaction.reply({ 
                embeds: [embed], 
                components: buttons
            });

        } catch (error) {
            console.error('Error in poker command:', error);
            await interaction.reply({
                content: '❌ There was an error starting the Poker game!',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    createDeck() {
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck = [];

        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({ suit, rank, value: this.getCardValue(rank) });
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
        if (rank === 'A') return 14;
        if (rank === 'K') return 13;
        if (rank === 'Q') return 12;
        if (rank === 'J') return 11;
        return parseInt(rank);
    },

    dealCards(gameState) {
        // Deal 2 cards to each player
        gameState.userHand.push(gameState.deck.pop());
        gameState.botHand.push(gameState.deck.pop());
        gameState.userHand.push(gameState.deck.pop());
        gameState.botHand.push(gameState.deck.pop());
    },

    renderHand(hand) {
        if (hand.length === 0) return 'No cards';
        
        return hand.map(card => this.renderCard(card)).join(' ');
    },

    renderCard(card) {
        const color = ['♥️', '♦️'].includes(card.suit) ? '🔴' : '⚫';
        return `${color} ${card.rank}${card.suit}`;
    },

    createGameButtons() {
        const row = new ActionRowBuilder();
        
        const callButton = new ButtonBuilder()
            .setCustomId('poker_call')
            .setLabel('Call')
            .setStyle(ButtonStyle.Primary);

        const raiseButton = new ButtonBuilder()
            .setCustomId('poker_raise')
            .setLabel('Raise')
            .setStyle(ButtonStyle.Success);

        const foldButton = new ButtonBuilder()
            .setCustomId('poker_fold')
            .setLabel('Fold')
            .setStyle(ButtonStyle.Danger);

        row.addComponents(callButton, raiseButton, foldButton);
        return [row];
    },

    evaluateHand(cards) {
        // Combine player cards with community cards
        const allCards = [...cards];
        allCards.sort((a, b) => b.value - a.value);

        // Check for different hand types
        const handTypes = [
            this.checkRoyalFlush,
            this.checkStraightFlush,
            this.checkFourOfAKind,
            this.checkFullHouse,
            this.checkFlush,
            this.checkStraight,
            this.checkThreeOfAKind,
            this.checkTwoPair,
            this.checkPair,
            this.checkHighCard
        ];

        for (let i = 0; i < handTypes.length; i++) {
            const result = handTypes[i](allCards);
            if (result) {
                return { type: i, cards: result, name: this.getHandName(i) };
            }
        }

        return { type: 9, cards: [allCards[0]], name: 'High Card' };
    },

    checkRoyalFlush(cards) {
        const flush = this.checkFlush(cards);
        if (flush) {
            const values = flush.map(card => card.value).sort((a, b) => b - a);
            if (values[0] === 14 && values[1] === 13 && values[2] === 12 && values[3] === 11 && values[4] === 10) {
                return flush.slice(0, 5);
            }
        }
        return null;
    },

    checkStraightFlush(cards) {
        const flush = this.checkFlush(cards);
        if (flush) {
            return this.checkStraight(flush);
        }
        return null;
    },

    checkFourOfAKind(cards) {
        const rankGroups = {};
        for (const card of cards) {
            if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
            rankGroups[card.rank].push(card);
        }

        for (const rank in rankGroups) {
            if (rankGroups[rank].length >= 4) {
                return rankGroups[rank].slice(0, 4);
            }
        }
        return null;
    },

    checkFullHouse(cards) {
        const threeOfAKind = this.checkThreeOfAKind(cards);
        if (threeOfAKind) {
            const remainingCards = cards.filter(card => !threeOfAKind.includes(card));
            const pair = this.checkPair(remainingCards);
            if (pair) {
                return [...threeOfAKind, ...pair];
            }
        }
        return null;
    },

    checkFlush(cards) {
        const suitGroups = {};
        for (const card of cards) {
            if (!suitGroups[card.suit]) suitGroups[card.suit] = [];
            suitGroups[card.suit].push(card);
        }

        for (const suit in suitGroups) {
            if (suitGroups[suit].length >= 5) {
                return suitGroups[suit].slice(0, 5);
            }
        }
        return null;
    },

    checkStraight(cards) {
        const values = [...new Set(cards.map(card => card.value))].sort((a, b) => b - a);
        
        for (let i = 0; i <= values.length - 5; i++) {
            let consecutive = true;
            for (let j = 1; j < 5; j++) {
                if (values[i] - values[i + j] !== j) {
                    consecutive = false;
                    break;
                }
            }
            if (consecutive) {
                const straightCards = [];
                for (let j = 0; j < 5; j++) {
                    const card = cards.find(c => c.value === values[i + j]);
                    if (card) straightCards.push(card);
                }
                return straightCards.slice(0, 5);
            }
        }
        return null;
    },

    checkThreeOfAKind(cards) {
        const rankGroups = {};
        for (const card of cards) {
            if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
            rankGroups[card.rank].push(card);
        }

        for (const rank in rankGroups) {
            if (rankGroups[rank].length >= 3) {
                return rankGroups[rank].slice(0, 3);
            }
        }
        return null;
    },

    checkTwoPair(cards) {
        const rankGroups = {};
        for (const card of cards) {
            if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
            rankGroups[card.rank].push(card);
        }

        const pairs = [];
        for (const rank in rankGroups) {
            if (rankGroups[rank].length >= 2) {
                pairs.push(rankGroups[rank].slice(0, 2));
            }
        }

        if (pairs.length >= 2) {
            return [...pairs[0], ...pairs[1]];
        }
        return null;
    },

    checkPair(cards) {
        const rankGroups = {};
        for (const card of cards) {
            if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
            rankGroups[card.rank].push(card);
        }

        for (const rank in rankGroups) {
            if (rankGroups[rank].length >= 2) {
                return rankGroups[rank].slice(0, 2);
            }
        }
        return null;
    },

    checkHighCard(cards) {
        return [cards[0]];
    },

    getHandName(type) {
        const names = [
            'Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House',
            'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Pair', 'High Card'
        ];
        return names[type];
    },

    cooldown: 10
};
