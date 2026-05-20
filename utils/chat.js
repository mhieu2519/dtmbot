require('dotenv').config();
const axios = require("axios"); // Thêm axios nếu chưa cài đặt
const geminiApiKey = process.env["gemini_api_key"]; // Sử dụng biến môi trường
const REPLY_COOLDOWN = 0.5 * 60 * 1000;
const MAX_CONTEXT_MESSAGES = 2; // Giới hạn số câu trong ngữ cảnh giảm 3->2

// Thay vì truyền chuỗi text, ta truyền mảng contents chuẩn API
async function chatWithGemini(contentsPayload) {
  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      {
        // Truyền trực tiếp payload đã cấu trúc đúng vai trò vào đây
        contents: contentsPayload,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
      }
    );

    const reply = response.data;

    if (
      !reply ||
      !reply.candidates ||
      !reply.candidates[0] ||
      !reply.candidates[0].content ||
      !reply.candidates[0].content.parts ||
      !reply.candidates[0].content.parts[0] ||
      !reply.candidates[0].content.parts[0].text
    ) {
      console.error("Lỗi: Định dạng phản hồi không đúng.");
      return "Xin lỗi lão phu không thể xử lý yêu cầu của đạo hữu ngay bây giờ.";
    }

    let content = reply.candidates[0].content.parts[0].text;

    // Giữ nguyên logic xưng hô tiên hiệp của đạo hữu
    content = content.replace(/tôi/gi, "lão phu");
    content = content.replace(/bạn/gi, "đạo hữu");

    return content;
  } catch (error) {
    console.error(
      "Lỗi từ Google Gemini:",
      error.response ? error.response.data : error.message
    );
    return "Xin lỗi lão phu không thể xử lý yêu cầu của đạo hữu ngay bây giờ.";
  }
}

async function sendMessageInChunks(message, content) {
  const chunkSize = 1975; // Discord giới hạn 2000 ký tự mỗi tin
  const chunks = [];

  while (content.length > 0) {
    let chunk = content.slice(0, chunkSize);
    content = content.slice(chunkSize);

    // Thêm dấu "... còn tiếp" vào cuối đoạn bị cắt nếu còn phần tiếp theo
    if (content.length > 0) {
      chunk += " ... còn tiếp";
    }

    chunks.push(chunk);
  }

  let lastSentMessage = null;

  for (let i = 0; i < chunks.length; i++) {
    if (i === 0) {
      // Đoạn đầu tiên reply vào tin gốc
      lastSentMessage = await message.reply(chunks[i]);
    } else {
      // Các đoạn tiếp theo reply vào đoạn trước đó để tạo chuỗi liên kết
      lastSentMessage = await lastSentMessage.reply(chunks[i]);
    }
  }
}

async function handleReplyToBot(message, lastRequestTime, conversationHistory) {
  const lastTime = lastRequestTime.get(message.author.id) || 0;
  const now = Date.now();

  if (now - lastTime < REPLY_COOLDOWN) {
    message.channel.sendTyping();
    return;
  }

  lastRequestTime.set(message.author.id, now);

  try {
    const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);

    if (referencedMessage.author.id === message.client.user.id) {
      const query = message.content.trim();
      if (!query) return message.reply("🤔 Đạo hữu muốn hỏi gì?");

      const contextKey = referencedMessage.id;
      let contextHistory = conversationHistory.get(contextKey) || [];

      // Lưu tin nhắn cũ của bot vào lịch sử (định dạng object để dễ quản lý)
      contextHistory.push({ role: "model", text: referencedMessage.content });

      if (contextHistory.length > MAX_CONTEXT_MESSAGES) {
        contextHistory.shift();
      }

      conversationHistory.set(contextKey, contextHistory);

      // --- ĐOẠN XỬ LÝ ĐỔI MỚI: Dựng cấu trúc mảng nội dung đúng chuẩn REST ---
      const contentsPayload = [];

      // Đưa lịch sử vào payload
      contextHistory.forEach(msg => {
        contentsPayload.push({
          role: msg.role,
          parts: [{ text: msg.text }]
        });
      });

      // Thêm câu hỏi hiện tại của User vào cuối mảng payload
      contentsPayload.push({
        role: "user",
        parts: [{ text: query }]
      });

      // Gọi API với cấu trúc mảng mới
      const reply = await chatWithGemini(contentsPayload);

      await sendMessageInChunks(message, reply);
    }
  } catch (error) {
    console.error("Lỗi khi xử lý phản hồi:", error);
  }
}



module.exports = { chatWithGemini, sendMessageInChunks, handleReplyToBot };


