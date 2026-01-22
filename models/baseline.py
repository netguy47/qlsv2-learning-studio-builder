from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class Provenance(BaseModel):
    source_type: str            # url | youtube | manual | pdf | search
    source_url: Optional[str]
    retrieved_at: datetime
    notes: Optional[str] = None


class BaselineNote(BaseModel):
    id: str
    baseline_root_id: str
    version: int
    parent_version_id: Optional[str]

    title: str
    content: str

    provenance: List[Provenance]   # ← NEW (list for multi-source)

    created_at: datetime
