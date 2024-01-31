#!/bin/bash
nohup python3 app.py > app.log 2>&1 &
nohup ngrok http -subdomain=https://current-sensibly-meerkat.ngrok-free.app http://127.0.0.1:5000 > ngrok.log 2>&1 &
