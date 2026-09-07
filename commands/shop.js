const {
  SlashCommandBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const shopItems = require('../shops/shopItems'); // danh sách vật phẩm shop
const UserXP = require('../models/UserXP');
const { addItemToInventory, removeItemFromInventory } = require('../utils/inventory');
const { addXP } = require('../utils/xpSystem');
const sellableItems = require('../shops/sellableItems');

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

async function handleShopCommand(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("shop_buy")
      .setLabel("🛒 Mua")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("shop_sell")
      .setLabel("💵 Bán")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    content: "🛍️ Chào mừng đến với cửa hàng vật phẩm tông môn:",
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// Xử lý sự kiện khi người dùng nhấn nút mua hàng
async function handleShopBuy(interaction) {
  const options = shopItems.map((item, index) => ({
    label: item.name,
    description: `Giá: ${item.price} linh thạch`,
    // value: `buy_${item.id}`,
    value: item.id
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_buy_item')
      .setPlaceholder('🛒 Chọn vật phẩm muốn mua...')
      .addOptions(options)
  );

  await interaction.update({
    content: '🛍️ **Danh sách vật phẩm có thể mua:**',
    components: [row],
    //files: [],
  });
}

// Xử lý sự kiện khi người dùng chọn vật phẩm để mua
async function handleBuyItemSelection(interaction) {

  const selectedItemId = interaction.values[0];
  const item = shopItems.find(i => i.id === selectedItemId);
  if (!item) return await interaction.reply({ content: '❌ Vật phẩm không tồn tại.', flags: MessageFlags.Ephemeral });
  //const index = item.maxQuantity > 25 ? 25 : item.maxQuantity; // Giới hạn số lượng tối đa là 25 cho menu Discord 
  const quantityOptions = Array.from({ length: item.maxQuantity }, (_, i) => {
    const quantity = i + 1;
    return {
      label: `x${quantity}`,
      description: `Mua ${quantity} ${item.name} (${item.price * quantity} linh thạch)`,
      value: `buy::${item.id}::${quantity}`
    };
  });

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_quantity_item')
      .setPlaceholder('🧮 Chọn số lượng muốn mua...')
      .addOptions(quantityOptions)
  );

  await interaction.update({
    content: `🛒 Đạo hữu đã chọn **${item.name}**\n🗒️ Mô tả: ${item.description}\n💵 Giá mỗi vật phẩm: ${item.price} linh thạch\n➡️ Đạo hữu vui lòng chọn số lượng muốn mua:`,
    components: [row]
  });
}
// Xử lý sự kiện khi người dùng chọn số lượng mua
async function handleBuyQuantitySelection(interaction, user) {

  const raw = interaction.values[0];
  const parts = raw.split('::');
  const quantity = parseInt(parts.pop());
  const itemId = parts.slice(1).join('::');
  const item = shopItems.find(i => i.id === itemId);
  if (!item) {
    console.log('❌ Không tìm thấy item:', itemId);
    return await interaction.update({ content: `❌ Không tìm thấy vật phẩm: ${itemId}`, components: [] });
  }

  const totalCost = item.price * quantity;
  const canAfford = user.stone >= totalCost;

  const buyButton = new ButtonBuilder()
    .setCustomId(`confirm::buy::${item.id}::${quantity}`)
    .setLabel(`🛒 Mua x${quantity} (${totalCost} linh thạch)`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!canAfford);

  const row = new ActionRowBuilder().addComponents(buyButton);

  await interaction.update({
    content: `🛍️ **${item.name}** x${quantity}\n💰 Tổng giá: ${totalCost} linh thạch\n📦 Số dư của đạo hữu: ${user.stone}`,
    components: [row]
  });
}

// Xử lý sự kiện khi người dùng xác nhận mua hàng
async function handleConfirmPurchase(interaction, itemId, quantity = 1) {

  const item = shopItems.find(i => i.id === itemId);
  const user = await UserXP.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
  if (!item || !user) return;
  const totalCost = item.price * quantity;
  if (user.stone < totalCost) {
    return await interaction.reply({
      content: '❌ Đạo hữu không đủ linh thạch để mua số lượng này.',
      flags: MessageFlags.Ephemeral
    });
  }

  user.stone -= totalCost;

  await addItemToInventory(user, {
    itemId: item.id,
    name: item.name,
    rarity: item.rarity,
    quantity,
    description: item.description
  });

  await user.save();

  const senderMember = await interaction.guild.members.fetch(interaction.user.id);
  const senderDisplayName = senderMember.displayName;

  const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
  if (logChannel && logChannel.isTextBased()) {
    await logChannel.send({
      content: `📦 **Log mua vật phẩm**\n` +
        `Người mua: ${senderDisplayName} - ${interaction.user.tag} (${interaction.user.id})\n` +
        `Vật phẩm: ${item.name} (ID: ${item.id})\n` +
        `Số lượng: ${quantity}\n` +
        `Tổng chi phí: ${totalCost} 💎\n` +
        `Thời gian: <t:${Math.floor(Date.now() / 1000)}:F>`,
    });
  } else {
    console.warn("⚠️ Không thể gửi log – không tìm thấy kênh hoặc không phải kênh text.");
  }

  const levelUpChannel = await interaction.client.channels.fetch(process.env.LEVELUP_CHANNEL_ID);
  if (levelUpChannel) {
    await levelUpChannel.send({
      content: `✅ Đạo hữu ${senderDisplayName} đã mua **${item.name}** x${quantity} thành công!\n` +
        `💸 Giá: ${totalCost} 💎`
    });
  } else {
    console.warn("Không tìm thấy kênh thông báo level up!");
  }

  await interaction.update({
    content: `✅ Đạo hữu đã mua **${item.name}** x${quantity} với giá ${totalCost} linh thạch.`,
    components: [], // ✅ Xóa nút sau khi mua thành công
    flags: MessageFlags.Ephemeral
  });
}

// Bán hàng

function getSellableItemsFromInventory(inventory) {
  return inventory.filter(invItem =>
    sellableItems.some(sellItem => sellItem.id === invItem.itemId)
  );
}
// Xử lý sự kiện khi người dùng chọn vật phẩm để bán
async function handleShopSell(interaction) {

  const userId = interaction.user.id;
  const guildId = interaction.guild.id;
  const userData = await UserXP.findOne({ guildId, userId });

  if (!userData || !userData.inventory || userData.inventory.length === 0) {
    return await interaction.update({
      content: '📭 Túi trữ vật của đạo hữu trống, không có gì để bán.',
      components: [],
    });
  }
  const sellable = getSellableItemsFromInventory(userData.inventory);
  if (sellable.length === 0) {
    return interaction.reply({
      content: '❌ Không có vật phẩm nào có thể bán.',
      flags: MessageFlags.Ephemeral
    });
  }
  // chỉ hiện vật phẩm ở túi đồ tương thích với hệ thống
  const options = sellable.map(invItem => {
    const sellInfo = sellableItems.find(i => i.id === invItem.itemId);
    return {
      label: `${sellInfo.name} x${invItem.quantity}`,
      description: `Giá bán: ${sellInfo.sellPrice} linh thạch`,
      value: `sell::${invItem.itemId}`
    };
  });

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_sell_item')
      .setPlaceholder('💰 Chọn vật phẩm muốn bán...')
      .addOptions(options)
  );

  await interaction.update({
    content: '💼 **Danh sách vật phẩm đạo hữu đang sở hữu có thể bán:**',
    components: [row],
    files: [],
  });
}

async function handleSellQuantitySelection(interaction, user) {

  const raw = interaction.values[0];
  const parts = raw.split('::');
  const quantity = parseInt(parts.pop());
  const itemId = parts.slice(1).join('::');

  const itemData = sellableItems.find(i => i.id === itemId);
  const inventoryItem = user.inventory.find(i => i.itemId === itemId);

  if (!itemData || !inventoryItem || inventoryItem.quantity < quantity) {
    return interaction.followUp({
      content: '❌ Không hợp lệ hoặc không đủ số lượng.',
      flags: MessageFlags.Ephemeral
    });
  }

  const totalStone = itemData.sellPrice * quantity;
  const totalExp = (itemData.bonusExp || 0) * quantity;

  const sellButton = new ButtonBuilder()
    .setCustomId(`confirm::sell::${itemId}::${quantity}`)
    .setLabel(`💰 Bán x${quantity} (${totalStone} 💎 ${totalExp ? ` + ${totalExp} tuvi` : ''})`)
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(sellButton);

  await interaction.update({
    content: `📦 Đạo hữu chọn bán **${itemData.name}** x${quantity}\n💎 Nhận: ${totalStone} linh thạch${totalExp ? ` và ${totalExp} tuvi` : ''}`,
    components: [row]
  });
}

async function handleConfirmSell(interaction, itemId, quantity) {

  const userId = interaction.user.id;
  const guildId = interaction.guild.id;

  const userData = await UserXP.findOne({ userId, guildId });
  const inventoryItem = userData.inventory.find(i => i.itemId === itemId);
  const sellItem = sellableItems.find(i => i.id === itemId);

  if (!inventoryItem || inventoryItem.quantity < quantity || !sellItem) {
    return interaction.reply({
      content: '❌ Không thể bán vật phẩm này.',
      flags: MessageFlags.Ephemeral
    });
  }

  const totalStone = sellItem.sellPrice * quantity;
  const totalExp = (sellItem.bonusExp || 0) * quantity;

  await removeItemFromInventory(userData, itemId, quantity);

  // Cộng linh thạch
  userData.stone += totalStone;
  await userData.save();

  // Gọi hàm addXP nếu có EXP bonus
  if (totalExp > 0) {
    await addXP(userId, guildId, totalExp, interaction.message); // truyền interaction.message để lấy guild, nickname, role
  }

  const senderMember = await interaction.guild.members.fetch(interaction.user.id);
  const senderDisplayName = senderMember.displayName;

  const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
  if (logChannel && logChannel.isTextBased()) {
    await logChannel.send({
      content: `💰 **Log bán vật phẩm**\n` +
        `Người bán: ${senderDisplayName} - ${interaction.user.tag} (${interaction.user.id})\n` +
        `Vật phẩm: ${sellItem.name} (ID: ${itemId})\n` +
        `Số lượng: ${quantity}\n` +
        `Tổng giá trị: ${totalStone} linh thạch ${totalExp ? ` và ${totalExp} tuvi` : ''}\n` +
        `Thời gian: <t:${Math.floor(Date.now() / 1000)}:F>`,
    });
  } else {
    console.warn("⚠️ Không thể gửi log – không tìm thấy kênh hoặc không phải kênh text.");
  }

  const levelUpChannel = await interaction.client.channels.fetch(process.env.LEVELUP_CHANNEL_ID);
  if (levelUpChannel) {
    await levelUpChannel.send({
      content: `✅ Đạo hữu ${senderDisplayName} đã bán **${sellItem.name}** x${quantity} thành công!\n` +
        `💎 Nhận ${totalStone} linh thạch${totalExp ? ` và ${totalExp} tuvi` : ''}`
    });
  } else {
    console.warn("Không tìm thấy kênh thông báo level up!");
  }
  // Gửi phản hồi thành công
  await interaction.update({
    content: `✅ Đạo hữu đã bán **${sellItem.name}** x${quantity} thành công!\n💎 Nhận ${totalStone} linh thạch${totalExp ? ` và ${totalExp} tuvi` : ''}`,
    components: [],
    flags: MessageFlags.Ephemeral
  });
}
module.exports = {
  handleShopCommand,
  handleShopBuy,
  handleShopSell,
  handleBuyItemSelection,
  handleBuyQuantitySelection,
  handleConfirmPurchase,
  handleConfirmSell,
  handleSellQuantitySelection,
};
