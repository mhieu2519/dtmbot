const express = require("express")

const server = express()

server.all("/", (req, res) => {
  res.send("Bot is running!")
})

function keepAlive() {
  const PORT = process.env.PORT || 3000; // ⚠ Dùng PORT từ biến môi trường
  server.listen(PORT, () => {
    console.log(`✅ Server is ready on port ${PORT}.`);
  });
}

module.exports = keepAlive
