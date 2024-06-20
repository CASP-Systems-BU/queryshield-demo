#!/bin/bash

# Get the process IDs of all processes containing "vite preview"
pids=$(pgrep -f "app.py")

# Check if there are any matching processes
if [ -z "$pids" ]; then
  echo "No processes found containing 'app.py'."
else
  # Terminate the processes
  echo "Terminating processes containing 'app.py':"
  echo "$pids"
  kill $pids
  echo "Processes terminated."
fi