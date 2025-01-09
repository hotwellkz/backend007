import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './api.js';

dotenv.config();

const app = express();

// Настройка CORS для разрешения запросов с вашего домена
app.use(cors({
  origin: ['https://1wox.com', 'http://localhost:8080'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Парсинг JSON в теле запроса
app.use(express.json());

// Подключаем маршруты API
app.use('/api', apiRouter);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});