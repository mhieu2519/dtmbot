const {
  createShopSelectMenu
} = require("../utils/shopUtils");

module.exports = {
  name: "shop",
  description: "Xem cửa hàng vật phẩm",
  run: async (client, interaction) => {
    await interaction.reply({
      content: "🛒 Chào mừng đến cửa hàng! Chọn một vật phẩm:",
      components: [createShopSelectMenu()],
      ephemeral: true
    });
  }
};
