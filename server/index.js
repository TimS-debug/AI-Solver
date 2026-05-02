import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import Tesseract from "tesseract.js";
import fs from "fs";

dotenv.config({ path: ".env" });

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

function cleanAI(text) {
  return text
    .replace(/\\\[[\s\S]*?\\\]/g, "")
    .replace(/\\\((.*?)\\\)/g, "$1")
    .replace(/\\;?Rightarrow\\;?/g, "→")
    .replace(/{,}/g, ",")
    .replace(/\\/g, "")
    .trim();
}

async function askAI(text) {
  const models = [
    "openai/gpt-oss-120b:free",
    "meta-llama/llama-3.1-8b-instruct"
  ];

  for (const model of models) {
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
🧠 Решение
✔ Ответ

Без LaTeX. Просто и понятно.
`
          },
          { role: "user", content: text }
        ]
      })
    });

    const data = await res.json();

    if (data?.choices?.[0]?.message?.content) {
      return cleanAI(data.choices[0].message.content);
    }
  }

  return "❌ Нет ответа от модели";
}

/* 📷 OCR */
app.post("/solve-image", upload.single("image"), async (req, res) => {
  try {
    const result = await Tesseract.recognize(req.file.path, "rus+eng");
    const text = result.data.text;

    fs.unlinkSync(req.file.path);

    const answer = await askAI(text);

    res.json({ answer });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ✍️ ТЕКСТ */
app.post("/solve-text", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 2) {
      return res.json({ answer: "Введите текст задачи" });
    }

    const answer = await askAI(text);

    res.json({ answer });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(3000, () => {
  console.log("http://localhost:3000");
});