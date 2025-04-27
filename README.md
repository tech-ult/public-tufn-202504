# テックウルトフライデーナイト vol.1 ハンズオン資料

## Prometheus + Grafana でモニタリングを体験する

### 環境構築
Docker Composeで、Prometheusや監視対象サービスのコンテナを立ち上げる

```bash
$ git pull https://github.com/tech-ult/tufn-202504.git
$ cd tufn-202504
$ docker compose build --no-cache
$ docker compose up -d
```

|No.|コンテナ名|役割|
|:--|:--|:--|
|1|prometheus|Prometheus server|
|2|grafana|Visualization の Grafana server|
|3|nginx_exporter||
|4|nginx_exporter||
|5|nginx_exporter||
|6|nginx_exporter||
|7|nginx_exporter||
|8|nginx_exporter||
