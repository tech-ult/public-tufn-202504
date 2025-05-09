# テックウルトフライデーナイト vol.1 ハンズオン資料

## Prometheus + Grafana でモニタリングを体験する

## 概要図

![概要図](document/overview.png)

## 環境構築

Dockerコンテナを使用して、Prometheusの監視環境を構築する。

1. GitHubからリソース取得

```bash
# リポジトリクローン
$ git pull https://github.com/tech-ult/public-tufn-202504.git
$ cd public-tufn-202504
```

2. SLACKの通知先設定

[alertmanager/alertmanager.yml](alertmanager/alertmanager.yml) の `slack_api_url` に、自身のSLACK_APIエンドポイントを設定する。

また、receiversの `channel` に、通知先のチャネル名を指定する。

```YAML
  # Slackの設定（SlackのIncoming Webhook URLを設定）
  slack_api_url: 'https://hooks.slack.com/services/XXXXXXXXXX/XXXXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXj'

: 途中省略

  slack_configs:
  - channel: '#alert'
```

3. コンテナのビルドと起動

```bash
# nginxとwebappのコンテナビルド
$ docker compose build --no-cache
# コンテナ立ち上げ
$ docker compose up -d
# 12プロセス起動確認
$ docker ps
CONTAINER ID   IMAGE                                                   COMMAND                  CREATED          STATUS          PORTS                                                                      NAMES
cbd7def12724   nginx/nginx-prometheus-exporter:latest                  "/usr/bin/nginx-prom…"   11 seconds ago   Up 9 seconds    0.0.0.0:9113->9113/tcp, :::9113->9113/tcp                                  nginx_exporter
d67ba5ee2867   quay.io/martinhelmich/prometheus-nginxlog-exporter:v1   "/prometheus-nginxlo…"   11 seconds ago   Up 9 seconds    0.0.0.0:9114->4040/tcp, [::]:9114->4040/tcp                                nginx_log_exporter
13a2eb7f6296   public-tufn-202504-nginx                                "bash -c '/usr/local…"   11 seconds ago   Up 9 seconds    0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp   nginx_server
bc555c4d5888   public-tufn-202504-webapp                               "docker-entrypoint.s…"   11 seconds ago   Up 9 seconds    0.0.0.0:3001->3001/tcp, :::3001->3001/tcp                                  nodejs_webapp
553bfd5b0052   grafana/grafana                                         "/run.sh"                11 seconds ago   Up 9 seconds    0.0.0.0:3000->3000/tcp, :::3000->3000/tcp                                  grafana
821f0c379d7c   prom/pushgateway                                        "/bin/pushgateway"       11 seconds ago   Up 10 seconds   0.0.0.0:9091->9091/tcp, :::9091->9091/tcp                                  pushgateway
22dd5896e696   prom/node-exporter                                      "/bin/node_exporter …"   11 seconds ago   Up 10 seconds   0.0.0.0:9100->9100/tcp, :::9100->9100/tcp                                  node_exporter
42a1dd9013a0   prom/alertmanager                                       "/bin/alertmanager -…"   11 seconds ago   Up 10 seconds   0.0.0.0:9093->9093/tcp, :::9093->9093/tcp                                  alertmanager
8023234ce6f1   prom/blackbox-exporter                                  "/bin/blackbox_expor…"   11 seconds ago   Up 10 seconds   0.0.0.0:9115->9115/tcp, :::9115->9115/tcp                                  blackbox_exporter
96db652de4ce   prom/prometheus                                         "/bin/prometheus --c…"   11 seconds ago   Up 10 seconds   0.0.0.0:9090->9090/tcp, :::9090->9090/tcp                                  prometheus
b7f3e4a19890   postgres:latest                                         "docker-entrypoint.s…"   11 seconds ago   Up 10 seconds   0.0.0.0:5432->5432/tcp, :::5432->5432/tcp                                  postgres_server
fada8e698e17   prometheuscommunity/postgres-exporter                   "/bin/postgres_expor…"   11 seconds ago   Up 10 seconds   9187/tcp                                                                   postgres_exporter
```

### Dockerコンテナ毎の役割

|No.|コンテナ名|役割|
|:--|:--|:--|
|1|prometheus|Prometheus 本体|
|2|grafana|Visualization の Grafana|
|3|nginx_server|Nginx Web Server|
|4|nodejs_webapp|Node.js App Server|
|5|postgres_server|PostgreSQL DB Server|
|6|pushgateway|Pushgateway。短命JOBがメトリクスをPushする。|
|7|alertmanager|Alertmanager。Prometheusから受信したアラートを通知先に送信する。|
|8|node_exporter|ノードのCUP使用率等のメトリクスを収集する。|
|9|nginx_exporter|Nginxの接続数等を収集する。|
|10|nginx_log_exporter|Nginxのアクセスログをもとにステータスコード等のメトリクスを収集する。|
|11|postgres_exporter|PostgreSQLのスロークエリ等のメトリクスを収集する。|
|12|blackbox_exporter|外形監視でサービスの生存確認やエンドポイントごとのレイテンシー等のメトリクスを収集する。|

## 主な設定ファイル

|No.|設定ファイル名|設定内容|
|:--|:--|:--|
|1|[prometheus/prometheus.yml](prometheus/prometheus.yml)|メトリクス収集対象のExporter定義、メトリクス収集間隔定義|
|2|[prometheus/alert_rules.yml](prometheus/alert_rules.yml)|PromQLによるアラート条件の定義。閾値超過した状態がどれくらい継続したらアラートを発報するか、などを設定する。|
|3|[alertmanager/alertmanager.yml](alertmanager/alertmanager.yml)|アラートの通知先やアラートメッセージの他、複数のアラートをグルーピングしたり、同一グループのアラートの再送通知間隔などを設定する。
