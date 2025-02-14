const { Client, GatewayIntentBits } = require("discord.js");
const xlsx = require("xlsx");
const keepAlive = require("./server");
require("dotenv").config(); // Đảm bảo bạn đã cài dotenv để lấy token từ .env
//require("dotenv").config({ path: "/etc/secrets/.env" }); // Render lưu file ở đây
const axios = require("axios"); // Thêm axios nếu chưa cài đặt
const fs = require("fs");
const schedule = require("node-schedule");
const moment = require("moment-timezone"); // Thêm thư viện này nếu chưa có
const { SlashCommandBuilder } = require("discord.js");

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

function loadScheduledMessages() {
  const workbook = xlsx.readFile("schedule.xlsx"); // Tên file Excel chứa thông tin gửi tin nhắn
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet);
}


function excelTimeToISO(time) {
  if (typeof time === "number") {
    // Chuyển đổi số thập phân từ Excel thành thời gian chuẩn (ISO)
    const totalSeconds = Math.round(time * 86400); // 86400 giây trong 1 ngày
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return time; // Nếu đã là chuỗi đúng, giữ nguyên
}

function scheduleMessages() {
  const messages = loadScheduledMessages();

  messages.forEach((msg) => {
    const rawTime = msg["Thời gian"]; // Lấy thời gian từ Excel
    const channelName = msg["Tên kênh"];
    const content = msg["Nội dung"];

    const channelId = process.env[channelName];

    if (!channelId) {
      console.error(`⚠️ Không tìm thấy kênh "${channelName}" trong biến môi trường.`);
      return;
    }

    // ✅ Chuyển đổi thời gian từ Excel về định dạng chuẩn
    const formattedTime = excelTimeToISO(rawTime);

    // ✅ Chuyển sang múi giờ Việt Nam
    const localTime = moment.tz(`2025-02-14 ${formattedTime}`, "Asia/Ho_Chi_Minh"); 
    const utcTime = localTime.utc(); 

    schedule.scheduleJob(utcTime.toDate(), function () {
      const channel = bot.channels.cache.get(channelId);
      if (channel) {
        channel.send(content);
        console.log(`📢 Đã gửi tin nhắn vào kênh ${channelName}: ${content}`);
      } else {
        console.error(`❌ Không tìm thấy kênh có ID: ${channelId}`);
      }
    });
  });
}

//Hàm ngắt
async function sendMessageInChunks(baseMessage, content) {
  const maxLength = 2000; // Giới hạn ký tự của Discord
  let remainingText = content;
  let firstMessage = true;
  let lastSentMessage = baseMessage;

  while (remainingText.length > 0) {
    let chunk = remainingText.slice(0, maxLength);

    // Nếu còn phần tiếp theo, thêm dấu "...(còn tiếp)..."
    if (remainingText.length > maxLength) {
      chunk += " ...(còn tiếp)...";
    }

    remainingText = remainingText.slice(maxLength);

    // Nếu không phải phần đầu tiên, thêm tiền tố " ...(tiếp)..."
    if (!firstMessage) {
      chunk = "...(tiếp)... " + chunk;
    }

    if (firstMessage) {
      lastSentMessage = await lastSentMessage.edit(chunk); // Sửa tin nhắn đầu tiên
      firstMessage = false;
    } else {
      lastSentMessage = await lastSentMessage.reply(chunk); // Reply tiếp tục
    }
  }
}


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
});

bot.once("ready", async () => {
  console.log("Bot is now online!");
   scheduleMessages();
});

keepAlive()
bot.login(process.env.DISCORD_TOKEN); // Sử dụng token từ biến môi trường
