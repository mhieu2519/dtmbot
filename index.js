const { Client, GatewayIntentBits } = require("discord.js");

const keepAlive = require("./server");
require("dotenv").config(); // Đảm bảo bạn đã cài dotenv để lấy token từ .env
//require("dotenv").config({ path: "/etc/secrets/.env" }); // Render lưu file ở đây



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
const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID;
const greetings = ["hi", "hello", "heloo", "halo", "hey", "Bonjour"];
const cooldowns = new Map();
const MAX_CONTEXT_MESSAGES = 3; // Giới hạn số câu trong ngữ cảnh
const conversationHistory = new Map(); // Lưu hội thoại theo ID tin nhắn gốc
const lastRequestTime = new Map(); // Lưu thời gian gửi request gần nhất
const REPLY_COOLDOWN = 5000; // 5 giây cooldown


const { loadQuestions, findMatches } = require('./utils/questions');
const { chatWithGemini } = require('./utils/chat');
const { loadScheduledMessages, excelTimeToISO, scheduleMessages  } = require('./utils/schedule');
const { canUseCommand } = require('./utils/cooldown');
const { sendMessageInChunks} = require('./utils/replybot');




// Command "/" schedule
bot.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "schedule") {
    try {
      // Trả lời ngay lập tức để tránh lỗi timeout
      await interaction.deferReply();

      const messages = loadScheduledMessages(); // Lấy danh sách lịch trình
      let response = "📅 **Danh sách lịch trình đã thiết kế:**\n";

      messages.forEach((msg, index) => {
        const timeValue = msg["Thời gian"];
        const time = new Date((timeValue - 25569) * 86400 * 1000)
          .toISOString()
          .substring(11, 16);

        response += `\n**${index + 1}.** 🕒 ${time}\n✉️ ${msg["Nội dung"]}\n`;
      });

      // Cập nhật phản hồi sau khi xử lý xong
      await interaction.editReply(response);
    } catch (error) {
      console.error("Lỗi khi xử lý lệnh schedule:", error);
      await interaction.followUp("❌ Lão phu không thể xử lý yêu cầu này!");
    }
  }
});

// Chào bạn mới
bot.on("guildMemberAdd", async (member) => {
  const channel = member.guild.channels.cache.get(ANNOUNCE_CHANNEL_ID);
  if (channel) {
    channel.send(
      `🎉 Chào mừng đạo hữu ${member.displayName} đến với tông môn!`,
    );
  }
});

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
      
      // Phản hồi ngay lập tức để tránh bot có vẻ bị lag
      const sentMessage = await message.reply("Lão phu đang suy ngẫm...");
   
      const reply = await chatWithGemini(query);
      // Gọi hàm để gửi tin nhắn
      await sendMessageInChunks(sentMessage, reply);
      break;
    }

    default:
      message.channel.send("⚠️ Lệnh không hợp lệ! Hãy thử `d?a` hoặc `d?r`");
  }
// tương tác lại với bot

  if (message.reference) {
    const lastTime = lastRequestTime.get(message.author.id) || 0;
    const now = Date.now();
    
    if (now - lastTime < REPLY_COOLDOWN) {
      return message.reply("⏳ Đạo hữu đợi một chút, ta đang suy nghĩ...");
    }
  
    lastRequestTime.set(message.author.id, now);
    try {
      const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
      // Nếu tin nhắn gốc là của bot
      if (referencedMessage.author.id === bot.user.id) {
        const query = message.content.trim();
        if (!query) return message.reply("🤔 Đạo hữu muốn hỏi gì?");
  
        // Lấy lịch sử hội thoại (nếu có)
        const contextKey = referencedMessage.id;
        let contextHistory = conversationHistory.get(contextKey) || [];
        
        // Thêm tin nhắn cũ vào ngữ cảnh
        contextHistory.push(referencedMessage.content);
        
        // Giới hạn số câu hội thoại
        if (contextHistory.length > MAX_CONTEXT_MESSAGES) {
          contextHistory.shift(); // Xóa câu cũ nhất
        }
  
        // Ghi đè lại lịch sử hội thoại
        conversationHistory.set(contextKey, contextHistory);
  
        // Ghép ngữ cảnh lại thành prompt
        const prompt = contextHistory.join("\n") + `\nUser: ${query}`;
        const reply = await chatWithGemini(prompt);
  
        // Gửi phản hồi
        await sendMessageInChunks(message, reply);
      }
    } catch (error) {
      console.error("Lỗi khi xử lý phản hồi:", error);
    }
  }


});

bot.once("ready", async () => {
  console.log("Bot is now online!");
   scheduleMessages();
});

keepAlive()
bot.login(process.env.DISCORD_TOKEN); // Sử dụng token từ biến môi trường
