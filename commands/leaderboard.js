const UserXP = require("../models/UserXP");
const { getTitle } = require("./rank");

async function showLeaderboard(interaction) {
  const guildId = interaction.guild.id;

  // 📊 Sắp xếp: level giảm dần, xp giảm dần
  const topUsers = await UserXP.find({ guildId })
    .sort({ level: -1, xp: -1 })
    .limit(10);

  if (!topUsers.length) {
    return interaction.reply("❌ Chưa có ai có XP trên server này.");
  }

  const leaderboard = topUsers.map((u, i) => {
    const title = getTitle(u.level);
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
    return `${medal} <@${u.userId}> — **${title}** (Level ${u.level}- ${u.xp} XP)`;
  }).join("\n");

  const requesterName = interaction.member?.nickname || interaction.user.username;

  await interaction.reply({
    embeds: [{
      color: 0xFFD700,
      title: "🏆 Bảng Xếp Hạng Chiến Lực",
      description: leaderboard,
      footer: { text: `Yêu cầu bởi ${requesterName}` },
      timestamp: new Date()
    }]
  });
}

module.exports = { showLeaderboard };
