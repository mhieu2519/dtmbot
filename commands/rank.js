const { createCanvas, loadImage, registerFont } = require("canvas");
const UserXP = require("../models/UserXP");
const { getXPForNextLevel, getUserRank } = require("../utils/xpSystem");



const path = require("path");
registerFont(path.join(__dirname, "../assets/Allura-Regular.ttf"), { family: "Allura" });
registerFont(path.join(__dirname, "../assets/WindSong-Medium.ttf"), { family: "WindSong" });
registerFont(path.join(__dirname, "../assets/MeowScript-Regular.ttf"), { family: "MeowScript" });
registerFont(path.join(__dirname, "../assets/Qwigley-Regular.ttf"), { family: "Qwigley" });
registerFont(path.join(__dirname, "../assets/comici.ttf"), { family: "Comic Sans MS" });

function getBackgroundByLevel(level) {
    if (level ==0) return "./assets/backgrounds/level_0.png";
    if (level >= 3 && level < 5) return "./assets/backgrounds/level_1_5.png";
    if (level >= 5 && level < 15) return "./assets/backgrounds/level_5_10.png";
    if (level >= 15 && level < 50) return "./assets/backgrounds/level_10_50.png";
    if (level >= 50 && level < 100) return "./assets/backgrounds/level_50_100.png";
    if (level >= 100 && level < 300) return "./assets/backgrounds/level_100_300.png";
    return "./assets/backgrounds/level_300_plus.png";
}
function getTitle(level) {
  if (level < 5) return "Phàm Nhân";
  if (level < 15) return `Luyện Khí tầng ${level -4}`;
  if (level < 26) return "Trúc Cơ sơ kỳ";
  if (level < 37) return "Trúc Cơ trung kỳ";
  if (level < 50) return "Trúc Cơ hậu kỳ";
  if (level < 66) return "Kết Đan sơ kỳ";
  if (level < 82) return "Kết Đan trung kỳ";  
  if (level < 100) return "Kết Đan hậu kỳ";
  if (level < 150) return "Nguyên Anh sơ kỳ";
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
  if (level < 10) return "40px WindSong";
  if (level < 50) return "40px Qwigley";
  if (level < 100) return "40px MeowScript";
  if (level < 300) return "40px WindSong";
  return "40px Allura";
} 

async function showRank(interaction) {

  await interaction.deferReply();

  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const userData = await UserXP.findOne({ guildId, userId });
  if (!userData) return interaction.editReply("Bạn chưa có dữ liệu XP nào.");

  const nextXP = getXPForNextLevel(userData.level);
  const rank = await getUserRank(userId, guildId);
  const percent = userData.xp / nextXP;

  const canvas = createCanvas(800, 250);
  const ctx = canvas.getContext("2d");

    const member = interaction.member;
//let member = interaction.member;
// Nếu không có nickname, fetch lại member
// (điều này có thể xảy ra nếu bot không có quyền xem nickname)
/*
if (!member || !member.nickname) {
  try {
    member = await interaction.guild.members.fetch(interaction.user.id);
  } catch (e) {
    console.error("Không thể fetch member:", e);
  }
}*/
 const displayName= interaction.member?.nickname ||
    interaction.user.globalName ||
    interaction.user.username ||
    "Không rõ";
 console.log("Tên hiển thị 1:", displayName);
 console.log("Tên hiển thị 2:", interaction.member?.nickname);
 console.log("Tên hiển thị 3 :", interaction.member.user.globalName);
  console.log("Tên hiển thị 4:", interaction.user.username);
//const displayName = member?.nickname || interaction.user.username;

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

  ctx.font = "30px Allura";
  ctx.fillStyle = getGlowColor(userData.level);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`~ ${getTitle(userData.level)} ~`, 125, 230);

  // 📊 Thanh XP
  ctx.shadowColor = getGlowColor(userData.level);
  ctx.shadowBlur = 20;
  const barX = 250;
  const barY = 210;
  const barWidth = 500;
  const barHeight = 20;

  // Khung
  ctx.fillStyle = "#333";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Phần đã đạt
  ctx.fillStyle = "#34a853"; // Màu xanh lá
  ctx.fillRect(barX, barY, barWidth * percent, barHeight);

  // Viền bar
  ctx.strokeStyle = "#fff";  //
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  const buffer = canvas.toBuffer("image/png");
  await interaction.editReply({
    files: [{ attachment: buffer, name: "rank.png" }]
  });
}

module.exports = { showRank,getTitle };