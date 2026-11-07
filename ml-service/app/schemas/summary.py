from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class SummaryRequest(BaseModel):
    metrics: Dict[str, Any] = Field(..., description="Agregat metrik analitik numerik")
    context: str = Field(default="Laporan Eksekutif SuaraLens PENS", description="Konteks pelaporan")


class GroundingInfo(BaseModel):
    numbers_in_summary: List[str]
    grounding_note: str


class SummaryData(BaseModel):
    summary: str
    grounding: GroundingInfo
    model_used: str
    is_fallback: bool = False


class SummaryResponse(BaseModel):
    status: bool = True
    data: Optional[SummaryData] = None
    message: Optional[str] = None

