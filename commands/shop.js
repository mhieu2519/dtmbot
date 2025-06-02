const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

 async function handleShop(interaction) {
  // Tạo các nút lựa chọn
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("shop_buy")
      .setLabel("🛒 Mua vật phẩm")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("shop_sell")
      .setLabel("💰 Bán vật phẩm")
      .setStyle(ButtonStyle.Secondary)
  );

  const reply = await interaction.reply({
    content: "🧧 Chào mừng đạo hữu đến cửa hàng! Hãy chọn hành động:",
    components: [row],
    ephemeral: true,
  });

  // Tạo collector để nghe lựa chọn người dùng
  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000, // 1 phút
  });

  collector.on("collect", async (btnInteraction) => {
    if (btnInteraction.user.id !== interaction.user.id)
      return btnInteraction.reply({
        content: "❌ Bạn không phải người đã mở menu này.",
        ephemeral: true,
      });

    if (btnInteraction.customId === "shop_buy") {
      await handleBuy(btnInteraction);
    } else if (btnInteraction.customId === "shop_sell") {
      await handleSell(btnInteraction);
    }
  });

  collector.on("end", async () => {
    // Xóa nút khi hết thời gian
    try {
      await reply.edit({ components: [] });
    } catch (err) {
      console.warn("❌ Không thể xóa nút shop khi hết thời gian:", err);
    }
  });
};

// 🛒 Hàm xử lý mua hàng
async function handleBuy(interaction) {
  await interaction.update({
    content: "🛒 Đạo hữu đang vào cửa hàng mua vật phẩm...\n(đang phát triển...)",
    components: [],
  });

  // TODO: Hiển thị danh sách vật phẩm để mua
}

// 💰 Hàm xử lý bán hàng
async function handleSell(interaction) {
  await interaction.update({
    content: "💰 Đạo hữu đang vào cửa hàng bán vật phẩm...\n(đang phát triển...)",
    components: [],
  });

  // TODO: Hiển thị vật phẩm trong túi để bán
}


module.exports ={ handleShop, handleBuy, handleSell };