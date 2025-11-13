"""Analysis and report generation API routes."""
import time
import asyncio
import io
from typing import Dict
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from models.schemas import AnalysisData, AnalyzeRequest, GenerateReportRequest, DownloadRequest
from services.docx_service import generate_docx_async, get_cached_docx
from services.analysis_service import generate_analysis_report

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze", response_model=AnalysisData)
async def analyze_endpoint(request: AnalyzeRequest):
    """
    Takes the final, edited transcript with timestamps and speakers, returns AI analysis.
    Also generates DOCX in background for instant download later.
    """
    if not request.transcript_blocks:
        raise HTTPException(status_code=400, detail="Transcript blocks are required for analysis.")
    
    # Convert blocks to formatted text with timestamps
    formatted_transcript = []
    for block in request.transcript_blocks:
        timestamp = f"{int(block.timestamp // 60)}:{int(block.timestamp % 60):02d}"
        formatted_transcript.append(f"[{timestamp}] {block.text}")
    
    full_transcript = "\n".join(formatted_transcript)
    
    # Run AI analysis
    analysis_data = generate_analysis_report(full_transcript)
    
    # Generate unique cache key
    cache_key = f"docx_{int(time.time())}_{hash(full_transcript)}"
    analysis_data.docx_path = cache_key
    
    # Start DOCX generation in background
    asyncio.create_task(generate_docx_async(analysis_data, full_transcript, cache_key))
    
    return analysis_data


@router.post("/generate-report")
async def generate_report_endpoint(request: GenerateReportRequest):
    """Generate DOCX report from existing analysis data without re-analyzing."""
    try:
        # Convert dict to AnalysisData model
        analysis_data = AnalysisData(**request.analysis_data)
        
        # Get full transcript
        full_transcript = ' '.join([block.get('text', '') for block in request.transcript_blocks])
        
        # Generate unique cache key
        cache_key = f"docx_{int(time.time())}_{hash(full_transcript)}"
        
        # Start DOCX generation in background
        asyncio.create_task(generate_docx_async(analysis_data, full_transcript, cache_key))
        
        return {"docx_path": cache_key, "message": "Report generation started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.post("/download-report")
async def download_report_endpoint(request: DownloadRequest):
    """
    Download cached DOCX file. If not in cache, return error message.
    Frontend should regenerate analysis to get a new report.
    """
    cache_key = request.docx_path
    
    # Check if in cache
    docx_data = get_cached_docx(cache_key)
    if not docx_data:
        raise HTTPException(
            status_code=404, 
            detail="Report not found. Please run analysis again to generate a new report."
        )
    
    # Create BytesIO from cached data
    docx_buffer = io.BytesIO(docx_data)
    docx_buffer.seek(0)
    
    # Return as download
    return StreamingResponse(
        docx_buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=interview_analysis_{int(time.time())}.docx"}
    )


@router.get("/ping")
async def ping():
    """Simple endpoint to check API health."""
    return {"message": "pong"}

