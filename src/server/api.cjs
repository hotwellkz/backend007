const express = require('express');
const router = express.Router();
const { streamText } = require('./utils/stream-text.cjs');
const { MAX_RESPONSE_SEGMENTS, MAX_TOKENS, CONTINUE_PROMPT } = require('./utils/constants.cjs');
const SwitchableStream = require('./utils/SwitchableStream.cjs');

require('dotenv').config();

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY не найден в переменных окружения');
  process.exit(1);
}

const parseCookies = (cookieHeader) => {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name && rest.length) {
        cookies[decodeURIComponent(name)] = decodeURIComponent(rest.join('='));
      }
    });
  }
  return cookies;
};

router.post('/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    const cookieHeader = req.headers.cookie || '';
    const apiKeys = JSON.parse(parseCookies(cookieHeader).apiKeys || '{}');

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Неверный формат сообщений' });
      return;
    }

    const stream = new SwitchableStream();
    
    const options = {
      toolChoice: 'none',
      onFinish: async ({ text: content, finishReason }) => {
        if (finishReason !== 'length') {
          return stream.close();
        }

        if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
          throw new Error('Cannot continue message: Maximum segments reached');
        }

        const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;
        console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: CONTINUE_PROMPT });

        const result = await streamText(messages, process.env, options, apiKeys);
        return stream.switchSource(result.toAIStream());
      },
    };

    const result = await streamText(messages, process.env, options, apiKeys);
    stream.switchSource(result.toAIStream());

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    
    if (stream.readable && res.write && res.end) {
      stream.readable.pipeTo(new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        }
      }));
    }

  } catch (error) {
    console.error('Ошибка при обработке запроса чата:', error);
    
    if (error.message?.includes('API key')) {
      res.status(401).json({
        error: 'Неверный или отсутствующий API ключ',
        details: error.message
      });
      return;
    }

    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
});

module.exports = router;
