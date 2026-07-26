"""추출된 48개 스프라이트를 한 장의 검사표로 만든다."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
STATES = ("idle", "jump", "rise", "fall", "landing", "crouch")
NAMES = ("아기 토끼", "토끼", "점프 토끼", "다람쥐", "여우", "사자", "호랑이", "판다", "도마뱀", "사슴벌레", "장수풍뎅이", "양")
CELL = 180
HEADER = 44
LABEL = 110

canvas = Image.new("RGB", (LABEL + CELL * 6, HEADER + CELL * len(NAMES)), "white")
draw = ImageDraw.Draw(canvas)
for col, state in enumerate(STATES):
    draw.text((LABEL + col * CELL + 8, 14), state, fill="#263746")
for row, name in enumerate(NAMES):
    draw.text((10, HEADER + row * CELL + 76), f"Lv.{row + 1} {name}", fill="#263746")
    for col, state in enumerate(STATES):
        sprite = Image.open(ROOT / "assets" / "sprites" / f"level{row + 1}" / f"{state}.png").convert("RGBA")
        sprite.thumbnail((160, 160), Image.Resampling.LANCZOS)
        x = LABEL + col * CELL + (CELL - sprite.width) // 2
        y = HEADER + row * CELL + (CELL - sprite.height) // 2
        canvas.paste(sprite, (x, y), sprite)
        draw.rectangle((LABEL + col * CELL, HEADER + row * CELL, LABEL + (col + 1) * CELL, HEADER + (row + 1) * CELL), outline="#d9e0e5")

target = ROOT / "sprite-audit.png"
canvas.save(target)
print(target)
