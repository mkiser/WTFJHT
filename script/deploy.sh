#!/bin/bash
set -e

echo "Deploying _site to S3…"
timeout 5m aws s3 sync _site s3://whatthefuckjusthappenedtoday.com \
  --exact-timestamps \
  --quiet \
  --exclude "aws/*" \
  --exclude "awscli/*"

echo "✅ Deployment to S3 completed."
