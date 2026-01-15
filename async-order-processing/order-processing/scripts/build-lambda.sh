#!/bin/bash
set -e

for dir in lambdas/*; do
  if [ -d "$dir" ]; then
    echo "Building $dir"
    cd $dir
    npm install --omit=dev
    zip -r ../$(basename $dir).zip .
    cd - > /dev/null
  fi
done
