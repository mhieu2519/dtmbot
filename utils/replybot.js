//Hàm ngắt
/*
async function sendMessageInChunks(baseMessage, content) {
  const maxLength = 1960; // Giới hạn ký tự của Discord
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
*/

async function sendMessageInChunks(message, content) {
    const chunkSize = 2000; // Discord giới hạn 2000 ký tự mỗi tin
    const chunks = [];
    
    while (content.length > 0) {
      let chunk = content.slice(0, chunkSize);
      content = content.slice(chunkSize);
      
      // Thêm dấu "... còn tiếp" vào cuối đoạn bị cắt
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
        lastSentMessage = await lastSentMessage.reply("...( tiếp )... " + chunks[i]);
      }
    }
  }
  

module.exports= {sendMessageInChunks};
