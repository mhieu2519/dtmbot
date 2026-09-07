const { createCanvas, loadImage, registerFont } = require("canvas");
const UserXP = require("../models/UserXP");
const { getXPForNextLevel, getUserRank } = require("../utils/xpSystem");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");

const path = require("path");
registerFont(path.join(__dirname, "../assets/fonts/Allura-Regular.ttf"), { family: "Allura" });
registerFont(path.join(__dirname, "../assets/fonts/WindSong-Medium.ttf"), { family: "WindSong" });
registerFont(path.join(__dirname, "../assets/fonts/MeowScript-Regular.ttf"), { family: "MeowScript" });
registerFont(path.join(__dirname, "../assets/fonts/Qwigley-Regular.ttf"), { family: "Qwigley" });
registerFont(path.join(__dirname, "../assets/fonts/ComicSans.ttf"), { family: "Comic Sans MS" });
registerFont(path.join(__dirname, "../assets/fonts/Updock-Regular.ttf"), { family: "Updock" });
registerFont(path.join(__dirname, "../assets/fonts/Pacifico-Regular.ttf"), { family: "Pacifico" });
function getBackgroundByLevel(level) {
  if (level < 3) return "./assets/backgrounds/level_0.png";
  if (level >= 3 && level < 5) return "./assets/backgrounds/level_1_5.png";
  if (level >= 5 && level < 15) return "./assets/backgrounds/level_5_10.png";
  if (level >= 15 && level < 50) return "./assets/backgrounds/level_10_50.png";
  if (level >= 50 && level < 70) return "./assets/backgrounds/level_50_100.png";
  if (level >= 70 && level < 90) return "./assets/backgrounds/nguyenanh.png";
  if (level >= 90 && level < 120) return "./assets/backgrounds/hoathan.png";
  if (level >= 120 && level < 175) return "./assets/backgrounds/nguyenanh.png";
  if (level >= 175 && level < 235) return "./assets/backgrounds/nguyenanh.png";
  if (level >= 235 && level < 285) return "./assets/backgrounds/nguyenanh.png";
  if (level >= 285 && level < 330) return "./assets/backgrounds/nguyenanh.png";
  if (level >= 330 && level < 380) return "./assets/backgrounds/nguyenanh.png";
  if (level >= 380 && level < 420) return "./assets/backgrounds/nguyenanh.png";
  if (level >= 420 && level < 499) return "./assets/backgrounds/nguyenanh.png";


  return "./assets/backgrounds/level_300_plus.png";
}
function getTitle(level) {
  if (level < 5) return "Phàm Nhân";
  if (level < 15) return `Luyện Khí tầng ${level - 4}`;

  if (level < 26) return "Trúc Cơ sơ kỳ";
  if (level < 37) return "Trúc Cơ trung kỳ";
  if (level < 50) return "Trúc Cơ hậu kỳ";

  if (level < 60) return "Kết Đan sơ kỳ";
  if (level < 65) return "Kết Đan trung kỳ";
  if (level < 70) return "Kết Đan hậu kỳ";

  if (level < 80) return "Nguyên Anh sơ kỳ";
  if (level < 85) return "Nguyên Anh trung kỳ";
  if (level < 90) return "Nguyên Anh hậu kỳ";

  if (level < 100) return "Hóa Thần sơ kỳ";
  if (level < 110) return "Hóa Thần trung kỳ";
  if (level < 120) return "Hóa Thần hậu kỳ";

  if (level < 150) return "Luyện Hư sơ kỳ";
  if (level < 160) return "Luyện Hư trung kỳ";
  if (level < 175) return "Luyện Hư hậu kỳ";

  if (level < 198) return "Hợp Thể sơ kỳ";
  if (level < 210) return "Hợp Thể trung kỳ";
  if (level < 235) return "Hợp Thể hậu kỳ";

  if (level < 250) return "Đại Thừa sơ kỳ";
  if (level < 273) return "Đại Thừa trung kỳ";
  if (level < 285) return "Đại Thừa hậu kỳ";

  if (level < 300) return "Độ Kiếp sơ kỳ";
  if (level < 310) return "Độ Kiếp trung kỳ";
  if (level < 330) return "Độ Kiếp hậu kỳ";

  if (level < 350) return "Chân Tiên sơ kỳ";
  if (level < 365) return "Chân Tiên trung kỳ";
  if (level < 380) return "Chân Tiên hậu kỳ";

  if (level < 400) return "Kim Tiên sơ kỳ";
  if (level < 410) return "Kim Tiên trung kỳ";
  if (level < 420) return "Kim Tiên hậu kỳ";

  if (level < 450) return "Thái Ất sơ kỳ";
  if (level < 470) return "Thái Ất trung kỳ";
  if (level < 499) return "Thái Ất hậu kỳ";

  return "Đại La";
}
function getGlowColor(level) {
  if (level < 5) return "#c0c0c0";          // Xám nhẹ bạc
  if (level < 15) return "#00bbff";         // Xanh biển
  if (level < 50) return "#66ff66";         // Lục nhạt kết đan
  if (level < 70) return "#20518a";      // nguyên anh
  if (level < 90) return "#61b414";     // hóa thần
  if (level < 120) return "#17532b";     // luyện hư
  if (level < 175) return "#edf397";    // hợp thể
  if (level < 235) return "#d33c0e";   // đại thừa
  if (level < 285) return "#7114bd";    // độ kiếp
  if (level < 330) return "#dd73c3";    // chân tiên
  if (level < 380) return "#eed12b";   // kim tiên
  if (level < 420) return "#a70b0b";     // thái ất

  return "#ff0000";                         // đại la
}
// set font theo level
function setFont(level) {
  if (level < 5) return "40px arial";
  if (level < 15) return "40px Qwigley";
  if (level < 50) return "40px WindSong";
  if (level < 90) return "40px MeowScript";
  if (level < 120) return "40px Updock";
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
  if (!userData) return interaction.editReply("Bạn chưa có dữ liệu Tuvi nào.");

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
  ctx.fillText(`Cấp độ: ${userData.level}`, 250, 110);
  ctx.fillText(`Tuvi: ${userData.xp} / ${nextXP}`, 250, 150);
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


  // 📊 Thanh XP (Sử dụng Canvas API chuẩn tương thích Node.js)
  const barX = 250;
  const barY = 210;
  const barWidth = 500;
  const barHeight = 20;
  const xpWidth = barWidth * Math.min(Math.max(percent, 0), 1); // Giới hạn percent trong khoảng 0 - 1

  if (xpWidth > 0) {
    // 1. Tạo hiệu ứng tỏa sáng (Glow)
    ctx.save();
    ctx.shadowColor = "rgba(54, 207, 255, 0.8)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "rgba(54, 207, 255, 0.2)";
    drawRoundedRect(ctx, barX, barY, xpWidth, barHeight, 10);
    ctx.restore();

    // 2. Đổ màu Gradient chiều dọc (Sáng trên, đậm dưới)
    ctx.save();
    const xpGradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
    xpGradient.addColorStop(0, "#85E7FF");   // Mép trên sáng rực
    xpGradient.addColorStop(0.35, "#36CFFF"); // Thân giữa xanh cyan
    xpGradient.addColorStop(1, "#1894EA");   // Đáy dưới xanh đậm

    ctx.fillStyle = xpGradient;

    // Tự định nghĩa đường Path để clip các đốm sáng
    ctx.beginPath();
    ctx.moveTo(barX + 10, barY);
    ctx.lineTo(barX + xpWidth - 10, barY);
    ctx.quadraticCurveTo(barX + xpWidth, barY, barX + xpWidth, barY + 10);
    ctx.lineTo(barX + xpWidth, barY + barHeight - 10);
    ctx.quadraticCurveTo(barX + xpWidth, barY + barHeight, barX + xpWidth - 10, barY + barHeight);
    ctx.lineTo(barX + 10, barY + barHeight);
    ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - 10);
    ctx.lineTo(barX, barY + 10);
    ctx.quadraticCurveTo(barX, barY, barX + 10, barY);
    ctx.closePath();
    ctx.fill();

    // 3. Giới hạn vùng vẽ đốm sáng (Clipping)
    ctx.clip();

    // 4. Vẽ các đốm sáng lấp lánh (Particles)
    const particleCount = Math.floor((xpWidth / barWidth) * 40);
    for (let i = 0; i < particleCount; i++) {
      const pX = barX + Math.random() * xpWidth;
      const pY = barY + Math.random() * barHeight;
      const pSize = Math.random() * 1.8 + 0.5;
      const pOpacity = Math.random() * 0.6 + 0.2;

      ctx.fillStyle = `rgba(255, 255, 255, ${pOpacity})`;
      ctx.beginPath();
      ctx.arc(pX, pY, pSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 5. Viền bao quanh khung thanh XP
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 2;
  strokeRoundedRect(ctx, barX, barY, barWidth, barHeight, 10);
  ctx.restore();



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


  ctx.font = '28px Pacifico';
  ctx.fillStyle = '#1A2A4F';
  ctx.fillText(`💰 Túi trữ vật – Trang ${page}`, 40, 50);

  const startIndex = (page - 1) * itemsPerPage;
  const pageItems = inventory.slice(startIndex, startIndex + itemsPerPage);

  const itemHeight = 70;
  pageItems.forEach((item, index) => {
    const y = 100 + index * itemHeight;
    ctx.fillStyle = getColorByRarity(item.rarity);

    ctx.fillText(`${item.name} x${item.quantity}`, 60, y);
    ctx.font = '20px Updock';
    ctx.fillStyle = '#666666';
    ctx.fillText(`${item.description}`, 70, y + 25);
    ctx.font = '28px Pacifico';
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
      .setLabel('💧 Profile')
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