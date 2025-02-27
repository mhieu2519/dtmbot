const { Client, GatewayIntentBits } = require("discord.js");

const keepAlive = require("./server");
require("dotenv").config(); // Đảm bảo bạn đã cài dotenv để lấy token từ .env
//require("dotenv").config({ path: "/etc/secrets/.env" }); // Render lưu file ở đây
const { getSheetData } = require("./readSheet");

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

const geminiApiKey = process.env["gemini_api_key"];
const { loadQuestions, findMatches } = require('./utils/questions');
const { chatWithGemini,sendMessageInChunks } = require('./utils/chat');
const { loadScheduledMessages, excelTimeToISO, scheduleMessages  } = require('./utils/schedule');
const { canUseCommand } = require('./utils/cooldown');
const { createCanvas, loadImage } = require("canvas");
const { AttachmentBuilder } = require("discord.js");




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

    // 📌 Nếu là tin nhắn reply của bot, tự động xử lý như "d?r"
  if (message.reference) {
    try {
      const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);

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
        return; // Tránh xử lý tiếp
      }
    } catch (error) {
      console.error("Lỗi khi xử lý phản hồi:", error);
    }
  }

  // 📌 Chỉ xử lý các lệnh bắt đầu bằng PREFIX
  if (!message.content.startsWith(PREFIX)) return;

  switch (command) {
    // 📌 Lệnh hiển thị danh sách lệnh
    case "help": {
      const helpMessage = `
      **📜 Danh sách lệnh của lão phu:**
      🔹 \`d?a [Từ khóa]\` → Tìm câu trả lời theo dữ liệu đã học.
      🔹 \`d?r [Từ khóa]\` → Tra cứu cùng Thái Ất Chân Nhân.
      🔹 \`d?roc\` → Đọc dữ liệu từ Google Sheets (tab Đặt Đá).
      🔹 \`d?help\` → Hiển thị danh sách lệnh.
      🔹\`/schedule\` → Lịch trình lão Mạnh đã lên.

      🚀 **Ví dụ:**
      - \`d?a man hoang\`
      - \`d?roc\`
      `;
      message.channel.send(helpMessage);
      break;
    }

    // 📌 Lệnh hỏi đáp theo Excel
    case "a": {
      const query = args.join(" ").trim();
      if (!query)
        return message.channel.send(
          "⚠️ Vui lòng nhập từ khóa. Ví dụ: `d?a tần mục`",
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


    // 📌 Lệnh đọc dữ liệu từ Google Sheets
    case "roc": {
      message.channel.send(
        `⏳ Đang tải dữ liệu, ${nickname} đạo hữu vui lòng chờ...`
      );

      getSheetData().then((data) => {
        if (data.length === 0) {
            message.channel.send("❌ Không có dữ liệu trong Google Sheet.");
            return;
        }

        // Xác định kích thước bảng theo form ảnh gốc
        const colWidths = [120, 100, 150, 150, 150, 150, 150, 150, 120]; // Chiều rộng các cột
        const rowHeight = 40; // Chiều cao từng hàng
        const width = colWidths.reduce((a, b) => a + b, 0);
        const height = rowHeight * (data.length + 1);
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        // Vẽ nền bảng
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Vẽ tiêu đề
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, width, rowHeight);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const headers = ["Ngày", "Thời gian", " ", " ", " ", "Dữ liệu", " ", " ", "Kết quả"];
        
        let x = 0;
        headers.forEach((header, i) => {
          let colspan = i === 2 ? 6 : 1; // Merge 6 cột con của "Dữ liệu"
            ctx.fillText(header, x + colWidths[i] / 2, rowHeight / 2);
            x += colWidths[i]*colspan ;
        });

        // Vẽ từng hàng dữ liệu
        data.forEach((row, rowIndex) => {
            let x = 0;
            let y = (rowIndex + 1) * rowHeight;

            // Màu nền xen kẽ giống bảng gốc
            ctx.fillStyle = rowIndex % 2 === 0 ? "#F8F9FA" : "#E3E6E8";
            ctx.fillRect(0, y, width, rowHeight);

            // Viền
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.strokeRect(0, y, width, rowHeight);

            // Vẽ nội dung
            ctx.fillStyle = "#000000";
            ctx.font = "16px Arial";
            x = 0;
            row.forEach((cell, i) => {
                ctx.fillText(cell, x + colWidths[i] / 2, y + rowHeight / 2);
                x += colWidths[i];
            });
        });

        // Xuất ảnh và gửi vào Discord
        const buffer = canvas.toBuffer("image/png");
        const attachment = new AttachmentBuilder(buffer, { name: "dat-da.png" });
        message.channel.send({ files: [attachment] });

    }).catch((error) => {
        console.error("Lỗi khi đọc Google Sheets:", error);
        message.channel.send("❌ Đã xảy ra lỗi khi tải dữ liệu!");
    });

      break;
    }

    case "roc_chart": {
      message.channel.send(
          `⏳ Đang tải dữ liệu biểu đồ, ${nickname} đạo hữu vui lòng chờ...`
      );
  
      getSheetData().then((data) => {
          if (data.length === 0) {
              message.channel.send("❌ Không có dữ liệu trong Google Sheet.");
              return;
          }
  
          // Trích xuất danh sách vật liệu từ dữ liệu
          let materials = new Set();
          let chartData = {};
          data.forEach((row) => {
              let date = row[0];
              let time = row[1];
              for (let i = 2; i < row.length - 1; i += 2) {
                  let material = row[i];
                  let value = parseInt(row[i + 1].replace('x', '')) || 0;
                  materials.add(material);
                  if (!chartData[date]) chartData[date] = { "13h00": {}, "21h00": {} };
                  chartData[date][time][material] = value;
              }
          });
  
          materials = Array.from(materials);
          let dates = Object.keys(chartData);
  
          // Tạo canvas
          const width = 800;
          const height = 600;
          const padding = 60;
          const canvas = createCanvas(width, height);
          const ctx = canvas.getContext("2d");
  
          // Vẽ nền
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
  
          // Vẽ trục
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(padding, padding);
          ctx.lineTo(padding, height - padding);
          ctx.lineTo(width - padding, height - padding);
          ctx.stroke();
  
          // Vẽ nhãn trục Y (Vật liệu)
          ctx.fillStyle = "#000";
          ctx.font = "14px Arial";
          materials.forEach((mat, i) => {
              let y = height - padding - (i + 1) * ((height - 2 * padding) / materials.length);
              ctx.fillText(mat, padding - 50, y);
          });
  
          // Vẽ nhãn trục X (Ngày)
          dates.forEach((date, i) => {
              let x = padding + (i + 1) * ((width - 2 * padding) / dates.length);
              ctx.fillText(date, x, height - padding + 20);
          });
  
          // Vẽ dữ liệu (các điểm)
          ctx.fillStyle = "red";
          dates.forEach((date, i) => {
              ["13h00", "21h00"].forEach((time, j) => {
                  Object.entries(chartData[date][time]).forEach(([mat, val]) => {
                      let x = padding + (i + 1) * ((width - 2 * padding) / dates.length) + (j * 10);
                      let y = height - padding - (materials.indexOf(mat) + 1) * ((height - 2 * padding) / materials.length);
                      ctx.beginPath();
                      ctx.arc(x, y, 5, 0, 2 * Math.PI);
                      ctx.fill();
                      ctx.fillText(`x${val}`, x + 10, y - 5);
                  });
              });
          });
  
          // Xuất ảnh và gửi vào Discord
          const buffer = canvas.toBuffer("image/png");
          const attachment = new AttachmentBuilder(buffer, { name: "chart.png" });
          message.channel.send({ files: [attachment] });
      }).catch((error) => {
          console.error("Lỗi khi đọc Google Sheets:", error);
          message.channel.send("❌ Đã xảy ra lỗi khi tải dữ liệu!");
      });
  
      break;
  }
  
    default:
      message.channel.send("⚠️ Lệnh không hợp lệ! Hãy thử `d?help` để xem danh sách lệnh.");
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
   scheduleMessages(bot);
});

keepAlive()
bot.login(process.env.DISCORD_TOKEN); // Sử dụng token từ biến môi trường
