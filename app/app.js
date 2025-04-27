const express = require('express');
const { Client } = require('pg');
const app = express();
const port = 3001;

// PostgreSQL接続情報
const client = new Client({
  host: 'postgres',
  user: 'user',
  password: 'password',
  database: 'dbname',
});

// PostgreSQLに接続
client.connect(err => {
  if (err) {
    console.error('Failed to connect to PostgreSQL:', err.stack);
  } else {
    console.log('Connected to PostgreSQL');
  }
});

// ルートエンドポイント → HTMLを返す
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>トップページ</title>
      </head>
      <body>
        <h1>トップページ</h1>
        <button onclick="fetchSchema()">スキーマ一覧</button>
        <button onclick="fetchUser()">ユーザー一覧（Slowクエリ）</button>

        <pre id="result"></pre>

        <script>
          function fetchSchema() {
            fetch('/schema')
              .then(response => response.json())
              .then(data => {
                document.getElementById('result').textContent = JSON.stringify(data, null, 2);
              })
              .catch(err => {
                console.error(err);
                document.getElementById('result').textContent = 'Error fetching schema';
              });
          }

          function fetchUser() {
            fetch('/user')
              .then(response => response.json())
              .then(data => {
                document.getElementById('result').textContent = JSON.stringify(data, null, 2);
              })
              .catch(err => {
                console.error(err);
                document.getElementById('result').textContent = 'Error fetching users';
              });
          }
        </script>
      </body>
    </html>
  `);
});

// /schema エンドポイント → スキーマ一覧をJSONで返す
app.get('/schema', async (req, res) => {
  try {
    const result = await client.query('SELECT schema_name FROM information_schema.schemata');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching schema');
  }
});

// /user エンドポイント → 2秒待ってからユーザー一覧をJSONで返す
app.get('/user', async (req, res) => {
  try {
    await client.query('SELECT pg_sleep(2)');
    const result = await client.query('SELECT usename FROM pg_user');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching users');
  }
});

app.listen(port, () => {
  console.log(`App is running on http://localhost:${port}`);
});
