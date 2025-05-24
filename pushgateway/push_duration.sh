#!/bin/bash

# 引数チェック
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <request_id> <sleep_seconds>"
  exit 1
fi

REQUEST_ID="$1"
SLEEP_SECONDS="$2"

# バリデーション（sleep秒数は整数のみ許可）
if ! [[ "$SLEEP_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "Error: sleep_seconds must be a positive integer"
  exit 1
fi

# 開始時刻（秒）
START_TIME=$(date +%s)

# ----------------------------------
# バッチ処理の代わりに sleep
sleep "$SLEEP_SECONDS"
# ----------------------------------

# 終了時刻（秒）
END_TIME=$(date +%s)

# duration 計算
DURATION=$((END_TIME - START_TIME))

# ジョブ名の生成
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
JOB_NAME="sample_${REQUEST_ID}_${TIMESTAMP}"

# Pushgateway URL
PUSHGATEWAY_URL="http://localhost:9091"

# メトリクスをPush
cat <<EOF | curl --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/${JOB_NAME}"
# TYPE batch_duration_seconds gauge
batch_duration_seconds ${DURATION}
EOF

echo "Pushed batch_duration_seconds=${DURATION} to job=${JOB_NAME}"
