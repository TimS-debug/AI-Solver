import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import Tesseract from "tesseract.js";
import fs from "fs";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

/* =======================
   ROOT (Render check)
======================= */
app.get("/", (req, res) => {
  res.send("🤖 AI Solver is running on Render");
});

/* =======================
   CLEAN AI OUTPUT
======================= */
function cleanAI(text) {
  return text
    .replace(/\\\[|\\\]/g, "")
    .replace(/\\\((.*?)\\\)/g, "$1")
    .replace(/→|⇒|\\Rightarrow/g, "→")
    .replace(/\{,}/g, ",")
    .replace(/\\/g, "")
    .trim();
}

/* =======================
   AI REQUEST
======================= */
async function askAI(text) {
  const models = [
    "openai/gpt-oss-120b:free",
    "meta-llama/llama-3.1-8b-instruct"
  ];

  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `
Ты школьный репетитор.

ФОРМАТ:
📘 Задача
📌 Дано
🧠 Решение (простыми шагами)
✔ Ответ

НЕ используй LaTeX.
`
            },
            { role: "user", content: text }
          ]
        })
      });

      if (!res.ok) continue;

      const data = await res.json();

      const answer = data?.choices?.[0]?.message?.content;

      if (answer) return cleanAI(answer);

    } catch (err) {
      console.log("Model error:", err.message);
    }
  }

  return "❌ Нет ответа от модели";
}

/* =======================
   OCR IMAGE SOLVE
======================= */
app.post("/solve-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const result = await Tesseract.recognize(
      req.file.path,
      "rus+eng"
    );

    const text = result.data.text || "";

    fs.unlinkSync(req.file.path);

    const answer = await askAI(text);

    res.json({ answer });

  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "OCR error" });
  }
});

/* =======================
   TEXT SOLVE
======================= */
app.post("/solve-text", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 2) {
      return res.json({ answer: "Введите задачу" });
    }

    const answer = await askAI(text);

    res.json({ answer });

  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* =======================
   START SERVER (RENDER FIX)
======================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});