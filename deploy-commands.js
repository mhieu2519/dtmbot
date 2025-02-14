const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const commands = [
  new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("📅 Kiểm tra lịch trình đã được lên"),
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
