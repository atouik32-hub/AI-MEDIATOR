const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const GATEWAY_PORT = 3456;
const HTML_FILE = path.join(__dirname, 'AI_Mediator_GUI.html');

function ask(model, content) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [{ role: 'user', content }]
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port: GATEWAY_PORT,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 300000
    }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.error) return reject(new Error(j.error.message || 'Gateway error'));
          const content = j?.choices?.[0]?.message?.content;
          if (typeof content !== 'string') return reject(new Error('Réponse invalide du Gateway'));
          resolve(content);
        } catch (e) {
          reject(new Error('تعذر قراءة رد Gateway: ' + e.message));
        }
      });
    });

    req.on('timeout', () => req.destroy(new Error('انتهت مهلة الطلب')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sendJson(res, status, payload) {
  const text = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store'
  });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      const html = fs.readFileSync(HTML_FILE);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    if (req.method === 'POST' && req.url === '/api/mediate') {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const question = String(parsed.question || '').trim();
          if (!question) return sendJson(res, 400, { error: 'السؤال فارغ.' });

          const deepseek = await ask('deepseek-chat', question);
          const chatgpt = await ask(
            'gpt-4',
            'راجع إجابة DeepSeek التالية، وصححها إن لزم، ثم أجب باختصار:\n\n' + deepseek
          );

          sendJson(res, 200, { deepseek, chatgpt });
        } catch (e) {
          sendJson(res, 500, { error: e.message || String(e) });
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  } catch (e) {
    sendJson(res, 500, { error: e.message || String(e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`AI Mediator GUI: http://127.0.0.1:${PORT}`);
});
