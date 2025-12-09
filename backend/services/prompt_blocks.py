import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class PromptBlock(BaseModel):
    """
    Represents a modular section of the prompt.
    """
    id: str
    title: str
    description: str  # User-facing description for configuration
    system_instruction: str  # The actual prompt text
    json_schema_part: Dict[str, Any]  # The properties to add to the JSON schema
    required_keys: List[str] = [] # Keys that are required in the schema

    def get_instruction(self) -> str:
        return self.system_instruction

class GeneralCommentsBlock(PromptBlock):
    id: str = "general_comments"
    title: str = "General Comments"
    description: str = "Overall tone, attitude, structure, and platform details."
    system_instruction: str = """
  "generalComments": {
    "howInterview": "Explain the overall tone and nature of the conversation",
    "attitude": "Describe the demeanor and style of the interviewer",
    "structure": "Detail segments and approximate duration using transcript timestamps",
    "platform": "Identify the meeting tool and exact coding environment/platform"
  },"""
    json_schema_part: Dict[str, Any] = {
        "generalComments": {
            "type": "object",
            "properties": {
                "howInterview": {"type": "string"},
                "attitude": {"type": "string"},
                "structure": {"type": "string"},
                "platform": {"type": "string"}
            },
            "required": ["howInterview", "attitude", "structure", "platform"]
        }
    }
    required_keys: List[str] = ["generalComments"]

class KeyPointsBlock(PromptBlock):
    id: str = "key_points"
    title: str = "Key Technical Points"
    description: str = "3-5 key technical points emphasized by the interviewer."
    system_instruction: str = """
  "keyPoints": [
    {
      "title": "Dynamically Generated Key Point 1",
      "content": "Summary and explanation of the point"
    },
    {
      "title": "Dynamically Generated Key Point 2",
      "content": "Summary and explanation of the point"
    }
  ],"""
    json_schema_part: Dict[str, Any] = {
        "keyPoints": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "content": {"type": "string"}
                },
                "required": ["title", "content"]
            }
        }
    }
    required_keys: List[str] = ["keyPoints"]

class CodingChallengeBlock(PromptBlock):
    id: str = "coding_challenge"
    title: str = "Coding Challenge"
    description: str = "Details about the coding task, follow-ups, and required knowledge."
    system_instruction: str = """
  "codingChallenge": {
    "coreExercise": "Briefly describe the main coding task",
    "followUp": "Identify the most challenging extension or abstraction",
    "knowledge": "Programming Language: X, Framework/Library: Y, Core Concepts: Z. INFER technologies based on context."
  },"""
    json_schema_part: Dict[str, Any] = {
        "codingChallenge": {
            "type": "object",
            "properties": {
                "coreExercise": {"type": "string"},
                "followUp": {"type": "string"},
                "knowledge": {"type": "string"}
            },
            "required": ["coreExercise", "followUp", "knowledge"]
        }
    }
    required_keys: List[str] = ["codingChallenge"]

class TechnologiesBlock(PromptBlock):
    id: str = "technologies"
    title: str = "Technologies"
    description: str = "List of technologies mentioned with timestamps."
    system_instruction: str = """
  "technologies": [
    {
      "name": "TypeScript",
      "timestamps": "17:33-25:45"
    },
    {
      "name": "React",
      "timestamps": "09:32-15:20"
    }
  ],"""
    json_schema_part: Dict[str, Any] = {
        "technologies": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "timestamps": {"type": "string"}
                },
                "required": ["name", "timestamps"]
            }
        }
    }
    required_keys: List[str] = ["technologies"]

class QATopicsBlock(PromptBlock):
    id: str = "qa_topics"
    title: str = "Q&A Topics"
    description: str = "Non-technical and situational Q&A topics."
    system_instruction: str = """
  "qaTopics": [
    {
      "title": "Dynamically Generated Q&A Topic 1",
      "content": "Summary and details"
    },
    {
      "title": "Dynamically Generated Q&A Topic 2",
      "content": "Summary and details"
    }
  ],"""
    json_schema_part: Dict[str, Any] = {
        "qaTopics": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "content": {"type": "string"}
                },
                "required": ["title", "content"]
            }
        }
    }
    required_keys: List[str] = ["qaTopics"]

