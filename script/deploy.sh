#!/bin/bash
set -e

echo "Deploying _site to S3…"
aws s3 sync _site s3://whatthefuckjusthappenedtoday.com --exact-timestamps