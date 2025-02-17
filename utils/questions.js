const crypto = require("crypto");
const fs = require("fs");

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = process.env.SECRET_KEY ;

function decryptData(encrypted) {
  const iv = Buffer.from(encrypted.iv, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  let decrypted = decipher.update(encrypted.data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

function loadQuestions() {
  try {
    const encryptedData = JSON.parse(fs.readFileSync("questions.enc.json", "utf8"));
    return decryptData(encryptedData);
  } catch (error) {
    console.error("❌ Lỗi khi giải mã dữ liệu:", error);
    return [];
  }
}

function findMatches(query, questions) {
  return questions.filter((q) =>
    q["Câu hỏi"].toLowerCase().includes(query.toLowerCase())
  );
}

module.exports = { loadQuestions, findMatches };
