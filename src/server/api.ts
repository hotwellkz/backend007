import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY не найден в переменных окружения');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  model: string;
  files?: string[];
}

router.post('/chat', async (req: express.Request, res: express.Response) => {
  try {
    const { messages, model, files } = req.body as ChatRequest;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Неверный формат сообщений' });
    }

    console.log('Отправка запроса к OpenAI:', { messages, model, files });

    const completion = await openai.chat.completions.create({
      model: model || "gpt-4",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0].message;

    console.log('Получен ответ от OpenAI:', aiResponse);

    const response = {
      content: aiResponse.content,
      files: files
    };

    res.json(response);

  } catch (error) {
    console.error('Ошибка при обработке запроса чата:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
});

export default router;