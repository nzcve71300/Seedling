const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

class HangmanGame {
    constructor() {
        this.words = [
            'DISCORD', 'BOT', 'SEEDY', 'GAME', 'HANGMAN', 'FUN', 'PLAY',
            'WIN', 'LOSE', 'GUESS', 'LETTER', 'WORD', 'PUZZLE', 'CHALLENGE'
        ];
        this.games = new Map();
    }

    startGame(userId) {
        const word = this.words[Math.floor(Math.random() * this.words.length)];
        const game = {
            word: word,
            guessed: new Set(),
            wrongGuesses: 0,
            maxWrong: 6,
            status: 'playing'
        };
        this.games.set(userId, game);
        return game;
    }

    makeGuess(userId, letter) {
        const game = this.games.get(userId);
        if (!game || game.status !== 'playing') return null;

        letter = letter.toUpperCase();
        if (game.guessed.has(letter)) return { error: 'Already guessed this letter!' };

        game.guessed.add(letter);
        
        if (!game.word.includes(letter)) {
            game.wrongGuesses++;
            if (game.wrongGuesses >= game.maxWrong) {
                game.status = 'lost';
            }
        } else {
            // Check if won
            const won = [...game.word].every(char => game.guessed.has(char));
            if (won) {
                game.status = 'won';
            }
        }

        return game;
    }

    getDisplay(game) {
        let display = '';
        for (const char of game.word) {
            if (game.guessed.has(char)) {
                display += char + ' ';
            } else {
                display += '_ ';
            }
        }
        return display.trim();
    }

    getHangmanArt(wrongGuesses) {
        const stages = [
            '```\n   +---+\n   |   |\n       |\n       |\n       |\n       |\n=========```',
            '```\n   +---+\n   |   |\n   O   |\n       |\n       |\n       |\n=========```',
            '```\n   +---+\n   |   |\n   O   |\n   |   |\n       |\n       |\n=========```',
            '```\n   +---+\n   |   |\n   O   |\n  /|   |\n       |\n       |\n=========```',
            '```\n   +---+\n   |   |\n   O   |\n  /|\\  |\n       |\n       |\n=========```',
            '```\n   +---+\n   |   |\n   O   |\n  /|\\  |\n  /    |\n       |\n=========```',
            '```\n   +---+\n   |   |\n   O   |\n  /|\\  |\n  / \\  |\n       |\n=========```'
        ];
        return stages[wrongGuesses] || stages[0];
    }
}

const hangmanGame = new HangmanGame();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Start a game of Hangman')
        .addStringOption(option =>
            option.setName('letter')
                .setDescription('Guess a letter (optional - leave empty to start new game)')
                .setRequired(false)),

    async execute(interaction, bot) {
        const letter = interaction.options.getString('letter');
        const userId = interaction.user.id;

        if (!letter) {
            // Start new game
            const game = hangmanGame.startGame(userId);
            const embed = new EmbedBuilder()
                .setTitle('🎮 Hangman Game Started!')
                .setDescription(`Word: ${hangmanGame.getDisplay(game)}\n\nGuessed letters: None\nWrong guesses: ${game.wrongGuesses}/${game.maxWrong}`)
                .addFields({ name: 'Hangman', value: hangmanGame.getHangmanArt(game.wrongGuesses) })
                .setColor(0x00ff00)
                .setFooter({ text: 'Use /hangman <letter> to guess a letter' });

            await interaction.reply({ embeds: [embed] });
            return;
        }

        // Make guess
        const result = hangmanGame.makeGuess(userId, letter);
        if (!result) {
            return await interaction.reply({
                content: '❌ No active game found. Use `/hangman` to start a new game.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (result.error) {
            return await interaction.reply({
                content: `❌ ${result.error}`,
                flags: MessageFlags.Ephemeral
            });
        }

        const game = result;
        const guessedLetters = Array.from(game.guessed).sort().join(', ') || 'None';
        
        let embed = new EmbedBuilder()
            .setTitle('🎮 Hangman Game')
            .setDescription(`Word: ${hangmanGame.getDisplay(game)}\n\nGuessed letters: ${guessedLetters}\nWrong guesses: ${game.wrongGuesses}/${game.maxWrong}`)
            .addFields({ name: 'Hangman', value: hangmanGame.getHangmanArt(game.wrongGuesses) })
            .setColor(0x00ff00);

        if (game.status === 'won') {
            embed.setTitle('🎉 You Won!')
                .setDescription(`Congratulations! The word was: **${game.word}**`)
                .setColor(0x00ff00);
            
            // Award seeds
            const reward = 50;
            await bot.economy.addMoney(userId, reward, 'Hangman win', interaction.user.username);
            await bot.economy.updateGameStats(userId, 'hangman', true);
            
            embed.addFields({ name: 'Reward', value: `+${bot.economy.formatCurrency(reward)}` });
            hangmanGame.games.delete(userId);
        } else if (game.status === 'lost') {
            embed.setTitle('💀 Game Over!')
                .setDescription(`The word was: **${game.word}**\nBetter luck next time!`)
                .setColor(0xff0000);
            
            await bot.economy.updateGameStats(userId, 'hangman', false);
            hangmanGame.games.delete(userId);
        }

        await interaction.reply({ embeds: [embed] });
    },

    cooldown: 2
};
