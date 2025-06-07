const { 
  SlashCommandBuilder, 
  MessageFlags, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder 
} = require('discord.js');

const usableItems = require('../shops/usableItems');
const UserXP = require('../models/UserXP');
const { removeItemFromInventory} = require('../utils/inventory'); 
const { addXP} = require('../utils/xpSystem');

// xử lí chọn vật phẩm
async function handleUseItem(interaction) {

  const userId = interaction.user.id;
  const guildId = interaction.guild.id;
  const user = await UserXP.findOne({ userId, guildId });
  const usableInInventory = user.inventory.filter(item =>
    usableItems.find(u => u.id === item.itemId)
  );

  if (usableInInventory.length === 0) {
    return interaction.reply({
      content: '📭 Đạo hữu không có vật phẩm nào có thể sử dụng.',
      flags: MessageFlags.Ephemeral
    });
  }

    const options = usableInInventory.map(item => {
        const info = usableItems.find(i => i.id === item.itemId);
        return {
        label: `${info.name} x${item.quantity}`,
        description: info.description,
        value: `use::${item.itemId}`
        };
  });

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_use_item')
      .setPlaceholder('🔍 Chọn vật phẩm để sử dụng')
      .addOptions(options)
  );

  return interaction.reply({
    content: '🔧 Chọn vật phẩm đạo hữu muốn sử dụng:',
    components: [row],
    flags: MessageFlags.Ephemeral
  });
}

// sau khi chọn vật phẩm + số lượng
async function handleUseItemSelection(interaction) {

  const userId = interaction.user.id;
  const guildId = interaction.guild.id;
  const user = await UserXP.findOne({ userId, guildId });

  const [_, itemId] = interaction.values[0].split('::');
  const item = usableItems.find(i => i.id === itemId);
 
// Tìm vật phẩm trong túi đồ
  const invItem = user.inventory.find(i => i.itemId === itemId);
 // Giới hạn chọn từ 1 đến số lượng đang có (tối đa 25 cho menu Discord)
  const maxQuantity = Math.min(invItem.quantity, 25);


  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`confirm_use_quantity`)
      .setPlaceholder('🧮 Chọn số lượng muốn sử dụng')
      .addOptions(
        Array.from({ length: maxQuantity }, (_, i) => ({
          label: `${i + 1}`,
          value:  `use::${itemId}::${i + 1}`
        }))
      )
  );

  return interaction.update({
    content: `🩸 Đạo hữu muốn sử dụng bao nhiêu **${item.name}**?`,
    components: [row]
  });
}

// thực hiện chức năng đã định sẵn
async function handleUseItemConfirm(interaction, itemId, quantity) {

  const userId = interaction.user.id;
  const guildId = interaction.guild.id;
  const user = await UserXP.findOne({ userId, guildId });

  const itemInfo = usableItems.find(i => i.id === itemId);

  // Trừ vật phẩm khỏi túi
  await removeItemFromInventory(user, itemId, quantity);

  // Gọi hàm theo chức năng
  switch (itemInfo.effect) {
    case 'gainExp':
      await addXP(userId, guildId, itemInfo.amount * quantity, interaction.client);
      break;
    case 'gainStone':
     // await addStone(user, itemInfo.amount * quantity);
      break;
    // Mở rộng thêm ở đây
  }
  const userMember = await interaction.guild.members.fetch(userId);
  const userDisplayName = userMember.displayName;
  const levelUpChannel = await interaction.client.channels.fetch(process.env.LEVELUP_CHANNEL_ID);
  if (levelUpChannel) {
    await levelUpChannel.send({
        content: `✅ Đạo hữu ${userDisplayName} đã sử dụng **${itemInfo.name}** x${quantity} thành công!\n` +
                 `💎 Nhận ${itemInfo.amount * quantity} exp`
    });
    } else {
      console.warn("Không tìm thấy kênh thông báo level up!");
    }

  return interaction.update({
    content: `✅ Đạo hữu đã sử dụng thành công **${itemInfo.name} x${quantity}**.\n` +
             `🎁 Tác dụng: ${itemInfo.effect.replace('_', ' ')} +${itemInfo.amount * quantity}`,
    components: []
  });
}


module.exports = {
  handleUseItem,
  handleUseItemSelection,
  handleUseItemConfirm
};