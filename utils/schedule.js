
const fs = require("fs");
const xlsx = require("xlsx");
const schedule = require("node-schedule");
const moment = require("moment-timezone");


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
  module.exports = { loadScheduledMessages, excelTimeToISO, scheduleMessages };  