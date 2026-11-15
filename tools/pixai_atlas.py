# 개발용: PixAI로 뽑은 "5단계 장비 그림"(가로 한 줄에 5개)을 잘라 32×32 도트 아이콘 아틀라스로 만든다.
# 입력: assets/pixai/raw/<form>.png|jpg|webp   출력: assets/gear_atlas.png (+ assets/gear_atlas.json)
# 아틀라스 한 줄 = 장비 종류 하나, 칸 5개 = 단계 0~4.
import json, os, sys
import numpy as np
from scipy import ndimage
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'assets', 'pixai', 'raw')
OUT = os.path.join(ROOT, 'assets', 'gear_atlas.png')
CELL = 32


def load(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(np.int32)


def fg_mask(a):
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    d = np.sqrt(((a - bg) ** 2).sum(axis=2))
    m = d > 26
    m = ndimage.binary_closing(m, iterations=2)
    return ndimage.binary_fill_holes(m)


def runs(cols, min_gap):
    out, start, gap = [], None, 0
    for i, v in enumerate(cols):
        if v:
            if start is None: start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap > min_gap:
                out.append((start, i - gap + 1)); start = None; gap = 0
    if start is not None: out.append((start, len(cols)))
    return out


def split5(mask):
    """연결된 덩어리 단위로 5개를 찾는다. 큰 덩어리 5개를 고르고 가까운 조각은 붙인다."""
    h, w = mask.shape
    lab, n = ndimage.label(mask)
    if n == 0: return [None] * 5
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    order = np.argsort(sizes)[::-1]
    big = [int(i) + 1 for i in order[:5] if sizes[i] > sizes[order[0]] * 0.08]
    cents = {l: ndimage.center_of_mass(mask, lab, l)[1] for l in big}
    big.sort(key=lambda l: cents[l])
    groups = {l: [l] for l in big}
    for i in order[5:]:                     # 작은 조각은 가장 가까운 큰 덩어리에
        l = int(i) + 1
        if sizes[i] < 30: continue
        cx = ndimage.center_of_mass(mask, lab, l)[1]
        best = min(big, key=lambda b: abs(cents[b] - cx))
        if abs(cents[best] - cx) < w * 0.09: groups[best].append(l)
    out = [np.isin(lab, groups[l]) for l in big]
    while len(out) < 5: out.append(None)
    return out


def to_icon(a, m):
    if m is None: return Image.new('RGBA', (CELL, CELL))
    sub = a
    ys, xs = np.nonzero(m)
    if len(ys) == 0: return Image.new('RGBA', (CELL, CELL))
    y0, y1, xa, xb = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = sub[y0:y1, xa:xb].astype(np.uint8); cm = m[y0:y1, xa:xb]
    hh, ww = cm.shape; side = int(max(hh, ww) * 1.06) + 2
    rgba = np.zeros((side, side, 4), np.uint8)
    oy, ox = (side - hh) // 2, (side - ww) // 2
    rgba[oy:oy + hh, ox:ox + ww, :3] = crop
    rgba[oy:oy + hh, ox:ox + ww, 3] = cm * 255
    img = Image.fromarray(rgba, 'RGBA')
    inner = CELL - 2                          # 외곽선 1px 자리
    small = img.resize((inner, inner), Image.LANCZOS)
    arr = np.asarray(small).copy()
    arr[..., 3] = np.where(arr[..., 3] > 110, 255, 0)
    rgb = Image.fromarray(arr[..., :3]).quantize(colors=14, method=Image.MEDIANCUT).convert('RGB')
    arr[..., :3] = np.asarray(rgb)
    out = np.zeros((CELL, CELL, 4), np.uint8); out[1:-1, 1:-1] = arr
    al = out[..., 3] > 0                      # 어두운 외곽선
    ring = np.zeros_like(al)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)): ring |= np.roll(np.roll(al, dy, 0), dx, 1)
    ring &= ~al
    out[ring] = (14, 10, 16, 235)
    return Image.fromarray(out, 'RGBA')


def main():
    files = sorted(f for f in os.listdir(RAW) if f.rsplit('.', 1)[-1].lower() in ('png', 'jpg', 'jpeg', 'webp'))
    forms = [f.rsplit('.', 1)[0] for f in files]
    atlas = Image.new('RGBA', (CELL * 5, CELL * len(files)))
    report = {}
    for r, f in enumerate(files):
        a = load(os.path.join(RAW, f)); m = fg_mask(a)
        rs = split5(m)
        report[forms[r]] = sum(1 for x in rs if x is not None)
        for c, mm in enumerate(rs): atlas.paste(to_icon(a, mm), (c * CELL, r * CELL))
    atlas.save(OUT)
    json.dump({'cell': CELL, 'forms': forms}, open(OUT.replace('.png', '.json'), 'w'), ensure_ascii=False)
    with open(os.path.join(ROOT, 'js', 'gear_atlas.js'), 'w', encoding='utf-8') as f:   # 게임이 읽는 목록
        f.write('// 자동 생성 (tools/pixai_atlas.py) — 장비 그림 아틀라스의 줄 순서\nconst GEAR_ATLAS = ' + json.dumps({'cell': CELL, 'forms': forms}) + ';\n')
    print('atlas', atlas.size, 'forms', len(forms), {k: v for k, v in report.items() if v != 5})


if __name__ == '__main__':
    main()
