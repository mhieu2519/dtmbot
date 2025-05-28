const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const items = require("../shops/items");

// Hàm tạo menu chọn vật phẩm
function createShopSelectMenu() {
  const options = items.map(item => ({
    label: item.name,
    description: item.description.slice(0, 50),
    value: item.id
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("shop_select")
    .setPlaceholder("Chọn vật phẩm để xem chi tiết")
    .addOptions(options);

  return new ActionRowBuilder().addComponents(selectMenu);
}

// Hàm tạo nút mua
function createBuyButton(item) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`buy_${item.id}`)
      .setLabel(`Mua với ${item.price} 💎`)
      .setStyle(ButtonStyle.Primary)
  );
}

// Hàm tìm item theo ID
function getItemById(id) {
  return items.find(i => i.id === id);
}

module.exports = {
  createShopSelectMenu,
  createBuyButton,
  getItemById
};
