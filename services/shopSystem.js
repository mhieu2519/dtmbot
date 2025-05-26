const UserXP = require("../models/UserXP");

const shopItems = [
  { id: "xp_small", name: "📘 Gói Kinh Nghiệm Nhỏ", cost: 100, rewardXP: 100 },
  { id: "xp_medium", name: "📕 Gói Kinh Nghiệm Trung", cost: 250, rewardXP: 300 },
  { id: "item_scroll", name: "📜 Bí Tịch Thường", cost: 500, rewardItem: "scroll" },
];

function getShopItems() {
  return shopItems;
}

async function buyItem(userId, guildId, itemId) {
  const user = await UserXP.findOne({ userId, guildId });
  if (!user) throw new Error("Không tìm thấy người dùng.");

  const item = shopItems.find(i => i.id === itemId);
  if (!item) throw new Error("Vật phẩm không tồn tại.");

  if (user.linhThach < item.cost) throw new Error("Không đủ linh thạch!");

  user.linhThach -= item.cost;
  if (item.rewardXP) user.xp += item.rewardXP;

  // Nếu có hệ thống vật phẩm, bạn xử lý ở đây (ví dụ user.inventory.push(...))

  await user.save();
  return item;
}

module.exports = { getShopItems, buyItem };
