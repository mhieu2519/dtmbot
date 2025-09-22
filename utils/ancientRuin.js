// utils/ancientRuin.js

const AncientRuin = require("../models/AncientRuin");
const { addItemToInventory, getItemFromInventory, removeItemFromInventory } = require("./inventory");
const itemsAncient = require("../shops/itemsAncient");
const { getRandom, addXP } = require("./xpSystem");
// defoult sealedCounter = 10
// defoult entryLimit = 0  
const SEALED_COUNTER = 3;
const ENTRY_LIMIT = 2; // số lượt cho phép vào khi mở
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
function chooseWeighted(scenarios) {
    const totalWeight = scenarios.reduce((sum, item) => sum + item.weight, 0);
    const rand = Math.random() * totalWeight;
    let cumulative = 0;

    for (const item of scenarios) {
        cumulative += item.weight;
        if (rand < cumulative) {
            return item;
        }
    }
}
async function handleAncientRuin(user, guildId) {
    let ruin = await AncientRuin.findOne({ guildId });
    if (!ruin) {
        ruin = new AncientRuin({
            guildId,
            sealedCounter: SEALED_COUNTER,
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
            result += `🔒 Di tích đang bị phong ấn... cần chờ thêm ${ruin.sealedCounter} người để khai mở.`;
        } else {
            ruin.isOpen = true;
            ruin.entryLimit = ENTRY_LIMIT; // số lượt cho phép vào khi mở
            result += "🌌 Di tích cổ đã khai mở! Đạo hữu có thể dùng **Thiên Cổ Ngọc Giản 🗞️** để tiến vào!";
        }
    }
    // 2. Nếu di tích đang mở
    else {
        ruin.entryLimit -= 1;

        const key = getItemFromInventory(user, "heavenJade");
        if (key) {
            await removeItemFromInventory(user, "heavenJade", 1);
            result += `🏦 Đạo hữu dùng **Thiên Cổ Ngọc Giản 🗞️** tiến vào di tích! \n(Di tích còn ${ruin.entryLimit} lượt vào)\n`;
            // TODO: phát thưởng (XP, item, v.v.)

            const rand = getRandom(0, 1); // 0,1,2
            switch (rand) {
                case 0: {
                    const chosenItem = chooseWeighted(itemsAncient);
                    const item = {
                        itemId: chosenItem.id,
                        name: chosenItem.name,
                        rarity: chosenItem.rarity,
                        quantity: 1,
                        description: chosenItem.description
                    };
                    await addItemToInventory(user, item);
                    result += `⚡ Tìm thấy: **${item.name}**.\n${item.description}`;

                    break;
                }

                default: {
                    const xpGain = getRandom(800, 1500);
                    addXP(user.userId, guildId, xpGain);
                    result += `🍂 Cảm ngộ Thái Huyền Linh bia! Tăng ${xpGain} Tuvi.`;
                    break;
                }

            }

        } else {
            result += `⚠️ Đạo hữu cần **Thiên Cổ Ngọc Giản 🗞️** để vào di tích. \n(Di tích còn ${ruin.entryLimit} lượt vào)\n`;
        }

        // nếu hết lượt thì đóng di tích, reset sealedCounter
        if (ruin.entryLimit <= 0) {
            ruin.isOpen = false;
            ruin.sealedCounter = SEALED_COUNTER;
            result += "\n🏦 Di tích đã khép lại, hãy chờ lần mở tiếp theo.";
        }
    }

    await ruin.save();
    return result;
}

module.exports = { handleAncientRuin };
