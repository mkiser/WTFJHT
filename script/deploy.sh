#!/bin/bash
set -e

echo "🟢 Starting deploy to S3…"

# Optional: echo current AWS identity
aws sts get-caller-identity

# Deploy to S3 (adjust region if needed)
aws s3 sync _site s3://whatthefuckjusthappenedtoday.com

echo "✅ Deploy complete"
