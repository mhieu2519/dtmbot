// ../models/GiftCode.js
const mongoose = require("mongoose");

const giftCodeSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true },
    rewards: {
        xp: { type: Number, default: 0 },
        stone: { type: Number, default: 0 },
        items: [
            {
                itemId: String,
                quantity: Number
            }
        ],
        pets: [
            {
                petId: String,
                quantity: Number
            }
        ]
    },
    expiresAt: {
        type: Date,
        default: null,  // null = không hết hạn
        index: { expireAfterSeconds: 0 } // ⚡ TTL index: MongoDB tự xóa khi hết hạn
    },
    maxUses: { type: Number, default: 1 },    // số lần tối đa toàn server có thể dùng
    usedBy: [String],                         // danh sách userId đã dùng
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("GiftCode", giftCodeSchema);
