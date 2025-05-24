#!/bin/bash

PUSHGATEWAY_URL="http://localhost:9091"
PROMETHEUS_URL="http://localhost:9090"
JOB_PREFIX="sample_"

echo "=== Fetch job list from Pushgateway ==="

job_list=$(curl -s "$PUSHGATEWAY_URL/metrics" | grep '^batch_duration_seconds{' | sed -E 's/.*job="([^"]+)".*/\1/' | sort | uniq)

echo "=== job_list ==="
echo "$job_list"
echo "==============="

for job in $job_list; do
  if [[ "$job" =~ ^$JOB_PREFIX ]]; then
    echo "🔍 Checking Prometheus for job: '$job'"

    query="batch_duration_seconds{exported_job=\"$job\"}"
    result=$(curl -s --get --data-urlencode "query=$query" "$PROMETHEUS_URL/api/v1/query" | jq -r '.data.result | length')

    echo "Result count: $result"

    if [[ "$result" -gt 0 ]]; then
      echo "✅ Job '$job' found in Prometheus. Deleting from Pushgateway..."
      curl -s -X DELETE "$PUSHGATEWAY_URL/metrics/job/$job"
      echo "Deleted job '$job' from Pushgateway."
    else
      echo "⏭️  Job '$job' not yet collected by Prometheus. Skipping deletion."
    fi
  fi
done
