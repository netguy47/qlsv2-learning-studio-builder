# Quick Start: PowerPoint Export 🚀

**Get engaging presentations in 3 minutes!**

---

## Step 1: See What's Possible (30 seconds)

**Open the example file I created:**

```
presentation_Military_Operation_Analysis.pptx
```

**Location:** `D:\QLSV2-Learning-Studio-Builder\`

**What you'll see:**
- Slide 1: Title slide
- Slide 2: **"3 HOURS"** in massive text (Hero Stat)
- Slide 3: Timeline with arrows (Journey)
- Slide 4: Question → Answer layout
- Slide 5: Stats in card format
- Slide 6: Before/After comparison
- Slide 7: Enhanced bullets with numbers

**This is what YOUR content will look like!**

---

## Step 2: Restart Servers (30 seconds)

```bash
stop.bat
start.bat
```

---

## Step 3: Generate Your PowerPoint (2 minutes)

### Option A: Via Python Script

**Create test file `my_presentation.py`:**

```python
from clients.powerpoint_generator import create_presentation_from_slides

# Your slides
slides = [
    {
        'title': 'Your Big Number',
        'bullets': ['Context for the number', 'Why it matters'],
        'type': 'hero_stat'
    },
    {
        'title': 'Your Process',
        'bullets': ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
        'type': 'journey'
    },
    {
        'title': 'Your Key Points',
        'bullets': [
            'Important point one',
            'Important point two',
            'Important point three'
        ]
        # Auto-detects best layout
    }
]

# Generate
filename = create_presentation_from_slides(slides, title="My Presentation")
print(f"Created: {filename}")
```

**Run it:**
```bash
python my_presentation.py
```

**Done!** Open the .pptx file.

---

### Option B: Via API (for integration)

```python
import requests

response = requests.post(
    'http://localhost:5000/slides/powerpoint',
    json={
        'baseline': {
            'content': '''
Your content here. Make it at least 500 characters.
The system will automatically detect the best layouts
for your content. Numbers become hero stats or stat cards.
Sequences become journeys. Comparisons become before/after.
Questions become Q&A slides. Everything else gets
enhanced bullets with professional numbering.
''' * 3,  # Repeat to get 500+ chars
            'source_type': 'text',
            'source_ref': 'manual',
            'status': 'ok'
        },
        'slide_count': 6
    }
)

data = response.json()
filename = data['filename']

# Download
file_response = requests.get(f'http://localhost:5000/powerpoint/{filename}')
with open('my_presentation.pptx', 'wb') as f:
    f.write(file_response.content)

print(f"Downloaded: my_presentation.pptx")
```

---

## Step 4: Present! 🎉

Open your .pptx file in:
- Microsoft PowerPoint
- Google Slides
- Apple Keynote
- LibreOffice Impress

**Ready to present immediately!**

---

## What Layouts You'll Get

**System auto-detects based on your content:**

### If you write: `"3 hours from start to finish"`
→ **Hero Stat layout** - Big "3" dominates slide

### If you write: `"Step 1, Step 2, Step 3"`
→ **Journey layout** - Timeline with arrows

### If you write: `"How long did it take?"`
→ **Q&A layout** - Question → highlighted answer

### If you write: `"Before: slow, After: fast"`
→ **Comparison layout** - Two-column before/after

### If you write: `"50% success, 100 users, 3 metrics"`
→ **Stats layout** - Cards with numbers

### Everything else:
→ **Enhanced bullets** - Numbered circles

---

## Customization

**After generating, you can:**

1. **Edit text** in PowerPoint
2. **Change colors** to match your brand
3. **Add animations** (PowerPoint: Animations tab)
4. **Add images** (Insert → Pictures)
5. **Rearrange slides** (drag and drop)
6. **Add speaker notes** (Notes pane)

**Fully editable - not locked!**

---

## Tips for Best Results

### For Hero Stats:
```python
'title': '3 Hours',  # Put number in title
'bullets': ['From start to finish', 'Fastest on record']
```

### For Journeys:
```python
'bullets': [
    '00:00 - Phase 1',
    '01:00 - Phase 2',
    '02:00 - Phase 3'
]
```

### For Q&A:
```python
'title': 'How did they succeed?',  # Include question mark
'bullets': ['100% success rate', 'Supporting detail']
```

### For Comparisons:
```python
'title': 'Before vs After',
'bullets': [
    'Before: slow',
    'Before: manual',
    'After: fast',    # System splits at middle
    'After: automated'
]
```

---

## Troubleshooting

**Problem: File not generating**
- Check content is 500+ characters
- Restart servers
- Check Python console for errors

**Problem: Can't download**
- Check file exists in `storage/exports/powerpoint/`
- Verify servers are running
- Try accessing directly at that path

**Problem: Slides look plain**
- Content might not trigger special layouts
- Add numbers for stats
- Use sequences for journeys
- Include "vs" or "before/after" for comparisons

---

## Examples with Your Venezuela Content

### Slide 1 (auto-detected as Hero Stat):
```
Title: "3 Hours"
Bullets: [
    "From planning to completion",
    "Fastest extraction in modern military history"
]
```

### Slide 2 (auto-detected as Journey):
```
Title: "Operation Timeline"
Bullets: [
    "00:00 Initiation",
    "01:30 Electronic warfare",
    "02:45 Ground operation",
    "03:00 Mission complete"
]
```

### Slide 3 (auto-detected as Stats):
```
Title: "Key Metrics"
Bullets: [
    "3 hours total duration",
    "100% success rate",
    "0 casualties"
]
```

---

## That's It!

**3 simple steps:**
1. ✅ See example (open .pptx file)
2. ✅ Restart servers
3. ✅ Generate yours (Python or API)

**Result:** Professional, engaging presentations that grip attention and educate!

---

**Questions?** Check `POWERPOINT_EXPORT_COMPLETE.md` for full details.
