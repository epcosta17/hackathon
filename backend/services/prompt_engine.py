import json
from typing import List, Dict, Any, Optional
from services.prompt_blocks import PromptBlock, AVAILABLE_BLOCKS, DEFAULT_BLOCK_ORDER

class PromptBuilder:
    def __init__(self, block_ids: Optional[List[str]] = None):
        """
        Initialize with a list of block IDs directly.
        If None, uses DEFAULT_BLOCK_ORDER.
        """
        self.blocks: List[PromptBlock] = []
        
        if block_ids is None:
            print("⚠️ PromptBuilder: No block_ids provided, using DEFAULT.")
            block_ids = DEFAULT_BLOCK_ORDER
        else:
            print(f"✅ PromptBuilder: Building prompt with {len(block_ids)} blocks: {block_ids}")
            
        for block_id in block_ids:
            if block_id in AVAILABLE_BLOCKS:
                self.blocks.append(AVAILABLE_BLOCKS[block_id])
            else:
                print(f"⚠️ Warning: Unknown block_id '{block_id}'")
                pass

    def build_prompt(self, transcript_text: str) -> str:
        """
        Constructs the full text prompt.
        """
        
        base_instruction = """You are a professional Interview Analyst AI. Your task is to analyze the provided interview transcript and produce a comprehensive, structured report in JSON format.

**Primary Goal:** Analyze the conversation to identify the interview environment, technical requirements, key points of emphasis, and all topics discussed.

**CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations - ONLY the raw JSON object.**

**Interview Transcript:**
{transcript}

**REQUIRED JSON OUTPUT STRUCTURE:**

```json
{
"""
        
        # Append block instructions
        block_instructions = []
        for block in self.blocks:
            block_instructions.append(block.get_instruction())
            
        # Join with commas to ensure valid JSON structure in the example
        # NOTE: The block instructions themselves usually start with a key and end with a value.
        # We need to be careful about commas.
        # The current implementation in prompt_blocks.py defines them as chunks like `"key": { ... },` or just `"key": { ... }`
        # Let's clean them up to ensure we join them correctly.
        
        full_json_structure = ",\n".join([b.strip().rstrip(',') for b in block_instructions])
        
        closing_instruction = """
}
```

**IMPORTANT NOTES:**
1. Include ALL technologies mentioned or inferred (languages, frameworks, tools, databases, etc.)
2. Add timestamp ranges (MM:SS-MM:SS) for when each technology was discussed
   - Keep ranges realistic: typically 5-15 minutes per technology
   - Use the FIRST major mention of each technology, not the entire interview duration
   - Example: "TypeScript (17:33-25:45)" not "TypeScript (17:33-70:00)"
3. Engagement Score = Engagement × 10 (capped at 100)
4. Extract 3-5 key technical points that the interviewer emphasized
5. Dynamically generate Q&A topic titles based on actual discussion
6. Calculate all time values from the transcript timestamps

7. **CRITICAL: Statistics must be extracted dynamically:**
   - `"technicalQuestions"`: Count the actual number of distinct technical questions asked.
   - `"followUpQuestions"`: Count the actual probing/follow-up questions.
   - `"technologiesCount"`: Count the unique technologies listed in the `technologies` array.
   - `"engagement"`, `"communicationScore"`, `"technicalDepthScore"`, `"engagementScore"`: Evaluate based on the candidate's actual performance in the transcript (0-100 scale). DO NOT use the example values.

**RESPOND WITH ONLY THE JSON OBJECT - NO OTHER TEXT**
"""

        full_prompt = base_instruction + full_json_structure + closing_instruction
        return full_prompt.replace('{transcript}', transcript_text)

    def get_json_schema(self) -> Dict[str, Any]:
        """
        Constructs the JSON schema for validation.
        """
        properties = {}
        required = []
        
        for block in self.blocks:
            properties.update(block.json_schema_part)
            required.extend(block.required_keys)
            
        schema = {
            "type": "object",
            "properties": properties,
            "required": required
        }
        
        return schema
