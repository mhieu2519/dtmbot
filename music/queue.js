const { MessageFlags } = require('discord.js');
const { flat } = require('../shops/hiddenItems');
async function handleQueue(interaction, player) {
    const queue = player.nodes.get(interaction.guild.id);

    if (!queue || !queue.isPlaying()) {
        return interaction.reply({ 
            content: 'Không có nhạc nào đang phát.', 
            flags: MessageFlags.Ephemeral,
        });
    }

    const currentTrack = queue.currentTrack;
    if (!currentTrack) {
        return interaction.reply({ content: 'Không có bài hát nào đang phát hoặc trong hàng đợi.', flags: MessageFlags.Ephemeral, });
    }

    let response = `**🎶 Hàng đợi Hiện tại:**\n`;
    response += `**Đang phát:** [${currentTrack.title}](${currentTrack.url}) - ${currentTrack.author} (${currentTrack.duration})\n\n`;

    if (queue.tracks.size === 0) {
        response += 'Hàng đợi trống.';
    } else {
        response += `**Bài hát tiếp theo:**\n`;
        const tracks = queue.tracks.map((track, i) => `${i + 1}. [${track.title}](${track.url}) - ${track.author} (${track.duration})`);

        // Hiển thị tối đa 10 bài tiếp theo để tránh tin nhắn quá dài
        response += tracks.slice(0, 10).join('\n');
        if (tracks.length > 10) {
            response += `\n...và ${tracks.length - 10} bài hát khác trong hàng đợi.`;
        }
    }

    await interaction.reply({ content: response });
}

module.exports = { handleQueue };