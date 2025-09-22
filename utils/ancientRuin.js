// utils/ancientRuin.js

const AncientRuin = require("../models/AncientRuin");
const { getItemFromInventory, removeItemFromInventory } = require("./inventory");

/**
 * Xử lý khi người chơi gặp di tích cổ.
 * Chu trình:
 *  - Nếu đang đóng → giảm sealedCounter, mở khi = 0.
 *  - Nếu đang mở → giảm entryLimit, yêu cầu Ancient Key để vào.
 *  - Khi entryLimit = 0 → đóng lại, reset sealedCounter.
 * 
 * @param {Object} user - UserXP document (mongoose)
 * @param {string} guildId - Guild ID
 * @returns {Promise<string>} - Thông báo kết quả
 */
async function handleAncientRuin(user, guildId) {
    let ruin = await AncientRuin.findOne({ guildId });
    if (!ruin) {
        ruin = new AncientRuin({
            guildId,
            sealedCounter: 10,
            entryLimit: 0,
            isOpen: false
        });
        await ruin.save();
    }

    let result = "";

    // 1. Nếu di tích đang đóng
    if (!ruin.isOpen) {
        ruin.sealedCounter -= 1;

        if (ruin.sealedCounter > 0) {
            result += `🔒 Di tích vẫn bị phong ấn... cần thêm ${ruin.sealedCounter} lần chạm nữa để khai mở.`;
        } else {
            ruin.isOpen = true;
            ruin.entryLimit = 5; // số lượt cho phép vào khi mở
            result += "🌌 Di tích cổ đã khai mở! Đạo hữu có thể dùng **Thiên Cổ Ngọc Giản 🗞️** để tiến vào!";
        }
    }
    // 2. Nếu di tích đang mở
    else {
        ruin.entryLimit -= 1;

        const key = getItemFromInventory(user, "heavenJade");
        if (key) {
            await removeItemFromInventory(user, "heavenJade", 1);
            result += `🏯 Đạo hữu dùng **Ancient Key** tiến vào di tích! (Còn ${ruin.entryLimit} lượt)\n`;
            // TODO: phát thưởng (XP, item, v.v.)
            result += "🎁 Đạo hữu nhận được phần thưởng bí ẩn từ di tích!";
        } else {
            result += `⚠️ Đạo hữu cần **Ancient Key** để vào di tích. (Lượt vào vẫn bị trừ, còn ${ruin.entryLimit} lượt)`;
        }

        // nếu hết lượt thì đóng di tích, reset sealedCounter
        if (ruin.entryLimit <= 0) {
            ruin.isOpen = false;
            ruin.sealedCounter = 10;
            result += "\n🏯 Di tích đã khép lại, hãy chờ lần mở tiếp theo.";
        }
    }

    await ruin.save();
    return result;
}

module.exports = { handleAncientRuin };
