import time
import requests
from requests.auth import HTTPDigestAuth
import urllib3
import logging
from datetime import datetime

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration
HIKVISION_IP = "192.168.1.43"
HIKVISION_USER = "admin"
HIKVISION_PASS = "Hik786786"
VPS_WEBHOOK_URL = "http://148.230.123.180:8000/api/attendance/hikvision-event"
SYNC_INTERVAL_SECONDS = 60

# Setup Logging
logging.basicConfig(
    filename="hikvision_sync.log",
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

print("==================================================")
print("   Hikvision 1-Minute Auto-Sync Service Started   ")
print("==================================================")
print(f"Device IP: {HIKVISION_IP}")
print(f"VPS Endpoint: {VPS_WEBHOOK_URL}")
print(f"Sync Interval: Every {SYNC_INTERVAL_SECONDS} seconds")
print("==================================================\n")

def fetch_and_sync_punches():
    now_str = datetime.now().strftime("%Y-%m-%d")
    url_isapi = f"https://{HIKVISION_IP}/ISAPI/AccessControl/AcsEvent?format=json"
    
    payload = {
        "AcsEventCond": {
            "searchID": "1",
            "searchResultPosition": 0,
            "maxResults": 100,
            "major": 5,  # Access control events
            "minor": 0,
            "startTime": f"{now_str}T00:00:00+05:00",
            "endTime": f"{now_str}T23:59:59+05:00"
        }
    }
    
    try:
        r = requests.post(
            url_isapi,
            json=payload,
            auth=HTTPDigestAuth(HIKVISION_USER, HIKVISION_PASS),
            verify=False,
            timeout=8
        )
        
        if r.status_code == 401:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] WARNING: Device Unauthorized/Locked out. Please open https://192.168.1.43/ in browser once to unlock.")
            logging.warning("Device returned 401 Unauthorized or locked.")
            return

        if r.status_code != 200:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ISAPI Response Code: {r.status_code}")
            return

        data = r.json()
        acs_info = data.get("AcsEvent", {})
        info_list = acs_info.get("InfoList", [])
        
        synced_count = 0
        for item in info_list:
            emp_id = item.get("employeeNoString") or item.get("employeeNo")
            event_time = item.get("time")
            if not emp_id:
                continue
                
            # Send to VPS API
            event_payload = {
                "AccessControllerEvent": {
                    "employeeNoString": str(emp_id),
                    "eventTime": event_time
                }
            }
            try:
                vps_resp = requests.post(VPS_WEBHOOK_URL, json=event_payload, timeout=5)
                if vps_resp.status_code == 200:
                    synced_count += 1
            except Exception as e_vps:
                logging.error(f"Failed to post punch for ID {emp_id} to VPS: {e_vps}")
                
        print(f"[{datetime.now().strftime('%H:%M:%S')}] SUCCESS: Synced {synced_count} punch events for today ({now_str}) to Portal.")
        logging.info(f"Synced {synced_count} punches to VPS.")
        
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ERROR: Sync Error: {e}")
        logging.error(f"Sync error: {e}")

def main():
    while True:
        fetch_and_sync_punches()
        time.sleep(SYNC_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
