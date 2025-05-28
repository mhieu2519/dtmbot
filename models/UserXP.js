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
});

module.exports = mongoose.model("UserXP", userXPSchema);
