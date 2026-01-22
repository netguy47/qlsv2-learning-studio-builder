import os
import json
import base64
from datetime import datetime

BASE_EXPORT_DIR = "storage/exports"

def ensure_dirs():
    for sub in ["reports", "podcasts", "infographics", "slides"]:
        os.makedirs(os.path.join(BASE_EXPORT_DIR, sub), exist_ok=True)

def export_text(content, export_type):
    ensure_dirs()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{export_type}_{timestamp}.txt"
    path = os.path.join(BASE_EXPORT_DIR, export_type, filename)

    footer = "\n\n— Created with QLSV2 Learning Studio"
    with open(path, "w", encoding="utf-8") as f:
        f.write(content + footer)

    return path

def export_json(data, export_type):
    ensure_dirs()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{export_type}_{timestamp}.json"
    path = os.path.join(BASE_EXPORT_DIR, export_type, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return path

def export_image(image_url, export_type):
    ensure_dirs()
    
    # Handle base64 data URLs by saving to file
    if image_url and image_url.startswith('data:image/svg+xml;base64,'):
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{export_type}_{timestamp}.svg"
        path = os.path.join(BASE_EXPORT_DIR, export_type, filename)
        
        # Decode base64 and save to file
        base64_data = image_url.split(',')[1]
        svg_content = base64.b64decode(base64_data).decode('utf-8')
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(svg_content)
        
        # Return file URL relative to server root
        file_url = f"/{path}"
        return {
            "image_url": file_url,
            "attribution": "Created with QLSV2 Learning Studio"
        }
    
    # For external URLs, return as-is
    return {
        "image_url": image_url,
        "attribution": "Created with QLSV2 Learning Studio"
    }
