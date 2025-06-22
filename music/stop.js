const { MessageFlags } = require('discord.js');
async function handleStop(interaction, player) {
    const queue = player.nodes.get(interaction.guild.id);

    if (!queue || !queue.isPlaying()) {
        return interaction.reply({ content: 'Không có nhạc nào đang phát.', flags: MessageFlags.Ephemeral });
    }

    queue.delete(); // Dừng nhạc, xóa hàng đợi và rời kênh thoại
    await interaction.reply('Đã dừng nhạc và rời kênh thoại.');
}

module.exports = { handleStop };