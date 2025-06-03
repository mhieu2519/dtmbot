// 📁 shops/interactionCreate.js
const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const shopItems = require('./shopItems');
const UserXP = require('../models/UserXP');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Mua
    if (interaction.isStringSelectMenu() && interaction.customId === 'shop-buy') {
      const selected = interaction.values[0];
      const itemId = selected.replace('buy-', '');
      const item = shopItems.find(i => i.itemId === itemId);
      if (!item) return;

      const modal = new ModalBuilder()
        .setCustomId(`buy-${item.itemId}`)
        .setTitle(`🛒 Mua: ${item.name}`);

      const quantityInput = new TextInputBuilder()
        .setCustomId('quantity')
        .setLabel('Nhập số lượng muốn mua')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(quantityInput));
      await interaction.showModal(modal);
    }

    // Bán
    if (interaction.isStringSelectMenu() && interaction.customId === 'shop-sell') {
      const selected = interaction.values[0];
      const itemId = selected.replace('sell-', '');
      const item = shopItems.find(i => i.itemId === itemId);
      if (!item) return;

      const modal = new ModalBuilder()
        .setCustomId(`sell-${item.itemId}`)
        .setTitle(`📤 Bán: ${item.name}`);

      const quantityInput = new TextInputBuilder()
        .setCustomId('quantity')
        .setLabel('Nhập số lượng muốn bán')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(quantityInput));
      await interaction.showModal(modal);
    }

    // Xử lý mua
    if (interaction.isModalSubmit() && interaction.customId.startsWith('buy-')) {
      const itemId = interaction.customId.replace('buy-', '');
      const quantity = parseInt(interaction.fields.getTextInputValue('quantity'));
      const item = shopItems.find(i => i.itemId === itemId);
      if (!item || quantity <= 0 || (item.maxQuantity && quantity > item.maxQuantity)) {
        return interaction.reply({ content: '❌ Số lượng không hợp lệ.', ephemeral: true });
      }

      const user = await UserXP.findOneAndUpdate(
        { userId: interaction.user.id, guildId: interaction.guildId },
        {},
        { new: true, upsert: true }
      );

      const totalCost = item.price * quantity;
      if (user.stone < totalCost) {
        return interaction.reply({ content: `❌ Bạn không đủ ${totalCost}💠 để mua.`, ephemeral: true });
      }

      user.stone -= totalCost;

      const invItem = user.inventory.find(i => i.itemId === itemId);
      if (invItem) {
        invItem.quantity += quantity;
      } else {
        user.inventory.push({
          itemId: item.itemId,
          name: item.name,
          rarity: item.rarity,
          quantity,
          description: item.description
        });
      }

      await user.save();
      return interaction.reply({ content: `✅ Mua thành công ${quantity} ${item.name}!`, ephemeral: true });
    }

    // Xử lý bán
    if (interaction.isModalSubmit() && interaction.customId.startsWith('sell-')) {
      const itemId = interaction.customId.replace('sell-', '');
      const quantity = parseInt(interaction.fields.getTextInputValue('quantity'));
      const item = shopItems.find(i => i.itemId === itemId);
      if (!item || quantity <= 0) return interaction.reply({ content: '❌ Số lượng không hợp lệ.', ephemeral: true });

      const user = await UserXP.findOneAndUpdate(
        { userId: interaction.user.id, guildId: interaction.guildId },
        {},
        { new: true, upsert: true }
      );

      const invItem = user.inventory.find(i => i.itemId === itemId);
      if (!invItem || invItem.quantity < quantity) {
        return interaction.reply({ content: `❌ Bạn không có đủ ${item.name} để bán.`, ephemeral: true });
      }

      invItem.quantity -= quantity;
      if (invItem.quantity <= 0) {
        user.inventory = user.inventory.filter(i => i.itemId !== itemId);
      }
      user.stone += item.sellPrice * quantity;

      await user.save();
      return interaction.reply({ content: `✅ Bán thành công ${quantity} ${item.name}, nhận ${item.sellPrice * quantity}💰!`, ephemeral: true });
    }
  }
};
