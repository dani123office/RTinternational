import urllib.request, json

req = urllib.request.Request(
    'https://rt-international.vercel.app/api/auth/login',
    data=b'{"email":"admin@test.com","password":"password"}',
    headers={'Content-Type':'application/json'}
)
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
token = data.get('token') or data.get('access_token')

req2 = urllib.request.Request(
    'https://rt-international.vercel.app/api/admin/agents',
    headers={'Authorization':'Bearer '+token}
)
resp2 = urllib.request.urlopen(req2)
agents = json.loads(resp2.read())
for a in agents:
    if a.get('id') == 28 or ('ahsan' in a.get('name','').lower()):
        print('id=%s name=%s monthlySalary=%s' % (a.get('id'), a.get('name'), a.get('monthlySalary')))
        break
else:
    print('Ahsan not found, first 3:')
    for a in agents[:3]:
        print('  id=%s name=%s monthlySalary=%s' % (a.get('id'), a.get('name'), a.get('monthlySalary')))
