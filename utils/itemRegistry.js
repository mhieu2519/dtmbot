// utils/itemRegistry.js
const path = require("path");

let registry = null;

function loadRegistry() {
    if (registry) return registry;
    try {
        const itemsPath = path.join(__dirname, "../items/giftitems.js");
        const arr = require(itemsPath);
        registry = new Map();
        for (const r of arr) {
            // dùng r.id nếu có, fallback petId
            const id = r.id || r.petId || r.itemId;
            if (!id) continue;
            registry.set(id, r);
        }
        return registry;
    } catch (e) {
        console.error("❌ Lỗi load item registry:", e);
        registry = new Map();
        return registry;
    }
}

/**
 * Lấy bản ghi theo id.
 * @param {string} id
 * @returns {object|null} bản ghi (bao gồm type), hoặc null nếu ko tìm
 */
function getById(id) {
    const reg = loadRegistry();
    return reg.get(id) || null;
}

/**
 * Kiểm tra id có hợp lệ hay không
 */
function exists(id) {
    return !!getById(id);
}

module.exports = { getById, exists, loadRegistry };
