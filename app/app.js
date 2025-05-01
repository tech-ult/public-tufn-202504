const express = require('express');
const { Client } = require('pg');
const app = express();
const port = 3001;

// --- カスタムエラークラス定義 ---
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// --- PostgreSQL接続 ---
const client = new Client({
  host: 'postgres',
  user: 'user',
  password: 'password',
  database: 'dbname',
});

client.connect(err => {
  if (err) {
    console.error('Failed to connect to PostgreSQL:', err.stack);
  } else {
    console.log('Connected to PostgreSQL');
  }
});

// --- ルート（HTMLページを返す） ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>トップページ</title>
      </head>
      <body>
        <h1>トップページ</h1>

        <h2>正常系API</h2>
        <button onclick="fetchSchema()">スキーマ一覧</button>
        <button onclick="fetchUser()">ユーザー一覧（Slowクエリ）</button>

        <h2>エラー発生API</h2>
        <button onclick="fetchError(404)">404エラー</button>
        <button onclick="fetchError(403)">403エラー</button>
        <button onclick="fetchError(500)">500エラー</button>

        <pre id="result"></pre>

        <script>
          function fetchSchema() {
            fetch('/schema')
              .then(response => {
                if (!response.ok) throw new Error('Server Error');
                return response.json();
              })
              .then(data => {
                document.getElementById('result').textContent =
                  JSON.stringify(data, null, 2);
              })
              .catch(err => {
                console.error(err);
                document.getElementById('result').textContent = 'Error fetching schema';
              });
          }

          function fetchUser() {
            fetch('/user')
              .then(response => {
                if (!response.ok) throw new Error('Server Error');
                return response.json();
              })
              .then(data => {
                document.getElementById('result').textContent =
                  JSON.stringify(data, null, 2);
              })
              .catch(err => {
                console.error(err);
                document.getElementById('result').textContent = 'Error fetching users';
              });
          }

          function fetchError(code) {
            fetch('/error' + code)
              .then(response => {
                return response.json().then(data => {
                  return { status: response.status, data };
                });
              })
              .then(({ status, data }) => {
                document.getElementById('result').textContent =
                  JSON.stringify({ status, ...data }, null, 2);
              })
              .catch(err => {
                console.error(err);
                document.getElementById('result').textContent = 'エラー発生';
              });
          }
        </script>
      </body>
    </html>
  `);
});

// --- APIエンドポイント群 ---
// /schema → スキーマ一覧
app.get('/schema', async (req, res, next) => {
  try {
    const result = await client.query('SELECT schema_name FROM information_schema.schemata');
    res.json(result.rows);
  } catch (err) {
    next(new AppError('Failed to fetch schema', 500));
  }
});

// /user → 20秒待ってからユーザー一覧
app.get('/user', async (req, res, next) => {
  try {
    await client.query('SELECT pg_sleep(20)'); // 20秒待つ(スロークエリ)
    const result = await client.query('SELECT usename FROM pg_user');
    res.json(result.rows);
  } catch (err) {
    next(new AppError('Failed to fetch users', 500));
  }
});

// --- /health チェックエンドポイント ---
app.get('/health', async (req, res, next) => {
  try {
    const result = await client.query('SELECT 1');  // シンプルに"SELECT 1"だけ
    
    res.json({
      status: 'ok',
      postgres: result.rowCount > 0 ? 'connected' : 'no rows',
    });
  } catch (err) {
    console.error('Health check failed:', err.stack);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

// エラー用エンドポイント
app.get('/error404', (req, res, next) => {
  next(new AppError('Resource not found', 404));
});

app.get('/error403', (req, res, next) => {
  next(new AppError('Forbidden access', 403));
});

app.get('/error500', (req, res, next) => {
  next(new AppError('Internal server error', 500));
});

// --- エラーハンドリングミドルウェア ---
app.use((err, req, res, next) => {
  console.error('Error Handler:', err.stack);
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

// --- サーバー起動 ---
app.listen(port, () => {
  console.log(`App is running on http://localhost:${port}`);
});
