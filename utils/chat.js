const axios = require("axios"); // Thêm axios nếu chưa cài đặt

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

module.exports= { chatWithGemini };


