import urllib.request, json

# Login
req = urllib.request.Request(
    'http://localhost:7219/api/auth/login',
    data=b'{"email":"admin@test.com","password":"password"}',
    headers={'Content-Type': 'application/json'}
)
resp = urllib.request.urlopen(req)
token = json.loads(resp.read())['token']

# Get salary slip
req2 = urllib.request.Request(
    'http://localhost:7219/api/salary/slip',
    headers={'Authorization': 'Bearer ' + token}
)
resp2 = urllib.request.urlopen(req2)
data = resp2.read()

with open(r'C:\Users\R.T INTERNATIONAL\Downloads\RTinternational\slip_test.pdf', 'wb') as f:
    f.write(data)

print('PDF: %d bytes' % len(data))
print('Header: %s' % data[:8])
print('Trailer ends with EOF: %s' % data.rstrip().endswith(b'%%EOF'))

# Validate xref offsets
text = data.decode('latin-1')
lines = text.splitlines()
for i, line in enumerate(lines):
    if line == 'xref':
        for j in range(i+1, len(lines)):
            l = lines[j]
            if l and l[0].isdigit() and ' ' in l:
                parts = l.split()
                if len(parts) == 3 and parts[2] in ('n', 'f'):
                    offset = int(parts[0])
                    print('xref entry: obj starts at byte %d -> actual: %s' % (offset, repr(data[offset:offset+15])))
            elif l.startswith('trailer'):
                break
        break
print('DONE')
