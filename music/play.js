const { QueryType } = require('discord-player');
const { MessageFlags } = require('discord.js');

async function handlePlay(interaction, player) {
    const query = interaction.options.getString('query');

    // Lấy ID kênh nhạc từ biến môi trường
    const musicChannelId = process.env.MUSIC_CHANNEL_ID;
    if (!musicChannelId) {
        return interaction.reply({ content: 'Lỗi cấu hình: Không tìm thấy MUSIC_CHANNEL_ID trong .env!', flags: MessageFlags.Ephemeral});
    }

    // Tìm kênh thoại dựa trên ID đã cấu hình
    const targetChannel = interaction.guild.channels.cache.get(musicChannelId);

    // Kiểm tra xem kênh có tồn tại và là kênh thoại không
    if (!targetChannel || targetChannel.type !== 2) { // 2 là Discord.ChannelType.Voice
        return interaction.reply({ content: `Kênh thoại với ID "${musicChannelId}" không hợp lệ hoặc không tồn tại. Vui lòng kiểm tra lại MUSIC_CHANNEL_ID trong file .env!`, flags: MessageFlags.Ephemeral});
    }

    // Kiểm tra quyền của bot trong kênh chỉ định
    const permissions = targetChannel.permissionsFor(interaction.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
        return interaction.reply({ content: `Lão phu không có quyền **Kết nối** hoặc **Nói chuyện** trong kênh thoại ${targetChannel.name}.` });
    }

    const queue = player.nodes.create(interaction.guild, {
        metadata: {
            channel: interaction.channel, // Kênh văn bản để gửi thông báo
            client: interaction.guild.members.me,
        },
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 60000,
        leaveOnStop: true,
        volume: 80,
    });

    try {
        // Thay đổi ở đây: Kết nối vào targetChannel thay vì kênh của người dùng
        if (!queue.connection) await queue.connect(targetChannel);
    } catch (error) {
        queue.delete();
        console.error("Lỗi khi kết nối kênh thoại:", error);
        return interaction.reply({ content: `Lão phu không thể vào kênh thoại ${targetChannel.name} của đạo hữu!` });
    }

    await interaction.deferReply();

    try {
        const res = await player.search(query, {
            requestedBy: interaction.user,
            searchEngine: QueryType.AUTO,
        });

        if (!res || !res.tracks.length) {
            return interaction.followUp({ content: 'Lão phu không tìm thấy kết quả.' });
        }

        if (res.playlist) {
            queue.addTrack(res.tracks);
            await interaction.followUp(`Lão phu đã thêm playlist **${res.playlist.title}** (${res.tracks.length} bài hát) vào hàng đợi và sẽ phát trong kênh <#${musicChannelId}>!`);
        } else {
            queue.addTrack(res.tracks[0]);
            await interaction.followUp(`Lão phu đã thêm **${res.tracks[0].title}** vào hàng đợi và sẽ phát trong kênh <#${musicChannelId}>!`);
        }

        if (!queue.isPlaying()) await queue.node.play();

    } catch (error) {
        console.error("Lỗi khi tìm kiếm hoặc phát nhạc:", error);
        await interaction.followUp(`Có lỗi xảy ra khi phát nhạc: ${error.message}`);
    }
}

module.exports = { handlePlay };