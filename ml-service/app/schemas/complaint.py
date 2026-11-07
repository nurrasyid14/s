from typing import Optional, Dict
from pydantic import BaseModel, Field


class ComplaintRequest(BaseModel):
    complaint_id: int = Field(default=0, description="ID komplain (0 jika tiket baru belum di-insert)")
    text: str = Field(..., min_length=1, description="Teks mentah keluhan/masukan/saran")
    submission_type: Optional[str] = Field(default="complaint", description="complaint | feedback | suggestion")


class AnalysisData(BaseModel):
    redacted_text: str
    category: str
    category_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    target_unit: str
    unit_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    unit_reason: Optional[str] = None
    urgency_label: str
    urgency_score: float = Field(default=0.5, ge=0.0, le=1.0)
    urgency_reason: Optional[str] = None
    sentiment: str
    sentiment_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    sentiment_scores: Optional[Dict[str, float]] = None
    submission_type: Optional[str] = None
    requires_review: bool = False
    is_fallback: bool = False
    model_version: str


class ComplaintResponse(BaseModel):
    status: bool = True
    data: Optional[AnalysisData] = None
    message: Optional[str] = None

