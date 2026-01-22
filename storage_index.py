import os
from glob import glob

BASE = "storage/exports"

def list_saved(category: str):
    folder = os.path.join(BASE, category)
    if not os.path.isdir(folder):
        return []
    files = sorted(glob(os.path.join(folder, "*")), reverse=True)
    return files[:50]  # most recent 50
