const express = require('express');
const { Client } = require('pg');
const clientProm = require('prom-client');
const app = express();
const port = 3001;

// --- Prometheus Metrics 設定 ---
// デフォルトのプロセスメトリクス収集を有効化
clientProm.collectDefaultMetrics();

// === カスタムメトリクス定義 ===

// 1. HTTPリクエスト関連メトリクス
const httpRequestCounter = new clientProm.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// HTTPリクエストの応答時間を測定（ヒストグラム）
const httpRequestDuration = new clientProm.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // レスポンス時間のバケット設定
});

// 2. データベース関連メトリクス
const dbConnectionsActive = new clientProm.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
});

const dbQueryDuration = new clientProm.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Time spent on database queries',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30] // DBクエリ用のバケット
});

const dbQueryCounter = new clientProm.Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries executed',
  labelNames: ['query_type', 'status'], // 成功/失敗を追跡
});

// 3. アプリケーション固有のビジネスメトリクス
const userActionsCounter = new clientProm.Counter({
  name: 'user_actions_total',
  help: 'Total number of user actions',
  labelNames: ['action_type', 'endpoint'], // ユーザーアクション種別を追跡
});

const healthCheckStatus = new clientProm.Gauge({
  name: 'health_check_status',
  help: 'Application health status (1=healthy, 0=unhealthy)',
});

// 4. エラー関連メトリクス
const applicationErrors = new clientProm.Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['error_type', 'endpoint', 'severity'], // エラー種別と重要度を追跡
});

// 5. パフォーマンス関連メトリクス
const slowQueriesCounter = new clientProm.Counter({
  name: 'slow_queries_total',
  help: 'Total number of slow database queries (>5 seconds)',
  labelNames: ['query_type'],
});

// --- カスタムエラークラス定義 ---
class AppError extends Error {
  constructor(message, statusCode, errorType = 'generic') {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType; // エラー種別を追加
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
    // データベース接続エラーのメトリクス記録
    applicationErrors.inc({
      error_type: 'database_connection',
      endpoint: 'startup',
      severity: 'critical'
    });
    dbConnectionsActive.set(0); // 接続失敗を記録
  } else {
    console.log('Connected to PostgreSQL');
    dbConnectionsActive.set(1); // アクティブ接続数を設定
  }
});

// --- ミドルウェア: リクエスト追跡とメトリクス収集 ---
app.use((req, res, next) => {
  const startTime = Date.now();

  // ユーザーアクションを記録（全リクエストで追跡）
  userActionsCounter.inc({
    action_type: req.method.toLowerCase(),
    endpoint: req.path
  });

  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000; // 秒に変換
    const route = req.route ? req.route.path : req.path;
    
    // HTTPリクエスト数をカウント
    httpRequestCounter.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });

    // HTTPリクエスト応答時間を記録
    httpRequestDuration.observe({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    }, duration);

    // エラーレスポンスの場合、エラーメトリクスも更新
    if (res.statusCode >= 400) {
      const severity = res.statusCode >= 500 ? 'error' : 'warning';
      applicationErrors.inc({
        error_type: 'http_error',
        endpoint: route,
        severity: severity
      });
    }
  });
  
  next();
});

// --- /metricsエンドポイント追加 ---
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', clientProm.register.contentType);
  res.end(await clientProm.register.metrics());
});

