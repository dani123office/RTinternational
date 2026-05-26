import requests, json

# Check admin list
r = requests.post('http://localhost:7219/api/auth/login', json={'email':'admin@test.com','password':'password'})
token = r.json()['token']

# Get admin transfers list
r2 = requests.get('http://localhost:7219/api/admin/transfers', headers={'Authorization': 'Bearer ' + token})
items = r2.json().get('items', [])
print('=== Admin transfers list ===')
for t in items[:5]:
    print(f'ID {t["id"]}: scheduled={repr(t.get("scheduledDateTime"))}')

# Get agent transfers list
r3 = requests.get('http://localhost:7219/api/transfers?skip=0&limit=50', headers={'Authorization': 'Bearer ' + token})
items3 = r3.json().get('items', [])
print('\n=== Agent transfers list ===')
for t in items3[:5]:
    print(f'ID {t["id"]}: scheduled={repr(t.get("scheduledDateTime"))}')
