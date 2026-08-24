@echo off
title Hikvision 1-Minute Auto-Sync Service
echo Starting Hikvision Auto-Sync Service...
cd /d "E:\RTinternational"
python hikvision_sync_service.py
pause