// --- ルート（HTMLページを返す） ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>トップページ</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { color: #333; }
          button { 
            margin: 5px; 
            padding: 10px 15px; 
            background-color: #007bff; 
            color: white; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
          }
          button:hover { background-color: #0056b3; }
          #result { 
            margin-top: 20px; 
            padding: 15px; 
            background-color: #f8f9fa; 
            border: 1px solid #dee2e6; 
            border-radius: 4px; 
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <h1>トップページ</h1>

        <h2>正常系API</h2>
        <button onclick="fetchSchema()">スキーマ一覧</button>
        <button onclick="fetchUser()">ユーザー一覧（Slowクエリ）</button>
        <button onclick="fetchCompany()">会社一覧</button>

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

          function fetchCompany() {
            fetch('/company')
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
                document.getElementById('result').textContent = 'Error fetching companies';
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

// /schema → スキーマ一覧（軽量なクエリ）
app.get('/schema', async (req, res, next) => {
  const queryStartTime = Date.now();
  
  try {
    // データベーククエリ実行前のメトリクス記録
    const queryType = 'select_schema';
    
    const result = await client.query('SELECT schema_name FROM information_schema.schemata');
    
    // クエリ実行時間を計算・記録
    const queryDuration = (Date.now() - queryStartTime) / 1000;
    dbQueryDuration.observe({
      query_type: queryType,
      table: 'information_schema'
    }, queryDuration);
    
    // 成功したクエリをカウント
    dbQueryCounter.inc({
      query_type: queryType,
      status: 'success'
    });
    
    res.json(result.rows);
  } catch (err) {
    // 失敗したクエリをカウント
    dbQueryCounter.inc({
      query_type: 'select_schema',
      status: 'error'
    });
    
    next(new AppError('Failed to fetch schema', 500, 'database_query'));
  }
});

// /company → 会社一覧を取得
app.get('/company', async (req, res, next) => {
  const queryStartTime = Date.now();
  
  try {
    const queryType = 'select_companies';
    
    const result = await client.query('SELECT * FROM company ORDER BY id');
    
    // クエリ実行時間を計算・記録
    const queryDuration = (Date.now() - queryStartTime) / 1000;
    dbQueryDuration.observe({
      query_type: queryType,
      table: 'company'
    }, queryDuration);
    
    // 成功したクエリをカウント
    dbQueryCounter.inc({
      query_type: queryType,
      status: 'success'
    });
    
    res.json({
      total: result.rows.length,
      companies: result.rows
    });
  } catch (err) {
    console.error('Company query error:', err.stack);
    
    // 失敗したクエリをカウント
    dbQueryCounter.inc({
      query_type: 'select_companies',
      status: 'error'
    });
    
    next(new AppError('Failed to fetch companies', 500, 'database_query'));
  }
});

// /user → 10秒待ってからユーザー一覧（スロークエリのシミュレーション）
app.get('/user', async (req, res, next) => {
  const queryStartTime = Date.now();
  
  try {
    const queryType = 'select_users';
    
    // 意図的な遅延クエリ
    await client.query('SELECT pg_sleep(10)'); // 10秒待つ(スロークエリ)
    const result = await client.query('SELECT usename FROM pg_user');
    
    // クエリ実行時間を計算・記録
    const queryDuration = (Date.now() - queryStartTime) / 1000;
    dbQueryDuration.observe({
      query_type: queryType,
      table: 'pg_user'
    }, queryDuration);
    
    // スロークエリの検出（5秒以上）
    if (queryDuration > 5) {
      slowQueriesCounter.inc({
        query_type: queryType
      });
      
      // 警告レベルのエラーとして記録
      applicationErrors.inc({
        error_type: 'slow_query',
        endpoint: '/user',
        severity: 'warning'
      });
    }
    
    // 成功したクエリをカウント
    dbQueryCounter.inc({
      query_type: queryType,
      status: 'success'
    });
    
    res.json(result.rows);
  } catch (err) {
    // 失敗したクエリをカウント
    dbQueryCounter.inc({
      query_type: 'select_users',
      status: 'error'
    });
    
    next(new AppError('Failed to fetch users', 500, 'database_query'));
  }
});

// --- /health チェックエンドポイント（ヘルスチェック強化版） ---
app.get('/health', async (req, res, next) => {
  const healthCheckStart = Date.now();
  
  try {
    // データベース接続テスト
    const result = await client.query('SELECT 1');
    const healthCheckDuration = (Date.now() - healthCheckStart) / 1000;
    
    // ヘルスチェック成功
    healthCheckStatus.set(1);
    
    // データベース接続状態を更新
    dbConnectionsActive.set(1);
    
    // ヘルスチェックのレスポンス時間も記録
    dbQueryDuration.observe({
      query_type: 'health_check',
      table: 'system'
    }, healthCheckDuration);
    
    res.json({
      status: 'ok',
      postgres: result.rowCount > 0 ? 'connected' : 'no rows',
      response_time_ms: Math.round(healthCheckDuration * 1000)
    });
  } catch (err) {
    console.error('Health check failed:', err.stack);
    
    // ヘルスチェック失敗
    healthCheckStatus.set(0);
    dbConnectionsActive.set(0);
    
    // クリティカルエラーとして記録
    applicationErrors.inc({
      error_type: 'health_check_failure',
      endpoint: '/health',
      severity: 'critical'
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

// エラー用エンドポイント（エラータイプ別の詳細追跡）
app.get('/error404', (req, res, next) => {
  next(new AppError('Resource not found', 404, 'not_found'));
});

app.get('/error403', (req, res, next) => {
  next(new AppError('Forbidden access', 403, 'forbidden'));
});

app.get('/error500', (req, res, next) => {
  next(new AppError('Internal server error', 500, 'internal_server'));
});

// --- 拡張エラーハンドリングミドルウェア ---
app.use((err, req, res, next) => {
  console.error('Error Handler:', err.stack);
  
  // エラー詳細をメトリクスに記録
  const severity = err.statusCode >= 500 ? 'error' : 'warning';
  const route = req.route ? req.route.path : req.path;
  
  applicationErrors.inc({
    error_type: err.errorType || 'unknown',
    endpoint: route,
    severity: severity
  });
  
  // データベース関連エラーの場合、追加メトリクス
  if (err.errorType === 'database_query' || err.errorType === 'database_connection') {
    dbConnectionsActive.set(0); // 接続状態を更新
  }
  
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    error_type: err.errorType || 'unknown'
  });
});

// --- サーバー起動 ---
app.listen(port, () => {
  console.log(`App is running on http://localhost:${port}`);
  
  // アプリケーション起動成功をメトリクスで記録
  healthCheckStatus.set(1);
  console.log(`Metrics available at http://localhost:${port}/metrics`);
});

// --- 定期的なメトリクス更新（例：データベース接続プールの監視） ---
setInterval(() => {
  // 実際の運用では、データベース接続プールの状態やその他のリソース使用状況を
  // ここで定期的に取得・更新する
  
  // 例：メモリ使用量が閾値を超えた場合の警告
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB超過
    applicationErrors.inc({
      error_type: 'high_memory_usage',
      endpoint: 'system',
      severity: 'warning'
    });
  }
}, 30000); // 30秒間隔
