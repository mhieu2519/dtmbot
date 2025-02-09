const { Client, GatewayIntentBits } = require("discord.js");
const xlsx = require("xlsx");
const keepAlive = require("./server");
require("dotenv").config(); // Đảm bảo bạn đã cài dotenv để lấy token từ .env
const axios = require("axios"); // Thêm axios nếu chưa cài đặt

const geminiApiKey = process.env["gemini_api_key"]; // Sử dụng biến môi trường
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "d?";
// Lấy giá trị từ biến môi trường
const REPORT_CHANNEL_ID = process.env.REPORT_CHANNEL_ID;
const ALLOWED_CHANNELS = process.env.ALLOWED_CHANNELS.split(","); // Chuyển đổi chuỗi thành mảng
const greetings = ["hi", "hello", "heloo", "halo", "hey", "Bonjour"];
const cooldowns = new Map();

function canUseCommand(userId) {
  const now = Date.now();
  if (cooldowns.get(userId) && now - cooldowns.get(userId) < 5000) return false;
  cooldowns.set(userId, now);
  return true;
}

function loadQuestions() {
  const workbook = xlsx.readFile("questions.xlsx");
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet);
}

function findMatches(query, questions) {
  return questions.filter((q) =>
    q["Câu hỏi"].toLowerCase().includes(query.toLowerCase()),
  );
}

async function chatWithGemini(prompt) {
  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        params: {
          key: geminiApiKey,
        },
      },
    );

    //console.log("Response Data:", response.data);

    const reply = response.data;

    // Kiểm tra và truy cập chính xác vào nội dung phản hồi
    if (
      !reply ||
      !reply.candidates ||
      !reply.candidates[0] ||
      !reply.candidates[0].content ||
      !reply.candidates[0].content.parts ||
      !reply.candidates[0].content.parts[0] ||
      !reply.candidates[0].content.parts[0].text
    ) {
      console.error(
        "Lỗi: Google Gemini không trả về nội dung hoặc định dạng không đúng.",
      );
      //console.error("Full Response:", JSON.stringify(response.data, null, 2));
      return "Xin lỗi lão phu không thể xử lý yêu cầu của đạo hữu ngay bây giờ.";
    }

    let content = reply.candidates[0].content.parts[0].text; // Lấy nội dung phản hồi
    // Thay thế "tôi" bằng "lão phu"
    content = content.replace(/tôi/gi, "lão phu");

    // Thay thế "bạn" bằng "đạo hữu"
    content = content.replace(/bạn/gi, "đạo hữu");

    return content;
  } catch (error) {
    console.error(
      " Lỗi từ Google Gemini:",
      error.response ? error.response.data : error.message,
    );
    if (error.response) {
      //console.error("Response Status:", error.response.status);
      //console.error("Response Headers:", error.response.headers);
    }
    return "Xin lỗi lão phu không thể xử lý yêu cầu của đạo hữu ngay bây giờ.";
  }
}

bot.on("guildMemberAdd", async (member) => {
  const channel = member.guild.channels.cache.get("1309892182483931169");
  if (channel) {
    channel.send(
      `🎉 Chào mừng đạo hữu ${member.displayName} đến với tông môn!`,
    );
  }
});

