const { createCanvas, loadImage, registerFont } = require("canvas");
const UserXP = require("../models/UserXP");
const { getXPForNextLevel, getUserRank } = require("../utils/xpSystem");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");

const path = require("path");
registerFont(path.join(__dirname, "../assets/fonts/Allura-Regular.ttf"), { family: "Allura" });
registerFont(path.join(__dirname, "../assets/fonts/WindSong-Medium.ttf"), { family: "WindSong" });
registerFont(path.join(__dirname, "../assets/fonts/MeowScript-Regular.ttf"), { family: "MeowScript" });
registerFont(path.join(__dirname, "../assets/fonts/Qwigley-Regular.ttf"), { family: "Qwigley" });
registerFont(path.join(__dirname, "../assets/fonts/comici.ttf"), { family: "Comic Sans MS" });
registerFont(path.join(__dirname, "../assets/fonts/Updock-Regular.ttf"), { family: "Updock" });
function getBackgroundByLevel(level) {
  if (level < 3) return "./assets/backgrounds/level_0.png";
  if (level >= 3 && level < 5) return "./assets/backgrounds/level_1_5.png";
  if (level >= 5 && level < 15) return "./assets/backgrounds/level_5_10.png";
  if (level >= 15 && level < 50) return "./assets/backgrounds/level_10_50.png";
  if (level >= 50 && level < 100) return "./assets/backgrounds/level_50_100.png";
  if (level >= 100 && level < 300) return "./assets/backgrounds/level_100_300.png";
  return "./assets/backgrounds/level_300_plus.png";
}
function getTitle(level) {
  if (level < 5) return "Phàm Nhân";
  if (level < 15) return `Luyện Khí tầng ${level - 4}`;
  if (level < 26) return "Trúc Cơ sơ kỳ";
  if (level < 37) return "Trúc Cơ trung kỳ";
  if (level < 50) return "Trúc Cơ hậu kỳ";
  if (level < 60) return "Kết Đan sơ kỳ";
  if (level < 70) return "Kết Đan trung kỳ";
  if (level < 80) return "Kết Đan hậu kỳ";
  if (level < 100) return "Nguyên Anh sơ kỳ";
  if (level < 200) return "Nguyên Anh trung kỳ";
  if (level < 300) return "Nguyên Anh hậu kỳ";
  return "Hoá Thần";
}
function getGlowColor(level) {
  if (level < 5) return "#c0c0c0";          // Xám nhẹ bạc
  if (level < 15) return "#00bbff";         // Xanh biển
  if (level < 50) return "#66ff66";         // Lục nhạt
  if (level < 100) return "#ffcc00";        // Vàng rực
  if (level < 300) return "#ff0000";        // Đỏ rực
  return "#ff00ff";                         // Hồng tím huyền ảo
}
// set font theo level
function setFont(level) {
  if (level < 5) return "40px arial";
  if (level < 15) return "40px Qwigley";
  if (level < 50) return "40px WindSong";
  if (level < 100) return "40px MeowScript";
  if (level < 300) return "40px Updock";
  return "40px Allura";
}

// Hàm hỗ trợ vẽ thanh bo góc
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function strokeRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.stroke();
}

function getColorByRarity(rarity) {
  switch (rarity) {
    case 'common': return '#ffffff';
    case 'rare': return '#4dabf7';
    case 'epic': return '#be4bdb';
    case 'legendary': return '#fab005';
    default: return '#ffffff';
  }
}


