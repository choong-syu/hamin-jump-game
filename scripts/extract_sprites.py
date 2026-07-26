"""두 장의 동물 시트에서 12레벨 × 6동작 투명 PNG를 추출한다."""
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE_1_8 = ROOT / "assets" / "raw" / "animal-sprite-sheet.png"
SOURCE_9_12 = ROOT / "assets" / "raw" / "animal-sprite-sheet-level9-12.png"
OUTPUT = ROOT / "assets" / "sprites"
STATES = ("idle", "jump", "rise", "fall", "landing", "crouch")
CROP_LEFT, CROP_RIGHT = 130, 1330
COLS = 6

def clear_edge_white(image: Image.Image) -> Image.Image:
    """가장자리와 연결된 흰 배경만 flood fill로 투명화한다."""
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    queue = deque()
    seen = set()
    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen:
            continue
        seen.add((x, y))
        r, g, b, _ = pixels[x, y]
        if not (r > 242 and g > 242 and b > 242):
            continue
        pixels[x, y] = (255, 255, 255, 0)
        if x: queue.append((x - 1, y))
        if x + 1 < width: queue.append((x + 1, y))
        if y: queue.append((x, y - 1))
        if y + 1 < height: queue.append((x, y + 1))
    for y in range(height):
        gray_count = sum(1 for x in range(width) if pixels[x, y][3] and max(pixels[x, y][:3]) - min(pixels[x, y][:3]) < 12)
        if gray_count > width * 0.65:
            for yy in range(max(0, y - 1), min(height, y + 2)):
                for x in range(width):
                    r, g, b, a = pixels[x, yy]
                    if a and max(r, g, b) - min(r, g, b) < 15 and min(r, g, b) > 185:
                        pixels[x, yy] = (255, 255, 255, 0)
    return image

def isolate_subject(image: Image.Image) -> Image.Image:
    """셀 안에서 가장 큰 캐릭터 본체와 인접 디테일만 남긴다."""
    pixels = image.load()
    width, height = image.size
    seen = set()
    components = []
    for start_y in range(height):
        for start_x in range(width):
            if (start_x, start_y) in seen or pixels[start_x, start_y][3] == 0:
                continue
            queue = deque([(start_x, start_y)])
            seen.add((start_x, start_y))
            points = []
            while queue:
                x, y = queue.popleft()
                points.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen and pixels[nx, ny][3]:
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            components.append(points)
    if not components:
        return image
    main = max(components, key=len)
    xs, ys = [p[0] for p in main], [p[1] for p in main]
    keep = (max(0, min(xs) - 8), max(0, min(ys) - 8), min(width - 1, max(xs) + 8), min(height - 1, max(ys) + 8))
    for component in components:
        if component is main:
            continue
        cx0, cy0 = min(p[0] for p in component), min(p[1] for p in component)
        cx1, cy1 = max(p[0] for p in component), max(p[1] for p in component)
        contained = cx0 >= keep[0] and cx1 <= keep[2] and cy0 >= keep[1] and cy1 <= keep[3]
        if contained and len(component) <= max(900, len(main) * 0.35):
            continue
        for x, y in component:
            pixels[x, y] = (255, 255, 255, 0)
    return image

def fit_canvas(image: Image.Image, scale: float) -> Image.Image:
    box = image.getchannel("A").getbbox()
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    if not box:
        return canvas
    content = image.crop(box)
    size = (max(1, round(content.width * scale)), max(1, round(content.height * scale)))
    content = content.resize(size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(content, ((256 - size[0]) // 2, (256 - size[1]) // 2))
    return canvas

def extract_sheet(source_path: Path, start_level: int, row_bounds: list[int], strip_header: bool = False) -> int:
    source = Image.open(source_path).convert("RGBA")
    cell_width = (CROP_RIGHT - CROP_LEFT) / COLS
    for row in range(len(row_bounds) - 1):
        prepared = []
        for col, state in enumerate(STATES):
            box = (round(CROP_LEFT + col * cell_width), row_bounds[row], round(CROP_LEFT + (col + 1) * cell_width), row_bounds[row + 1])
            cleaned = clear_edge_white(source.crop(box))
            if row == 0 and strip_header:
                pixels = cleaned.load()
                for y in range(min(18, cleaned.height)):
                    for x in range(cleaned.width):
                        r, g, b, a = pixels[x, y]
                        if a and max(r, g, b) - min(r, g, b) < 12:
                            pixels[x, y] = (255, 255, 255, 0)
            prepared.append((state, isolate_subject(cleaned)))
        bounds = [image.getchannel("A").getbbox() for _, image in prepared]
        sizes = [(box[2] - box[0], box[3] - box[1]) for box in bounds if box]
        max_width = max((w for w, _ in sizes), default=1)
        max_height = max((h for _, h in sizes), default=1)
        common_scale = min(216 / max_width, 216 / max_height, 1.7)
        folder = OUTPUT / f"level{start_level + row}"
        folder.mkdir(parents=True, exist_ok=True)
        for state, image in prepared:
            fit_canvas(image, common_scale).save(folder / f"{state}.png", optimize=True)
    return (len(row_bounds) - 1) * COLS

def main() -> None:
    first_bounds = [round(25 + i * (1122 - 25) / 8) for i in range(9)]
    total = extract_sheet(SOURCE_1_8, 1, first_bounds, strip_header=True)
    total += extract_sheet(SOURCE_9_12, 9, [145, 355, 580, 807, 1085])
    print(f"완료: {total}개 스프라이트를 {OUTPUT}에 저장했습니다.")

if __name__ == "__main__":
    main()
