const { REST, Routes, SlashCommandBuilder } = require("discord.js");

require("dotenv").config();

const commands = [
  new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("📅 Kiểm tra lịch trình đã được lên"),
  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Xem thông tin cá nhân của bạn'),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Xem bảng xếp hạng XP của server'),
  new SlashCommandBuilder()
    .setName('bicanh')
    .setDescription("Khám phá bí cảnh tông môn và nhận phần thưởng"),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔄 Đang đăng ký lệnh /schedule...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Đã đăng ký lệnh /schedule thành công!");
  } catch (error) {
    console.error("❌ Lỗi khi đăng ký lệnh:", error);
  }
})();
