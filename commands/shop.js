// 📁 commands/shop.js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const shopItems = require('../shops/shopItems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Mở giao diện cửa hàng'),

  async execute(interaction) {
    const buyOptions = shopItems.map(item => ({
      label: `${item.name} (${item.price}💠)`,
      description: item.description,
      value: `buy-${item.itemId}`
    }));

    const sellOptions = shopItems
      .filter(i => i.sellPrice > 0)
      .map(item => ({
        label: `${item.name} (+${item.sellPrice}💰)`,
        description: item.description,
        value: `sell-${item.itemId}`
      }));

    const row1 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('shop-buy')
        .setPlaceholder('🛒 Chọn vật phẩm để mua')
        .addOptions(buyOptions)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('shop-sell')
        .setPlaceholder('📤 Chọn vật phẩm để bán')
        .addOptions(sellOptions)
    );

    await interaction.reply({
      content: '🛍️ **Chào mừng đến với Cửa Hàng!**\nChọn để mua hoặc bán vật phẩm:',
      components: [row1, row2],
      ephemeral: true
    });
  }
};
