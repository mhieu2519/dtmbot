// utils/questions.js

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

module.exports = { loadQuestions, findMatches };
