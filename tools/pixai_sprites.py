# 개발용: PixAI로 뽑은 환상체 그림·E.G.O 장비 그림을 잘라 게임용 도트 이미지로 만든다.
# 입력: assets/pixai/raw_abno/<키>.png, assets/pixai/raw_ego/<키>.png
# 출력: assets/abno/<키>.png (배경을 지운 도트 스프라이트, 높이 96) · assets/ego_atlas.png (32px 칸) + js/ego_atlas.js
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def cutout(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    m = np.sqrt(((a - bg) ** 2).sum(axis=2)) > 30
    m = ndimage.binary_closing(m, iterations=2)
    m = ndimage.binary_fill_holes(m)
    lab, n = ndimage.label(m)
    if n:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        keep = [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * 0.05]
        m = np.isin(lab, keep)
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    rgba[..., :3] = a[y0:y1, x0:x1]; rgba[..., 3] = m[y0:y1, x0:x1] * 255
    return Image.fromarray(rgba, 'RGBA')

def pixelize(img, h, colors=24):
    w = max(1, round(img.width * h / img.height))
    small = img.resize((w, h), Image.LANCZOS)
    arr = np.asarray(small).copy()
    arr[..., 3] = np.where(arr[..., 3] > 120, 255, 0)
    rgb = Image.fromarray(arr[..., :3]).quantize(colors=colors, method=Image.MEDIANCUT).convert('RGB')
    arr[..., :3] = np.asarray(rgb)
    # 어두운 외곽선
    al = arr[..., 3] > 0
    out = np.zeros((h + 2, w + 2, 4), np.uint8); out[1:-1, 1:-1] = arr
    al2 = out[..., 3] > 0
    ring = np.zeros_like(al2)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)): ring |= np.roll(np.roll(al2, dy, 0), dx, 1)
    ring &= ~al2
    out[ring] = (14, 10, 16, 235)
    return Image.fromarray(out, 'RGBA')

def main():
    ra, re = os.path.join(ROOT, 'assets/pixai/raw_abno'), os.path.join(ROOT, 'assets/pixai/raw_ego')
    os.makedirs(os.path.join(ROOT, 'assets/abno'), exist_ok=True)
    abno = sorted(f[:-4] for f in os.listdir(ra) if f.endswith('.png')) if os.path.isdir(ra) else []
    for k in abno:
        pixelize(cutout(os.path.join(ra, k + '.png')), 96, 28).save(os.path.join(ROOT, 'assets/abno', k + '.png'))
    ego = sorted(f[:-4] for f in os.listdir(re) if f.endswith('.png')) if os.path.isdir(re) else []
    atlas = Image.new('RGBA', (32 * max(1, len(ego)), 32))
    for i, k in enumerate(ego):
        ic = cutout(os.path.join(re, k + '.png'))
        side = max(ic.width, ic.height); sq = Image.new('RGBA', (side, side)); sq.paste(ic, ((side - ic.width) // 2, (side - ic.height) // 2))
        atlas.paste(pixelize(sq, 30, 14), (i * 32, 0))
    atlas.save(os.path.join(ROOT, 'assets/ego_atlas.png'))
    with open(os.path.join(ROOT, 'js/ego_atlas.js'), 'w', encoding='utf-8') as f:
        f.write('// 자동 생성 (tools/pixai_sprites.py) — 환상체 그림 · E.G.O 장비 그림 목록\nconst ABNO_ART = ' + json.dumps(abno) + ';\nconst EGO_ATLAS = ' + json.dumps(ego) + ';\n')
    print('abno', len(abno), 'ego', len(ego))

if __name__ == '__main__':
    main()
