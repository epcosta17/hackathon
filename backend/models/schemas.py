"""Pydantic models for API requests and responses."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


# --- Core Data Models ---

class Word(BaseModel):
    """Individual word with confidence score."""
    text: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Word confidence (0-1)")


class TranscriptBlock(BaseModel):
    """Data model for a single timestamped block of transcribed text."""
    id: str
    timestamp: float = Field(..., description="Start time in seconds.")
    duration: float
    text: str
    words: List[Word] = Field(default_factory=list, description="Words with confidence scores")
    speaker: Optional[str] = Field(default=None, description="Speaker label from diarization")


class Technology(BaseModel):
    """Technology with optional timestamp."""
    name: str
    timestamps: Optional[str] = None


class KeyPoint(BaseModel):
    """Key technical point."""
    title: str
    content: str


class QATopic(BaseModel):
    """Q&A topic."""
    title: str
    content: str


class GeneralComments(BaseModel):
    """General comments about the interview."""
    howInterview: str
    attitude: str
    structure: str
    platform: str


class CodingChallenge(BaseModel):
    """Coding challenge details."""
    coreExercise: str
    followUp: str
    knowledge: str


class Statistics(BaseModel):
    """Interview statistics."""
    duration: str
    technicalTime: str
    qaTime: str
    technicalQuestions: int
    followUpQuestions: int
    technologiesCount: int
    complexity: str
    pace: str
    engagement: int
    communicationScore: int
    communicationScoreExplanation: str = Field(..., description="Brief explanation of the communication score")
    technicalDepthScore: int
    technicalDepthScoreExplanation: str = Field(..., description="Brief explanation of the technical depth score")
    engagementScore: int
    engagementScoreExplanation: str = Field(..., description="Brief explanation of the engagement score")


class AnalysisData(BaseModel):
    """Data model for the analysis report.
    All fields are optional because the user can disable specific blocks.
    """
    generalComments: Optional[Dict[str, str]] = None
    executiveSummary: Optional[str] = None
    strengthsWeaknesses: Optional[Dict[str, List[str]]] = None
    thinkingProcess: Optional[Dict[str, Any]] = None
    keyPoints: Optional[List[Dict[str, str]]] = None
    codingChallenge: Optional[Dict[str, str]] = None
    technologies: Optional[List[Dict[str, str]]] = None
    qaTopics: Optional[List[Dict[str, str]]] = None
    statistics: Optional[Dict[str, Any]] = None
    docx_path: Optional[str] = None

    model_config = ConfigDict(extra='ignore')  # Changed to 'ignore' to allow frontend timestamp field


# --- Request Models ---

class AnalyzeRequest(BaseModel):
    """Request model for analysis endpoint."""
    transcript_blocks: List[TranscriptBlock]
    is_reanalysis: bool = False
    prompt_config: Optional[List[str]] = None
    analysis_mode: Optional[str] = "fast" # 'deep' or 'fast'


class GenerateReportRequest(BaseModel):
    """Request to generate DOCX from existing analysis."""
    analysis_data: Dict
    transcript_blocks: List[Dict]


class DownloadRequest(BaseModel):
    """Request model for download endpoint."""
    docx_path: str


class SaveInterviewRequest(BaseModel):
    """Request model for saving interview."""
    title: str
    transcript_text: str
    transcript_words: List[Dict]
    analysis_data: Dict


class UpdateInterviewRequest(BaseModel):
    """Request model for updating interview."""
    interview_id: int
    title: Optional[str] = None
    transcript_text: Optional[str] = None
    transcript_words: Optional[List[Dict]] = None
    analysis_data: Optional[Dict] = None


class NoteCreate(BaseModel):
    """Request to create a note."""
    timestamp: float
    content: str
    is_bookmark: bool = False


class NoteUpdate(BaseModel):
    """Request to update a note."""
    content: Optional[str] = None
    is_bookmark: Optional[bool] = None

