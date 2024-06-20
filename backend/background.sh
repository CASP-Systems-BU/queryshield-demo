#!/bin/bash
nohup python3 app.py > app.log 2>&1 &
nohup ngrok http 5000 --domain current-sensibly-meerkat.ngrok-free.app > ngrok.log 2>&1 &