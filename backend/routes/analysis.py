"""Analysis and report generation API routes."""
import time
import asyncio
import io
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from models.schemas import AnalysisData, AnalyzeRequest, GenerateReportRequest, DownloadRequest
from services.docx_service import generate_docx_async, get_cached_docx
from services.analysis_service import generate_analysis_report
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/v1", tags=["analysis"])


@router.post("/analyze", response_model=AnalysisData)
async def analyze_endpoint(
    request: AnalyzeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
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
    
    # ---------------------------------------------------------
    # Credit Check
    # ---------------------------------------------------------
    # First analysis is free (included in transcription cost)
    # Re-analysis costs 0.5 credits
    should_charge = hasattr(request, 'is_reanalysis') and request.is_reanalysis
    
    if should_charge:
        user_credits = current_user.get("credits", 0)
        if user_credits < 0.5:
            raise HTTPException(
                status_code=402, # Payment Required
                detail="Insufficient credits. Analysis costs 0.5 credits."
            )

    # ---------------------------------------------------------
    # Run AI Analysis
    # ---------------------------------------------------------
    analysis_data = generate_analysis_report(full_transcript)
    
    # ---------------------------------------------------------
    # Deduct Credit (Atomic)
    # ---------------------------------------------------------
    if should_charge:
        try:
            from database import get_firestore_db
            from google.cloud import firestore
            
            db = get_firestore_db()
            user_ref = db.collection('users').document(current_user['uid'])
            user_ref.update({"credits": firestore.Increment(-0.5)})
            print(f"💰 [BILLING] Deducted 0.5 credits for user {current_user['uid']}")
        except Exception as e:
            print(f"⚠️ [BILLING] Failed to deduct credit: {e}")
            # Don't fail the request, just log error. 
            # (In production, strict consistency might be preferred)

    # Generate unique cache key
    cache_key = f"docx_{int(time.time())}_{hash(full_transcript)}"
    analysis_data.docx_path = cache_key
    
    # Start DOCX generation in background
    asyncio.create_task(generate_docx_async(analysis_data, full_transcript, cache_key))
    
    return analysis_data


@router.post("/generate-report")
async def generate_report_endpoint(
    request: GenerateReportRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
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
async def download_report_endpoint(
    request: DownloadRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
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

