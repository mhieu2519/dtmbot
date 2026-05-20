require('dotenv').config();
const axios = require("axios"); // Thêm axios nếu chưa cài đặt
const geminiApiKey = process.env["gemini_api_key"]; // Sử dụng biến môi trường
const REPLY_COOLDOWN = 0.5 * 60 * 1000;
const MAX_CONTEXT_MESSAGES = 2; // Giới hạn số câu trong ngữ cảnh giảm 3->2

async function chatWithGemini(prompt) {
  try {
    const response = await axios.post(
      // "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      // "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      //  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",

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
    // return message.reply("⏳ Đạo hữu đợi một chút, ta đang suy nghĩ...");
    message.channel.sendTyping(); // Discord hiển thị bot đang gõ
    return;
  }

  lastRequestTime.set(message.author.id, now);

  try {
    const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);

    // Nếu tin nhắn gốc là của bot
    if (referencedMessage.author.id === message.client.user.id) {
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



module.exports = { chatWithGemini, sendMessageInChunks, handleReplyToBot };