async function checkMissedMessages() {
  const reportChannel = await bot.channels.fetch(REPORT_CHANNEL_ID);
  if (!reportChannel) return;

  for (const channelId of ALLOWED_CHANNELS) {
    const channel = await bot.channels.fetch(channelId).catch(() => null);
    if (!channel) continue;

    // 🔍 Lấy 10 tin gần nhất để tìm tin bot phản hồi gần nhất
    const recentMessages = await channel.messages
      .fetch({ limit: 10 })
      .catch(() => null);
    if (!recentMessages) continue;

    // 🧐 Tìm tin nhắn bot phản hồi gần nhất
    let lastBotMessage = recentMessages.find(
      (m) => m.author.id === bot.user.id,
    );
    let lastBotMessageTimestamp = lastBotMessage
      ? lastBotMessage.createdTimestamp
      : 0;

    // 📌 Nếu bot chưa từng phản hồi, chỉ lấy 10 tin gần nhất (tránh quét quá nhiều)
    let messages = await channel.messages
      .fetch({ limit: 50 })
      .catch(() => null);
    if (!messages) continue;

    // 🔥 Chỉ lấy tin mới hơn tin bot đã phản hồi gần nhất
    messages = messages.filter(
      (m) => m.createdTimestamp > lastBotMessageTimestamp,
    );

    for (const msg of messages.values()) {
      if (msg.author.bot) continue;

      const replied = messages.some(
        (m) => m.reference?.messageId === msg.id || m.mentions.has(bot.user.id),
      );
      if (replied) continue;

      const member = await msg.guild.members
        .fetch(msg.author.id)
        .catch(() => null);
      const nickname = member?.displayName || msg.author.username;

      const shouldReply =
        greetings.includes(msg.content.toLowerCase()) ||
        msg.content.startsWith(`${PREFIX}ans`);
      if (!shouldReply) continue;

      // 🚀 Báo cáo tin nhắn bị lỡ
      // await reportChannel.send(`📢 **${nickname} đã gửi ở #${msg.channel.name}:** "${msg.content}"`);
      const timeSent = msg.createdAt.toLocaleString("vi-VN"); // Định dạng thời gian theo tiếng Việt
      await reportChannel.send(
        `📢 **${nickname} đã gửi ở #${msg.channel.name} lúc ${timeSent}:** "${msg.content}"`,
      );

      // Phản hồi tin nhắn bị lỡ ngay dưới báo cáo
      if (greetings.includes(msg.content.toLowerCase())) {
        await reportChannel.send(`Xin chào ${nickname} đạo hữu!`);
      } else if (msg.content.startsWith(`${PREFIX}ans`)) {
        const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
        args.shift();
        const query = args.join(" ").trim().toLowerCase();

        if (!query) {
          await reportChannel.send(
            "⚠️ Vui lòng nhập từ khóa. Ví dụ: `d?ans bot`",
          );
          continue;
        }

        const questions = loadQuestions();
        const matches = findMatches(query, questions);

        if (matches.length > 0) {
          let response = `🔍 **Các kết quả cho "${query}":**\n`;
          matches.forEach((q, index) => {
            response += `\n**${index + 1}.** ❓ ${q["Câu hỏi"]}\n➡️ ${q["Câu trả lời"]}\n`;
          });
          await reportChannel.send(response);
        } else {
          await reportChannel.send(
            "❌ Tôi đã cố gắng mà không tìm thấy câu trả lời trùng khớp. ${nickname} đạo hữu có thể liên hệ Mạnh Kỳ đạo hữu!",
          );
        }
      }
    }
  }
}

bot.on("messageCreate", async (message) => {
  if (message.author.bot) return; // Bỏ qua tin nhắn từ bot khác

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase() || "";
  const nickname = message.member?.displayName || message.author.username;
  const content = message.content.trim().toLowerCase(); // Chuẩn hóa nội dung tin nhắn

  // 📌 Kiểm tra lời chào (nếu tin nhắn không phải lệnh)
  if (greetings.includes(content)) {
    message.channel.send(`Xin chào ${nickname} đạo hữu!`);
    return;
  }

  // 📌 Chỉ xử lý các lệnh bắt đầu bằng PREFIX
  if (!message.content.startsWith(PREFIX)) return;

  switch (command) {
    // 📌 Lệnh hỏi đáp theo Excel
    case "a": {
      const query = args.join(" ").trim();
      if (!query)
        return message.channel.send(
          "⚠️ Vui lòng nhập từ khóa. Ví dụ: `d?a bot`",
        );

      const matches = findMatches(query, loadQuestions());
      if (matches.length > 0) {
        let response = `🔍 **Các kết quả cho "${query}":**\n`;
        matches.forEach((q, index) => {
          response += `\n**${index + 1}.** ❓ ${q["Câu hỏi"]}\n➡️ ${q["Câu trả lời"]}\n`;
        });
        message.channel.send(response);
      } else {
        message.channel.send(
          `❌ Không tìm thấy câu trả lời phù hợp, ${nickname} đạo hữu vui lòng kiểm tra lại`,
        );
      }
      break;
    }
    // 📌 Lệnh hỏi AI
    case "r": {
      if (!canUseCommand(message.author.id)) {
        return message.reply("⏳ Đạo hữu đang gửi quá nhanh! Hãy chờ 5 giây.");
      }

      const query = args.join(" ");
      if (!query)
        return message.reply("⚠️ Đạo hữu vui lòng nhập nội dung câu hỏi!");

      const reply = await chatWithGemini(query);
      message.reply(reply);
      break;
    }

    default:
      message.channel.send("⚠️ Lệnh không hợp lệ! Hãy thử `d?a` hoặc `d?r`");
  }
});

bot.once("ready", async () => {
  console.log("Bot is now online!");
  //checkMissedMessages();
});

//bot.login(config.token);

keepAlive()
bot.login(process.env.DISCORD_TOKEN); // Sử dụng token từ biến môi trường
