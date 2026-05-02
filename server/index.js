import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 ГЛАВНАЯ СТРАНИЦА
app.get("/", (req, res) => {
  res.send(`
    <h1>🤖 AI Solver работает</h1>
    <p>Сервер запущен успешно</p>
  `);
});

// 🔥 ТЕСТ API
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});