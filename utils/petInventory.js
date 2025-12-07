// utils/petInventory.js
const UserXP = require("../models/UserXP");
const path = require("path");

/**
 * Thêm linh thú vào inventoryPet của user (document instance).
 * Nếu đã tồn tại petId => tăng quantity (nếu schema có quantity).
 * Nếu chưa => push entry mới.
 * @param {Mongoose Document} user - user document (đã load)
 * @param {Object} petData - { petId, name, type, level, rarity, description, imageUrl, quantity }
 * @returns {Object} insertedOrUpdatedEntry
 */
/*

async function addPetToInventory(user, petData) {
    const {
        petId,
        name,
        type = "pet",
        level = 1,
        rarity = "common",
        description = "",
        imageUrl = "",
        quantity = 1,
    } = petData;

    if (!petId) throw new Error("petId is required");

    // tìm entry hiện có
    let existing = user.inventoryPet.find(p => p.petId === petId);

    if (existing) {
        // nếu có trường quantity trong schema
        if (typeof existing.quantity === "number") {
            existing.quantity += quantity;
        } else {
            // fallback: nếu không có quantity, thêm 1 bản ghi mới
            user.inventoryPet.push({
                petId, name, type, level, rarity, description, imageUrl, obtainedAt: new Date()
            });
            existing = user.inventoryPet[user.inventoryPet.length - 1];
        }
    } else {
        if (!Array.isArray(user.inventoryPet)) {
            user.inventoryPet = [];
        }
        console.log("Kiểu dữ liệu:", typeof petData);
        console.log("petData:", petData);

        user.inventoryPet.push({
            petId, name, type, level, rarity, description, imageUrl, quantity, obtainedAt: new Date()
        });

    }

    await user.save();
    return existing;
}
*
async function addPetToInventory(user, petData) {
    const {
        petId,
        name,
        type = "pet",
        level = 1,
        rarity = "common",
        description = "",
        imageUrl = "",
        quantity = 1,
    } = petData;
    if (!petId) throw new Error("petId is required");
    const existing = user.inventoryPet.find(p => p.petId === petId);
    if (existing) {
        if (typeof existing.quantity === "number") {
            existing.quantity += quantity;
        } else {
            user.inventoryPet.push({
                petId, name, type, level, rarity, description, imageUrl, obtainedAt: new Date()
            });
        }
    }
}

*/


async function addPetToInventory(user, petData) {
    if (!petData || typeof petData !== "object") {
        throw new Error("petData must be an object");
    }

    const {
        petId,
        name,
        type = "pet",
        level = 1,
        rarity = "common",
        description = "",
        imageUrl = "",
        quantity = 1,
    } = petData;

    if (!petId) throw new Error("petId is required");

    if (!Array.isArray(user.inventoryPet)) {
        user.inventoryPet = [];
    }

    // tìm pet trong inventory
    let existing = user.inventoryPet.find(p => p.petId === petId);

    if (existing) {
        // nếu có sẵn thì cộng quantity
        if (typeof existing.quantity === "number") {
            existing.quantity += quantity;
        } else {
            existing.quantity = 1 + quantity;
        }
    } else {
        // nếu chưa có thì thêm mới
        user.inventoryPet.push({
            petId,
            name,
            type,
            level,
            rarity,
            description,
            imageUrl,
            quantity,
            obtainedAt: new Date()
        });
    }

    await user.save();
    return user.inventoryPet;
}

/**
* Lấy pet từ inventory (document).
* @param {Mongoose Document} user
* @param {string} petId
* @returns {Object|null}
*/
function getPetFromInventory(user, petId) {
    return user.inventoryPet.find(p => p.petId === petId) || null;
}

/**
 * Giảm số lượng pet; nếu quantity <= 0 thì xoá entry (nếu schema có quantity).
 * Nếu schema không có quantity, thì xoá 1 bản ghi matching petId (nếu có nhiều bản ghi).
 * @param {Mongoose Document} user
 * @param {string} petId
 * @param {number} amount
 */
async function removePetFromInventory(user, petId, amount = 1) {
    const idx = user.inventoryPet.findIndex(p => p.petId === petId);
    if (idx === -1) return null;

    const entry = user.inventoryPet[idx];

    if (typeof entry.quantity === "number") {
        entry.quantity -= amount;
        if (entry.quantity <= 0) {
            user.inventoryPet.splice(idx, 1);
        }
    } else {
        // không có quantity -> xóa 1 bản ghi
        user.inventoryPet.splice(idx, 1);
    }

    await user.save();
    return true;
}

/**
 * Phiên bản atomic (khuyên dùng nếu nhiều request thay đổi cùng user cùng lúc).
 * Sử dụng findOneAndUpdate để đảm bảo atomicity.
 *
 * addOrIncPetAtomic(userId, guildId, petData)
 */
async function addOrIncPetAtomic({ guildId, userId }, petData) {
    const { petId, name, type = "pet", level = 1, rarity = "common", description = "", imageUrl = "", quantity = 1 } = petData;
    if (!petId) throw new Error("petId required");

    // Thử tăng quantity nếu đã có
    const incResult = await UserXP.findOneAndUpdate(
        { guildId, userId, "inventoryPet.petId": petId },
        { $inc: { "inventoryPet.$.quantity": quantity } },
        { new: true }
    );

    if (incResult) {
        return incResult; // đã tăng xong
    }

    // Nếu chưa có, push mới
    const pushResult = await UserXP.findOneAndUpdate(
        { guildId, userId },
        {
            $push: {
                inventoryPet: {
                    petId, name, type, level, rarity, description, imageUrl, quantity, obtainedAt: new Date()
                }
            }
        },
        { new: true, upsert: true }
    );

    return pushResult;
}

/**
 * Truy vấn pet bằng atomic find
 */
async function getPetAtomic({ guildId, userId }, petId) {
    const user = await UserXP.findOne({ guildId, userId }, { inventoryPet: 1 });
    if (!user) return null;
    return user.inventoryPet.find(p => p.petId === petId) || null;
}


module.exports = {
    addPetToInventory,
    getPetFromInventory,
    removePetFromInventory,
    addOrIncPetAtomic,
    getPetAtomic
};
