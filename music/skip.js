const { MessageFlags } = require('discord.js');
async function handleSkip(interaction, player) {
    const queue = player.nodes.get(interaction.guild.id);
    const displayName = interaction.user.username || interaction.user.displayName;

    if (!queue || !queue.isPlaying()) {
        return interaction.reply({ content: 'Không có nhạc nào đang phát để bỏ qua.', flags: MessageFlags.Ephemeral });
    }

    const skipped = queue.node.skip();
    await interaction.reply(skipped ? `Đạo hữu ${displayName} bỏ qua bài hát hiện tại!` : 'Không có bài hát nào trong hàng đợi để bỏ qua.');
}

module.exports = { handleSkip };