class StatisticsBlock(PromptBlock):
    id: str = "statistics"
    title: str = "Statistics"
    description: str = "Quantitative analysis of the interview."
    system_instruction: str = """
  "statistics": {
    "duration": "74:13",
    "technicalTime": "60:00 (81%)",
    "qaTime": "10:00 (13%)",
    "technicalQuestions": 2,
    "followUpQuestions": 5,
    "technologiesCount": 8,
    "complexity": "Intermediate",
    "pace": "Moderate",
    "engagement": 8,
    "communicationScore": 85,
    "communicationScoreExplanation": "Candidate was articulate but occasionally rambled.",
    "technicalDepthScore": 78,
    "technicalDepthScoreExplanation": "Strong knowledge of React internals but struggled with complex SQL queries.",
    "engagementScore": 80,
    "engagementScoreExplanation": "Active listener, asked insightful questions about the team structure."
  }"""
    json_schema_part: Dict[str, Any] = {
        "statistics": {
            "type": "object",
            "properties": {
                "duration": {"type": "string"},
                "technicalTime": {"type": "string"},
                "qaTime": {"type": "string"},
                "technicalQuestions": {"type": "integer"},
                "followUpQuestions": {"type": "integer"},
                "technologiesCount": {"type": "integer"},
                "complexity": {"type": "string"},
                "pace": {"type": "string"},
                "engagement": {"type": "integer"},
                "communicationScore": {"type": "integer"},
                "communicationScoreExplanation": {"type": "string"},
                "technicalDepthScore": {"type": "integer"},
                "technicalDepthScoreExplanation": {"type": "string"},
                "engagementScore": {"type": "integer"},
                "engagementScoreExplanation": {"type": "string"}
            },
            "required": [
                "duration", "technicalTime", "qaTime", "technicalQuestions", 
                "followUpQuestions", "technologiesCount", "complexity", "pace", 
                "engagement", "communicationScore", "communicationScoreExplanation",
                "technicalDepthScore", "technicalDepthScoreExplanation", 
                "engagementScore", "engagementScoreExplanation"
            ]
        }
    }
    required_keys: List[str] = ["statistics"]


class ExecutiveSummaryBlock(PromptBlock):
    id: str = "executive_summary"
    title: str = "Executive Summary"
    description: str = "Concise high-level overview for hiring managers."
    system_instruction: str = """
  "executiveSummary": "2-3 sentences summarizing the candidate's overall suitability, key strengths, and potential fit.",
    """
    json_schema_part: Dict[str, Any] = {
        "executiveSummary": {
            "type": "string"
        }
    }
    required_keys: List[str] = ["executiveSummary"]

class StrengthsWeaknessesBlock(PromptBlock):
    id: str = "strengths_weaknesses"
    title: str = "Strengths & Growth Areas"
    description: str = "Balanced view of top qualities and areas for improvement."
    system_instruction: str = """
  "strengthsWeaknesses": {
    "strengths": ["Strength 1", "Strength 2", "Strength 3"],
    "weaknesses": ["Growth Area 1", "Growth Area 2", "Growth Area 3"]
  },"""
    json_schema_part: Dict[str, Any] = {
        "strengthsWeaknesses": {
            "type": "object",
            "properties": {
                "strengths": {"type": "array", "items": {"type": "string"}},
                "weaknesses": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["strengths", "weaknesses"]
        }
    }
    required_keys: List[str] = ["strengthsWeaknesses"]

class ThinkingProcessBlock(PromptBlock):
    id: str = "thinking_process"
    title: str = "Thinking Process"
    description: str = "Analysis of problem-solving approach and logic."
    system_instruction: str = """
  "thinkingProcess": {
    "methodology": "How they approach problems (e.g., STAR, First Principles)",
    "edgeCaseHandling": "Score 1-10 on their ability to identify edge cases",
    "edgeCaseExplanation": "Brief explanation of edge case scoring",
    "structureScore": "Score 1-10 on the logical flow of their answers",
    "structureExplanation": "Brief explanation of structure scoring"
  },"""
    json_schema_part: Dict[str, Any] = {
        "thinkingProcess": {
            "type": "object",
            "properties": {
                "methodology": {"type": "string"},
                "edgeCaseHandling": {"type": "integer"},
                "edgeCaseExplanation": {"type": "string"},
                "structureScore": {"type": "integer"},
                "structureExplanation": {"type": "string"}
            },
            "required": ["methodology", "edgeCaseHandling", "edgeCaseExplanation", "structureScore", "structureExplanation"]
        }
    }
    required_keys: List[str] = ["thinkingProcess"]


# Registry of all available blocks
AVAILABLE_BLOCKS = {
    block.id: block for block in [
        ExecutiveSummaryBlock(),
        GeneralCommentsBlock(),
        StrengthsWeaknessesBlock(),
        KeyPointsBlock(),
        CodingChallengeBlock(),
        TechnologiesBlock(),
        ThinkingProcessBlock(),
        QATopicsBlock(),
        StatisticsBlock()
    ]
}

DEFAULT_BLOCK_ORDER = [
    "executive_summary",
    "general_comments",
    "strengths_weaknesses",
    "key_points",
    "coding_challenge",
    "technologies",
    "thinking_process",
    "qa_topics",
    "statistics"
]
