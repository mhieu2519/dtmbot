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
  lastTransfer: { type: Date, default: null },
  // Inventory chi tiết
  inventory: [
    {
      itemId: String,         // ID duy nhất của vật phẩm
      name: String,           // Tên vật phẩm
      rarity: String,         // Độ hiếm (ví dụ: "thường", "hiếm", "truyền thuyết")
      quantity: { type: Number, default: 0 },
      description: String,    // Mô tả vật phẩm
      obtainedAt: { type: Date, default: Date.now } // Ngày nhận
    }
  ],
  inventoryPet: [
    {
      petId: String,          // ID duy nhất của linh thú
      name: String,           // Tên linh thú
      type: String,           // Loại linh thú (ví dụ: "thú cưng", "huyền thoại")
      level: { type: Number, default: 1 }, // Cấp độ linh thú
      rarity: String,         // Độ hiếm (ví dụ: "thường", "hiếm", "truyền thuyết")
      description: String,    // Mô tả linh thú
      obtainedAt: { type: Date, default: Date.now } // Ngày nhận
    }
  ],
  // ✅ Thêm phần buff ở đây
  // ✅ Lưu danh sách buff đang hoạt động
  activeBuffs: [
    {
      effect: String,
      value: Number,
      duration: Number
    }
  ]

});

module.exports = mongoose.model("UserXP", userXPSchema);
