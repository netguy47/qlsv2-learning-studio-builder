from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from enum import Enum

class BaselineStatus(str, Enum):
    OK = "ok"
    INSUFFICIENT_CONTENT = "insufficient_content"
    ERROR = "error"

@dataclass(frozen=True)
class Provenance:
    source_type: str            # url | youtube | manual | pdf | search
    source_url: Optional[str]
    retrieved_at: str
    notes: Optional[str] = None

@dataclass(frozen=True)
class Baseline:
    content: str
    source_type: str
    source_ref: str
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    provenance: List[Provenance] = field(default_factory=list)
    status: BaselineStatus = BaselineStatus.OK
    error_message: Optional[str] = None
