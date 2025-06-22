const { handlePlay } = require('./play');
const { handleStop } = require('./stop');
const { handleSkip } = require('./skip');
const { handleQueue } = require('./queue');
const {MessageFlags } = require('discord.js');
async function handleMusicCommand(interaction, player) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
        case "play":
            return await handlePlay(interaction, player);
        case "stop":
            return await handleStop(interaction, player);
        case "next":
            return await handleSkip(interaction, player);
        case "list":
            return await handleQueue(interaction, player);
        default:
            return interaction.reply({ 
                content: 'Lệnh không hợp lệ!', 
                flags: MessageFlags.Ephemeral
             });
    }
}

module.exports = { handleMusicCommand };