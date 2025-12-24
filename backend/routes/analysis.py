"""Analysis and report generation API routes."""
import time
import asyncio
import io
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from models.schemas import AnalysisData, AnalyzeRequest, GenerateReportRequest, DownloadRequest
from services.docx_service import generate_docx_async, get_cached_docx, generate_docx_bytes
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
    # ---------------------------------------------------------        # Generate Analysis
    analysis_data = await asyncio.to_thread(
        generate_analysis_report, 
        full_transcript, 
        request.prompt_config,
        request.analysis_mode
    ) # ---------------------------------------------------------
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
    request: GenerateReportRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generate and download DOCX report on demand.
    Accepts the full analysis data and returns the file stream.
    """
    try:
        # Convert dict to AnalysisData model if needed
        if isinstance(request.analysis_data, dict):
            analysis_data = AnalysisData(**request.analysis_data)
        else:
            analysis_data = request.analysis_data
            
        print(f"📥 Generating report for download (User: {current_user.get('uid')})")
        
        # Generate DOCX in memory (synchronous op run in thread)
        docx_buffer = await asyncio.to_thread(generate_docx_bytes, analysis_data)
        
        # Return as download
        timestamp = int(time.time())
        filename = f"interview_analysis_{timestamp}.docx"
        
        return StreamingResponse(
            docx_buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        print(f"❌ Download failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/interviews/{interview_id}/report")
async def download_report_by_id(
    interview_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Download DOCX report for a specific interview by ID."""
    from database import get_interview
    
    interview = get_interview(current_user['uid'], interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    analysis_data = interview.get('analysis_data')
    if not analysis_data:
        raise HTTPException(status_code=400, detail="Interview has no analysis data yet")
        
    # generate_docx_bytes handles both dict and model
    docx_buffer = await asyncio.to_thread(generate_docx_bytes, analysis_data)
    
    filename = f"interview_report_{interview_id}.docx"
    return StreamingResponse(
        docx_buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/ping")
async def ping():
    """Simple endpoint to check API health."""
    return {"message": "pong"}

