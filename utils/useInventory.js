// utils/useInventory.js
const {
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

const usableItems = require('../shops/usableItems');
const UserXP = require('../models/UserXP');
const { removeItemFromInventory } = require('./inventory');
const { addXP } = require('./xpSystem');
const BuffClasses = require('../buffs'); // mapping buffName => class

// 🎯 Thêm buff mới (không gộp, cho phép nhiều buff cùng effect nhưng khác value)
async function addBuff(user, effect, value, duration) {
  user.activeBuffs = user.activeBuffs || [];

  // Kiểm tra xem có buff giống hệt (effect + value) chưa
  const existing = user.activeBuffs.find(b => b.effect === effect && b.value === value);

  if (existing) {
    // Nếu đã có cùng effect + value -> chỉ cộng thêm duration (stack)
    existing.duration += duration;
  } else {
    // Nếu khác value -> push thành buff mới
    user.activeBuffs.push({ effect, value, duration });
  }

  // Sắp xếp lại: buff mạnh hơn đứng trước
  user.activeBuffs.sort((a, b) => b.value - a.value);

  await user.save();
}


// 🩸 Giao diện chọn vật phẩm để dùng
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

// 🧮 Chọn số lượng
async function handleUseItemSelection(interaction) {
  const userId = interaction.user.id;
  const guildId = interaction.guild.id;
  const user = await UserXP.findOne({ userId, guildId });

  const [_, itemId] = interaction.values[0].split('::');
  const item = usableItems.find(i => i.id === itemId);
  const invItem = user.inventory.find(i => i.itemId === itemId);

  const maxQuantity = Math.min(invItem.quantity, 25);

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`confirm_use_quantity`)
      .setPlaceholder('🧮 Chọn số lượng muốn sử dụng')
      .addOptions(
        Array.from({ length: maxQuantity }, (_, i) => ({
          label: `${i + 1}`,
          value: `use::${itemId}::${i + 1}`
        }))
      )
  );

  return interaction.update({
    content: `🩸 Đạo hữu muốn sử dụng bao nhiêu **${item.name}**?`,
    components: [row]
  });
}

// ✅ Thực hiện khi người dùng xác nhận sử dụng
async function handleUseItemConfirm(interaction, itemId, quantity) {
  const userId = interaction.user.id;
  const guildId = interaction.guild.id;
  const user = await UserXP.findOne({ userId, guildId });
  const itemInfo = usableItems.find(i => i.id === itemId);

  if (!itemInfo) {
    return interaction.reply({
      content: `⚠️ Không tìm thấy vật phẩm.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // Trừ khỏi túi đồ
  await removeItemFromInventory(user, itemId, quantity);

  let effectResultText = '';

  if (typeof itemInfo.effect === 'object' && itemInfo.effect.type) {
    // ⚡ Là buff
    const BuffClass = BuffClasses[itemInfo.effect.type];
    if (!BuffClass) {
      return interaction.reply({
        content: `⚠️ Buff '${itemInfo.effect.type}' chưa được hỗ trợ.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Áp dụng buff
    await addBuff(user, itemInfo.effect.type, itemInfo.effect.value, itemInfo.effect.duration * quantity);

    const tempBuff = new BuffClass(itemInfo.effect);
    effectResultText = `🧪 Nhận buff **${tempBuff.name}**: ${tempBuff.description || `+${tempBuff.value}`}.\n` +
      `⏳ Kéo dài ${itemInfo.effect.duration * quantity} lượt.`;
  } else {
    // ⭐ Là item thường
    switch (itemInfo.effect) {
      case 'gainExp':
        const xp = itemInfo.amount * quantity;
        await addXP(userId, guildId, xp, interaction.client);
        effectResultText = `✨ Nhận ${xp} XP.`;
        break;

      case 'gainStone':
        const stones = itemInfo.amount * quantity;
        user.stone = (user.stone || 0) + stones;
        await user.save();
        effectResultText = `💎 Nhận ${stones} linh thạch.`;
        break;

      default:
        effectResultText = `⚠️ Hiệu ứng chưa hỗ trợ: ${itemInfo.effect}`;
        break;
    }
  }

  // Thông báo ra channel (nếu có)
  try {
    const member = await interaction.guild.members.fetch(userId);
    const displayName = member.displayName;
    const channel = await interaction.client.channels.fetch(process.env.LEVELUP_CHANNEL_ID);

    if (channel) {
      await channel.send(`✅ Đạo hữu **${displayName}** đã sử dụng **${itemInfo.name} x${quantity}**.\n${effectResultText}`);
    }
  } catch (err) {
    console.warn('Không gửi được thông báo sử dụng vật phẩm:', err.message);
  }

  return interaction.update({
    content: `✅ Đạo hữu đã sử dụng **${itemInfo.name} x${quantity}**.\n${effectResultText}`,
    components: []
  });
}

module.exports = {
  handleUseItem,
  handleUseItemSelection,
  handleUseItemConfirm
};
