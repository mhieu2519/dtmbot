// models/AncientRuin.js
const mongoose = require("mongoose");

const ancientRuinSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    sealedCounter: { type: Number, default: 10 },  // số lần chạm còn lại trước khi mở
    entryLimit: { type: Number, default: 0 },      // số lượt còn lại khi mở
    isOpen: { type: Boolean, default: false }
});

module.exports = mongoose.model("AncientRuin", ancientRuinSchema);
