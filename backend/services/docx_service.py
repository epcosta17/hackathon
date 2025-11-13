"""Service for generating DOCX reports from analysis data."""
import io
from models.schemas import AnalysisData

# Store for DOCX files (in production, use Redis or database)
docx_cache = {}


async def generate_docx_async(analysis_data: AnalysisData, full_transcript: str, cache_key: str):
    """Generate DOCX file asynchronously in background."""
    try:
        from docx import Document
        from docx.shared import Pt, RGBColor
        from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
        
        print(f"📝 Generating DOCX in background for key: {cache_key}")
        
        doc = Document()
        
        # Add title
        title = doc.add_heading('Interview Analysis Report', 0)
        title.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        
        # General Comments
        doc.add_heading('General Comments', 1)
        doc.add_paragraph(f"Interview Overview: {analysis_data.generalComments.howInterview}")
        doc.add_paragraph(f"Interviewer's Attitude: {analysis_data.generalComments.attitude}")
        doc.add_paragraph(f"Structure: {analysis_data.generalComments.structure}")
        doc.add_paragraph(f"Platform: {analysis_data.generalComments.platform}")
        
        # Key Points
        doc.add_heading('Key Technical Emphasis Points', 1)
        for point in analysis_data.keyPoints:
            p = doc.add_paragraph(style='List Bullet')
            p.add_run(f"{point.title}: ").bold = True
            p.add_run(point.content)
        
        # Coding Challenge
        doc.add_heading('Live Coding Challenge Details', 1)
        doc.add_paragraph(f"Core Exercise: {analysis_data.codingChallenge.coreExercise}")
        doc.add_paragraph(f"Critical Follow-up: {analysis_data.codingChallenge.followUp}")
        doc.add_paragraph(f"Required Knowledge: {analysis_data.codingChallenge.knowledge}")
        
        # Technologies
        doc.add_heading('Technologies and Tools Used', 1)
        for tech in analysis_data.technologies:
            tech_text = f"{tech.name}"
            if tech.timestamps:
                tech_text += f" ({tech.timestamps})"
            doc.add_paragraph(tech_text, style='List Bullet')
        
        # Q&A Topics
        doc.add_heading('Non-Technical & Situational Q&A Topics', 1)
        for topic in analysis_data.qaTopics:
            p = doc.add_paragraph(style='List Bullet')
            p.add_run(f"{topic.title}: ").bold = True
            p.add_run(topic.content)
        
        # Statistics
        doc.add_heading('Expert Statistics', 1)
        stats = analysis_data.statistics
        doc.add_paragraph(f"Total Duration: {stats.duration}")
        doc.add_paragraph(f"Technical Time: {stats.technicalTime}")
        doc.add_paragraph(f"Q&A Time: {stats.qaTime}")
        doc.add_paragraph(f"Technical Questions: {stats.technicalQuestions}")
        doc.add_paragraph(f"Follow-up Questions: {stats.followUpQuestions}")
        doc.add_paragraph(f"Technologies Count: {stats.technologiesCount}")
        doc.add_paragraph(f"Complexity: {stats.complexity}")
        doc.add_paragraph(f"Pace: {stats.pace}")
        doc.add_paragraph(f"Engagement Opportunities: {stats.engagement}")
        doc.add_paragraph(f"Communication Score: {stats.communicationScore}/100")
        doc.add_paragraph(f"Technical Depth Score: {stats.technicalDepthScore}/100")
        doc.add_paragraph(f"Engagement Score: {stats.engagementScore}/100")
        
        # Save to BytesIO
        docx_buffer = io.BytesIO()
        doc.save(docx_buffer)
        docx_buffer.seek(0)
        
        # Cache the DOCX
        docx_cache[cache_key] = docx_buffer.getvalue()
        print(f"✅ DOCX generated and cached for key: {cache_key}")
        
    except Exception as e:
        print(f"❌ Error generating DOCX: {str(e)}")


def get_cached_docx(cache_key: str) -> bytes | None:
    """Retrieve a cached DOCX file."""
    return docx_cache.get(cache_key)

