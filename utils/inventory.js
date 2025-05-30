// utils/inventory.js

/**
 * Thêm vật phẩm vào túi đồ của người dùng.
 * Nếu đã có thì tăng số lượng, chưa có thì thêm mới.
 * @param {Object} user - Tài liệu người dùng từ MongoDB (Mongoose document).
 * @param {Object} itemData - Thông tin vật phẩm muốn thêm.
 */
function chooseWeighted(scenarios) {
  const totalWeight = scenarios.reduce((sum, item) => sum + item.weight, 0);
  const rand = Math.random() * totalWeight;
  let cumulative = 0;

  for (const item of scenarios) {
    cumulative += item.weight;
    if (rand < cumulative) {
      return item;
    }
  }
}

async function addItemToInventory(user, itemData) {
  const { itemId, name, rarity = "thường", quantity = 1, description = "" } = itemData;

  const existing = user.inventory.find(item => item.itemId === itemId);

  if (existing) {
    existing.quantity += quantity;
  } else {
    user.inventory.push({
      itemId,
      name,
      rarity,
      quantity,
      description,
      obtainedAt: new Date()
    });
  }

  await user.save();
}

/**
 * Lấy thông tin vật phẩm theo ID từ inventory người dùng.
 * @param {Object} user
 * @param {string} itemId
 * @returns {Object|null}
 */
function getItemFromInventory(user, itemId) {
  return user.inventory.find(item => item.itemId === itemId) || null;
}

/**
 * Giảm số lượng vật phẩm trong inventory.
 * Nếu số lượng bằng 0 thì xoá khỏi inventory.
 * @param {Object} user
 * @param {string} itemId
 * @param {number} amount
 */
async function removeItemFromInventory(user, itemId, amount = 1) {
  const item = user.inventory.find(item => item.itemId === itemId);
  if (!item) return;

  item.quantity -= amount;
  if (item.quantity <= 0) {
    user.inventory = user.inventory.filter(i => i.itemId !== itemId);
  }

  await user.save();
}

module.exports = {
  addItemToInventory,
  getItemFromInventory,
  removeItemFromInventory,
  chooseWeighted
};
