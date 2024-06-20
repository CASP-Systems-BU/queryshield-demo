#!/bin/bash
nohup sh -c 'npm run build && npm run preview' > frontend.log 2>&1 &