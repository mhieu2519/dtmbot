// ./utils/buttonActiveBuffs.js
const UserXP = require('../models/UserXP');
const { MessageFlags } = require('discord.js');

// 💬 Mô tả buff theo `effect` key
const buffDescriptions = {
    winRateVsMonster: "➡️ Tăng tỉ lệ thắng khi gặp yêu thú hoặc đỉnh cấp yêu thú.",
    rewardBonus: "➡️ Tăng phần thưởng XP và linh thạch nhận được.",
    eventBoost_treasure: "➡️ Tăng xác suất tìm được kho báu bí cảnh.",
    eventBoost_hiddenItem: "➡️ Tăng xác suất phát hiện vật phẩm ẩn.",
    buffExp: "➡️ Tăng lượng exp nhận thêm mỗi lần.",
    buffStone: "➡️ Tăng lượng linh thạch nhận thêm mỗi lần."
};

// 🎨 Tên buff hiển thị đẹp
const buffNames = {
    winRateVsMonster: "Chiến Ý Bừng Cháy",
    rewardBonus: "Thiên Mệnh Chi Tử",
    eventBoost_treasure: "Kho Tàng Chí Tôn",
    eventBoost_hiddenItem: "Tàng Bảo Kỳ Duyên",
    buffExp: "Kinh Nghiệm Cường Hóa",
    buffStone: "Tài Phú Dồi Dào"
};

// 📦 Tạo mô tả cho danh sách buff
/*
function renderActiveBuffs(user) {
    const buffs = user.activeBuffs || [];

    if (buffs.length === 0) {
        return "📭 Hiện không có buff nào đang được kích hoạt.";
    }
    
        // 🔽 Gom nhóm theo effect + value
        const grouped = {};
        for (const buff of buffs) {
            const key = `${buff.effect}-${buff.value}`;
            if (!grouped[key]) {
                grouped[key] = { ...buff, count: 1 };
            } else {
                grouped[key].count++;
                grouped[key].duration += buff.duration; // tổng duration
            }
        }
    
        // 🔽 Sắp xếp theo value giảm dần
        const sorted = Object.values(grouped).sort((a, b) => b.value - a.value);
    
    const lines = sorted.map(buff => {
        const name = buffNames[buff.effect] || `Hiệu ứng: ${buff.effect}`;
        const desc = buffDescriptions[buff.effect] || "";
        return `🔥 **${name}**\n${desc}\n✨ Giá trị: +${Math.round(buff.value * 100)}% | ⏳ Tổng ${buff.duration} lượt `;
    });

    return lines.join("\n");
}
*/
function renderActiveBuffs(user) {
    const buffs = user.activeBuffs || [];

    if (buffs.length === 0) {
        return "📭 Hiện không có buff nào đang được kích hoạt.";
    }

    const lines = buffs.map((buff, index) => {
        const name = buffNames[buff.effect] || `Hiệu ứng: ${buff.effect}`;
        const desc = buffDescriptions[buff.effect] || "";
        return `🔥 **${name}**\n${desc}\n✨ Giá trị: +${buff.value * 100}% | ⏳ Còn ${buff.duration} lượt\n`;
    });

    return lines.join("\n");
}


// 🎯 Xử lý khi người dùng nhấn nút 🧪 Buff hiện tại
async function handleBuffCheck(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const user = await UserXP.findOne({ userId, guildId });
    const senderMember = await interaction.guild.members.fetch(userId);
    const senderDisplayName = senderMember.displayName;
    if (!user) {
        return interaction.reply({
            content: "❌ Không tìm thấy dữ liệu người dùng.",
            flags: MessageFlags.Ephemeral
        });
    }

    const content = renderActiveBuffs(user);

    return interaction.reply({
        content: `🧪 **Buff đang kích hoạt của ${senderDisplayName} đạo hữu:**\n\n${content}`,
        // flags: MessageFlags.Ephemeral
    });
}

module.exports = {
    handleBuffCheck
};
