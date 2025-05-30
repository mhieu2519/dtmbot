const mongoose = require("mongoose");

const userXPSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  stone: { type: Number, default: 0 }, // Thêm trường stone
  lastMessage: { type: Date, default: new Date(0) },
  lastDaily: { type: Date, default: null }, // ⬅️ Thêm dòng này
  lastSecretRealmTime: { type: Date, default: null }, // ⬅️ Thêm dòng này
    // 🎒 Inventory chi tiết
  inventory: [
    {
      itemId: String,         // ID duy nhất của vật phẩm
      name: String,           // Tên vật phẩm
      rarity: String,         // Độ hiếm (ví dụ: "thường", "hiếm", "truyền thuyết")
      quantity: { type: Number, default: 0 },
      description: String,    // Mô tả vật phẩm
      obtainedAt: { type: Date, default: Date.now } // Ngày nhận
    }
  ]


});

module.exports = mongoose.model("UserXP", userXPSchema);
