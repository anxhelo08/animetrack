"""Generate standalone Apple/PWA icons with Python standard library (no font assets)."""
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def polygon(x, y, points):
    inside = False
    j = len(points) - 1
    for i in range(len(points)):
        xi, yi = points[i]
        xj, yj = points[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside

def inside_round(x, y, left, top, right, bottom, r):
    if not(left <= x <= right and top <= y <= bottom):
        return False
    px = min(max(x, left + r), right - r)
    py = min(max(y, top + r), bottom - r)
    return (x - px) ** 2 + (y - py) ** 2 <= r ** 2

def draw(size):
    rows = []
    a = [(0.22,0.72),(0.43,0.25),(0.56,0.25),(0.77,0.72),(0.62,0.72),(0.57,0.60),(0.41,0.60),(0.36,0.72)]
    hole = [(0.445,0.51),(0.525,0.51),(0.485,0.385)]
    play = [(0.66,0.29),(0.83,0.38),(0.66,0.47)]
    for j in range(size):
        row = bytearray([0])
        y = (j + .5) / size
        for i in range(size):
            x = (i + .5) / size
            if not inside_round(x,y,0,0,1,1,.22):
                color = (0,0,0,0)
            elif inside_round(x,y,.07,.07,.93,.93,.19):
                blend = min(1,max(0,(x+y-.15)/1.7))
                color = (round(150*(1-blend)+56*blend),round(104*(1-blend)+180*blend),round(232*(1-blend)+210*blend),255)
                if polygon(x,y,a) and not polygon(x,y,hole):
                    color = (249,246,255,255)
                if polygon(x,y,play):
                    color = (19,24,45,255)
            else:
                color = (21,19,34,255)
            row.extend(color)
        rows.append(bytes(row))
    raw = b''.join(rows)
    def chunk(name, content):
        return struct.pack('>I',len(content))+name+content+struct.pack('>I',zlib.crc32(name+content)&0xffffffff)
    data = b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>2I5B',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
    return data

for pixels, name in [(180,'apple-touch-icon.png'),(192,'icon-192.png'),(512,'icon-512.png')]:
    dest = ROOT/name
    dest.write_bytes(draw(pixels))
    print(f'{name}: {dest.stat().st_size} bytes')
