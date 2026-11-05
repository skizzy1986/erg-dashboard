"""Read/write the manifest + gzip/base64 data blob inside the HTML (was pipeline/repack.py)."""
import base64
import copy
import gzip
import json
import re

import numpy as np

TA = {'<i2': np.int16, '|u1': np.uint8, '<u2': np.uint16, '<u4': np.uint32, '<f4': np.float32, '|i1': np.int8}
RTA = {np.dtype(v).str if np.dtype(v).str not in ('|u1','|i1') else np.dtype(v).str: k for k, v in TA.items()}


def load(src):
    with open(src, encoding='utf-8') as fh:
        html = fh.read()
    man = json.loads(re.search(r'<script id="squat-manifest" type="application/json">(.*?)</script>', html, re.S).group(1))
    b64 = re.search(r'<script id="squat-data" type="application/octet-stream">(.*?)</script>', html, re.S).group(1).strip()
    buf = gzip.decompress(base64.b64decode(b64))
    arrs = {}
    for k, e in man.items():
        if isinstance(e, dict) and 'o' in e and 't' in e:
            a = np.frombuffer(buf, dtype=TA[e['t']], count=e['n'], offset=e['o']).copy()
            if 'shape' in e: a = a.reshape(e['shape'])
            arrs[k] = a
    return html, man, arrs


def tcode(a):
    s = a.dtype.str
    return {'<i2':'<i2','|u1':'|u1','<u2':'<u2','<u4':'<u4','<f4':'<f4','|i1':'|i1'}[s]


def save(html, man, arrs, out):
    man = copy.deepcopy(man); parts = []; off = 0
    for k in list(man.keys()):
        e = man[k]
        if isinstance(e, dict) and 'o' in e and 't' in e:
            a = np.ascontiguousarray(arrs[k]); pad = (-off) % 8
            if pad: parts.append(b'\0'*pad); off += pad
            ne = {'o': off, 'n': int(a.size), 't': tcode(a)}
            if 'shape' in e: ne['shape'] = list(a.shape)
            man[k] = ne; b = a.tobytes(); parts.append(b); off += len(b)
    buf = b''.join(parts)
    b64 = base64.b64encode(gzip.compress(buf, 9, mtime=0)).decode()
    mj = json.dumps(man, separators=(',', ':'))
    html = re.sub(r'(<script id="squat-manifest" type="application/json">)(.*?)(</script>)', lambda m: m.group(1)+mj+m.group(3), html, count=1, flags=re.S)
    html = re.sub(r'(<script id="squat-data" type="application/octet-stream">)(.*?)(</script>)', lambda m: m.group(1)+b64+m.group(3), html, count=1, flags=re.S)
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write(html)
    return len(b64)


def quant(P):
    c = (P.max(0)+P.min(0))/2; s = (np.abs(P-c).max()/32760) or 1e-6
    return np.round((P-c)/s).astype(np.int16), c.tolist(), float(s)
