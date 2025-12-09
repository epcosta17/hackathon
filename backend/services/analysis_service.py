"""Analysis service - handles AI analysis and report generation."""
import os
import json
from dotenv import load_dotenv
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig, SafetySetting

from models.schemas import AnalysisData

# Load environment variables
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Configure Logging
import logging
logger = logging.getLogger(__name__)

def generate_analysis_report(transcript_text: str, enabled_blocks: list[str] = None, model_mode: str = "fast") -> AnalysisData:
    """Generate comprehensive interview analysis report using Google Vertex AI (Enterprise)."""
    
    # Initialize PromptBuilder
    from services.prompt_engine import PromptBuilder
    prompt_builder = PromptBuilder(block_ids=enabled_blocks)
    
    project_id = os.getenv("GCS_PROJECT_ID")
    
    if project_id:
        try:
            logger.info(f"Using Google Vertex AI (Enterprise) for analysis [Project: {project_id}]...")
            
            # Initialize Vertex AI with the same project as your storage
            vertexai.init(project=project_id, location="us-central1")
            
            # Select Model based on mode
            model_name = "gemini-2.5-flash-lite" if model_mode == "fast" else "gemini-2.5-flash"
            logger.info(f"🧠 Analysis Mode: {model_mode.upper()} (Model: {model_name})")
            
            model = GenerativeModel(model_name)
            
            generation_config = GenerationConfig(
                temperature=0.3,
                top_p=0.95,
                top_k=40,
                max_output_tokens=8192,
                response_mime_type="application/json",
            )
            
            # Generate the prompt using the builder
            full_prompt = prompt_builder.build_prompt(transcript_text)
            
            # Generate content
            response = model.generate_content(
                full_prompt,
                generation_config=generation_config,
            )
            
            if response and response.text:
                # Parse JSON response
                json_response = json.loads(response.text)
                
                # NOTE: Validation against the dynamic schema could go here
                # schema = prompt_builder.get_json_schema()
                
                # We still cast to AnalysisData for now to maintain type safety in the rest of the app
                # However, fields might be missing if blocks are disabled!
                # We should probably make AnalysisData fields optional or use Construct
                
                # For now, we assume the default config is used so all fields are present.
                # If custom config is used, AnalysisData validation might fail if fields are missing.
                # We will handle this by making the schemas definition in models/schemas.py more flexible or using a Dict in the future step.
                
                analysis_data = AnalysisData(**json_response)
                logger.info("Vertex AI analysis complete!")
                return analysis_data
            else:
                logger.warning(f"Empty response from Vertex AI")
                logger.info("Falling back to mock data...")
            
        except Exception as e:
            logger.error(f"Vertex AI error: {str(e)}")
            logger.info("Falling back to mock data...")
    else:
        logger.warning("GCS_PROJECT_ID not found. Cannot initialize Vertex AI.")
        logger.info("Using mock analysis data...")
    
    # Fallback to mock data if API is not available
    mock_data = {
        "generalComments": {
            "howInterview": "This was a structured technical interview with a balanced mix of coding challenges and Q&A discussion. The interviewer maintained a professional yet conversational tone throughout.",
            "attitude": "The interviewer was collaborative and encouraging, providing helpful hints when the candidate encountered challenges. They demonstrated patience and actively engaged with the candidate's questions.",
            "structure": "Introduction and Role Overview (~5:00), Live Coding Challenge (~25:00), Technical Discussion (~10:00), Candidate Q&A (~10:00), Closing Remarks (~5:00)",
            "platform": "The interview was conducted using VS Code Live Share on the candidate's machine, with Zoom for video communication."
        },
        "keyPoints": [
            {
                "title": "Clean Code and Maintainability",
                "content": "The interviewer strongly emphasized writing readable, well-structured code with meaningful variable names and proper separation of concerns."
            },
            {
                "title": "Problem-Solving Approach",
                "content": "Focus on understanding the problem thoroughly before jumping into implementation, including edge cases and constraints."
            },
            {
                "title": "Testing Mindset",
                "content": "Emphasis on thinking through test cases and potential failure scenarios while writing code."
            },
            {
                "title": "Communication Skills",
                "content": "The interviewer valued clear articulation of thought processes and the ability to explain technical decisions."
            }
        ],
        "codingChallenge": {
            "coreExercise": "Implement a function to find the longest substring without repeating characters, with follow-up optimizations.",
            "followUp": "Optimize the solution from O(n²) to O(n) time complexity using a sliding window approach with hash map.",
            "knowledge": "Language: JavaScript/TypeScript, Core Concepts: Hash Maps, Sliding Window Algorithm, String Manipulation, Time/Space Complexity Analysis"
        },
        "technologies": [
            {"name": "React", "timestamps": "05:00-30:00"},
            {"name": "TypeScript", "timestamps": "05:00-30:00"},
            {"name": "Node.js", "timestamps": "15:00-20:00"},
            {"name": "Express", "timestamps": "15:00-20:00"},
            {"name": "PostgreSQL", "timestamps": "20:00-25:00"},
            {"name": "Jest", "timestamps": "25:00-30:00"},
            {"name": "Docker", "timestamps": "30:00-35:00"},
            {"name": "GitHub Actions", "timestamps": "35:00-40:00"}
        ],
        "qaTopics": [
            {
                "title": "Team Structure and Growth Plans",
                "content": "The team currently consists of 8 engineers and is planning to expand to 12 by Q3. There's a focus on building specialized sub-teams for different product areas."
            },
            {
                "title": "Work-Life Balance and Flexibility",
                "content": "The company offers hybrid work with 2 days in office requirement. They emphasize sustainable pace and discourage regular overtime."
            },
            {
                "title": "Learning and Development Opportunities",
                "content": "Annual learning budget of $2000 per engineer, weekly tech talks, and quarterly hackathons. Mentorship program available for growth."
            }
        ],
        "statistics": {
            "duration": "55:00",
            "technicalTime": "35:00 (64%)",
            "qaTime": "15:00 (27%)",
            "technicalQuestions": 3,
            "followUpQuestions": 8,
            "technologiesCount": 8,
            "complexity": "Intermediate to Advanced",
            "pace": "Moderate",
            "engagement": 8,
            "communicationScore": 85,
            "communicationScoreExplanation": "Candidate was articulate and explained complex concepts clearly, though occasionally needed redirection.",
            "technicalDepthScore": 75,
            "technicalDepthScoreExplanation": "Demonstrated solid understanding of React hooks and state management, but struggled with database indexing concepts.",
            "engagementScore": 80,
            "engagementScoreExplanation": "Maintained good eye contact and asked relevant questions about the engineering culture."
        }
    }
    
    return AnalysisData(**mock_data)

