#!/bin/bash

# Get the process IDs of all processes containing "vite preview"
pids=$(pgrep -f "vite preview")

# Check if there are any matching processes
if [ -z "$pids" ]; then
  echo "No processes found containing 'vite preview'."
else
  # Terminate the processes
  echo "Terminating processes containing 'vite preview':"
  echo "$pids"
  kill $pids
  echo "Processes terminated."
fi