async function showRank(interaction) {

  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const userData = await UserXP.findOne({ guildId, userId });
  if (!userData) return interaction.editReply("Bạn chưa có dữ liệu XP nào.");

  const nextXP = getXPForNextLevel(userData.level);
  const rank = await getUserRank(userId, guildId);
  const percent = userData.xp / nextXP;

  const canvas = createCanvas(800, 250);
  const ctx = canvas.getContext("2d");
  const diamond = await loadImage("./assets/icons/diamond.png");

  //const member = interaction.member;
  /*
    const displayName= interaction.member?.nickname ||
      interaction.member?.user?.globalName ||
      interaction.member?.user?.username ||
      "Ẩn Danh";
  */
  const displayName = interaction.member.displayName;
  // 🖼️ Nền gradient
  const gradient = ctx.createLinearGradient(0, 0, 800, 250);
  gradient.addColorStop(0, "#4e54c8");
  gradient.addColorStop(1, "#8f94fb");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Vẽ ảnh nền
  const backgroundPath = getBackgroundByLevel(userData.level);
  const background = await loadImage(backgroundPath);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  //console.log(userData.level, backgroundPath);

  // Phủ lớp mờ tối để dễ nhìn chữ
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 📸 Avatar
  const avatarURL = interaction.user.displayAvatarURL({ extension: "png", size: 256 });
  const avatar = await loadImage(avatarURL);

  // Avatar bo tròn + viền
  ctx.save();
  ctx.beginPath();
  ctx.arc(125, 125, 81, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 44, 44, 162, 162);
  ctx.restore();

  // Viền avatar
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(125, 125, 81, 0, Math.PI * 2);
  ctx.stroke();

  // ✍️ Text: tên
  ctx.shadowColor = getGlowColor(userData.level);
  ctx.shadowBlur = 5;
  ctx.fillStyle = "#fff";
  ctx.font = setFont(userData.level);
  //ctx.fillText(`${interaction.member?.nickname || interaction.user.username}`, 250, 70);
  ctx.fillText(displayName, 250, 70);

  // Thông tin level/xp/rank
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 20;
  ctx.font = "Italic 24px Comic Sans MS";
  ctx.fillText(`Level: ${userData.level}`, 250, 110);
  ctx.fillText(`XP: ${userData.xp} / ${nextXP}`, 250, 150);
  ctx.fillText(`Rank: #${rank}`, 250, 190);

  ctx.drawImage(diamond, 370, 170, 24, 24); // vị trí và kích thước tùy chỉnh
  ctx.fillText(`${userData.stone}`, 400, 190);

  ctx.font = "30px Allura";
  ctx.fillStyle = getGlowColor(userData.level);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`~ ${getTitle(userData.level)} ~`, 125, 230);

  // 📊 Thanh XP
  ctx.shadowColor = getGlowColor(userData.level);
  ctx.shadowBlur = 10;
  const barX = 250;
  const barY = 210;
  const barWidth = 500;
  const barHeight = 20;
  /*// nền
    ctx.fillStyle = "#333";
    drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 10); // 10 là độ bo góc
  */
  // Vẽ phần tiến độ XP
  ctx.fillStyle = "#34a853"; // màu thanh xp
  drawRoundedRect(ctx, barX, barY, barWidth * percent, barHeight, 10); // radius = 10

  // Viền bar
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  strokeRoundedRect(ctx, barX, barY, barWidth, barHeight, 10); // bo góc 10px

  const buffer = canvas.toBuffer("image/png");

  return buffer;
}

async function createInventoryImage(displayName, stone, inventory, page = 1, itemsPerPage = 3) {
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext('2d');

  const diamond = await loadImage("./assets/icons/diamond.png");


  // Nền
  const bg = await loadImage('./assets/backgrounds/inventory.png');
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);


  ctx.font = '28px Updock';
  ctx.fillStyle = '#1A2A4F';
  ctx.fillText(`💰 Túi trữ vật – Trang ${page}`, 40, 50);

  const startIndex = (page - 1) * itemsPerPage;
  const pageItems = inventory.slice(startIndex, startIndex + itemsPerPage);

  const itemHeight = 70;
  pageItems.forEach((item, index) => {
    const y = 100 + index * itemHeight;
    ctx.fillStyle = getColorByRarity(item.rarity);
    ctx.fillText(`${item.name} x${item.quantity}`, 60, y);
    ctx.font = '28px Updock';
    ctx.fillStyle = '#ffe2e7';
    ctx.fillText(`${item.description}`, 60, y + 25);
    ctx.font = '24px Updock';
  });

  // Hiển thị tên và linh thạch
  ctx.font = '26px Updock';
  ctx.fillStyle = '#ffd700';
  ctx.drawImage(diamond, 700, 45, 24, 24);
  ctx.fillText(`${stone}`, 730, 60);
  ctx.textAlign = "right";
  ctx.fillText(`${displayName}`, 750, 35);



  return canvas.toBuffer('image/png');
}

function createInventoryButtons(currentPage, totalPages) {
  const row = new ActionRowBuilder();

  if (currentPage > 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`prev_inventory_${currentPage - 1}`)
        .setLabel('⬅ Trang trước')
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (currentPage < totalPages) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`next_inventory_${currentPage + 1}`)
        .setLabel('Trang sau ➡')
        .setStyle(ButtonStyle.Primary)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`back_to_profile`)
      .setLabel('🔙🖼️ Profile')
      .setStyle(ButtonStyle.Secondary)
  );

  row.addComponents(
    new ButtonBuilder()
      .setCustomId('use_item')
      .setLabel('🩸 Sử dụng vật phẩm')
      .setStyle(ButtonStyle.Secondary)
  );
  row.addComponents(
    new ButtonBuilder()
      .setCustomId('check_buffs')
      .setLabel('🧪 Buff hiện tại')
      .setStyle(ButtonStyle.Success)
  );

  return [row];
}




module.exports = { showRank, getTitle, createInventoryImage, createInventoryButtons };