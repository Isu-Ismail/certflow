import os
from PIL import Image, ImageDraw

def create_mit_logo(filename="mit.png"):
    img = Image.new("RGBA", (200, 200), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    draw.ellipse([10, 10, 190, 190], fill="#800000", outline="#000000", width=4)
    draw.ellipse([25, 25, 175, 175], fill="#FFFFFF", outline="#800000", width=3)
    draw.rectangle([45, 80, 155, 120], fill="#800000", outline="#000000", width=2)
    
    draw.text((100, 50), "MIT", fill="#800000", anchor="mm")
    draw.text((100, 100), "CHENNAI", fill="#FFFFFF", anchor="mm")
    draw.text((100, 145), "ESTD 1949", fill="#800000", anchor="mm")
    
    img.save(filename)
    print(f"Created '{filename}'")

def create_anna_univ_logo(filename="anna.png"):
    img = Image.new("RGBA", (200, 200), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    draw.ellipse([10, 10, 190, 190], fill="#1E3A8A", outline="#000000", width=4)
    draw.ellipse([25, 25, 175, 175], fill="#FACC15", outline="#1E3A8A", width=3)
    draw.ellipse([60, 60, 140, 140], fill="#1E3A8A")
    draw.polygon([(100, 40), (120, 80), (80, 80)], fill="#EAB308")
    
    draw.text((100, 100), "ANNA UNIV", fill="#FFFFFF", anchor="mm")
    draw.text((100, 155), "PROGRESS", fill="#1E3A8A", anchor="mm")
    
    img.save(filename)
    print(f"Created '{filename}'")

def create_gold_bg(filename="gold_bg.png"):
    width, height = 1056, 747
    img = Image.new("RGB", (width, height), (252, 252, 254))
    draw = ImageDraw.Draw(img)
    
    # Subtle Light Diagonal Texture
    for i in range(-height, width + height, 28):
        draw.line([(i, 0), (i + height, height)], fill=(244, 245, 248), width=3)

    # Top-Left Dark Navy Diagonal Corner (Slightly smaller to leave maximum room for header text)
    draw.polygon([(0, 0), (280, 0), (0, 180)], fill="#0B192C")
    draw.line([(0, 150), (230, 0)], fill="#D4AF37", width=5)
    draw.line([(0, 170), (260, 0)], fill="#F1C40F", width=6)

    # Bottom-Right Dark Navy Diagonal Corner (Slightly smaller to leave maximum room for footer signatures)
    draw.polygon([(width, height), (width - 280, height), (width, height - 180)], fill="#0B192C")
    draw.line([(width, height - 150), (width - 230, height)], fill="#D4AF37", width=5)
    draw.line([(width, height - 170), (width - 260, height)], fill="#F1C40F", width=6)

    # Gold Inner Double Border Frame
    draw.rectangle([50, 35, width - 50, height - 35], outline="#D4AF37", width=3)
    draw.rectangle([56, 41, width - 56, height - 41], outline="#F1C40F", width=1)

    img.save(filename)
    print(f"Created '{filename}'")

if __name__ == "__main__":
    create_mit_logo()
    create_anna_univ_logo()
    create_gold_bg()
