import requests, json, sys

r = requests.post('http://localhost:7219/api/auth/login', json={'email':'admin@test.com','password':'password'})
token = r.json()['token']

for tid in [1, 2, 5, 10, 15, 16]:
    r2 = requests.get(f'http://localhost:7219/api/transfers/{tid}', headers={'Authorization': f'Bearer {token}'})
    if r2.status_code == 200:
        d = r2.json()
        sched = d.get('scheduledDateTime')
        print(f'Transfer {tid}: scheduled={repr(sched)}')
    else:
        print(f'Transfer {tid}: {r2.status_code}')
