const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { getShopItems } = require("../services/shopSystem");
const UserXP = require("../models/UserXP");


module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("🛒 Mở shop linh thạch để mua vật phẩm"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Lấy dữ liệu người dùng từ MongoDB
    let user = await UserXP.findOne({ userId, guildId });
    if (!user) {
      user = new UserXP({ userId, guildId });
      await user.save();
    }

    const items = getShopItems();

    const options = items.map(item => ({
      label: item.name,
      value: item.id,
      description: `Giá: ${item.cost} linh thạch`
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("shop_select")
        .setPlaceholder("🛍️ Chọn vật phẩm để mua")
        .addOptions(options)
    );

    await interaction.reply({
      content: `🛒 **Shop Linh Thạch:**\n💰 Bạn đang có **${user.linhThach || 0}** linh thạch.\nChọn món bạn muốn mua bên dưới:`,
      components: [row],
      ephemeral: true // chỉ hiển thị với người dùng đó
    });
  }
};