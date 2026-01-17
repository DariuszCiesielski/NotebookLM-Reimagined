import google.generativeai as genai
from typing import Optional, List, Dict, Any
import wave
import io
from app.config import get_settings

# Try to import new SDK for TTS, fallback gracefully
try:
    from google import genai as genai_new
    from google.genai import types as genai_types
    NEW_SDK_AVAILABLE = True
except ImportError:
    NEW_SDK_AVAILABLE = False
    genai_new = None
    genai_types = None

settings = get_settings()
genai.configure(api_key=settings.google_api_key)

# Initialize new genai client for TTS (if available)
genai_client = None
if NEW_SDK_AVAILABLE:
    genai_client = genai_new.Client(api_key=settings.google_api_key)


# Model pricing (per 1M tokens)
MODEL_PRICING = {
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    "gemini-2.0-flash-lite": {"input": 0.075, "output": 0.30},
    "gemini-2.5-pro": {"input": 1.25, "output": 10.0},
    "gemini-2.5-flash": {"input": 0.15, "output": 0.60},
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD for a given model and token counts."""
    pricing = MODEL_PRICING.get(model, MODEL_PRICING["gemini-2.0-flash"])
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


class GeminiService:
    def __init__(self):
        self.models = {}

    def get_model(self, model_name: str = "gemini-2.0-flash"):
        """Get or create a Gemini model instance."""
        if model_name not in self.models:
            self.models[model_name] = genai.GenerativeModel(model_name)
        return self.models[model_name]

    async def generate_content(
        self,
        prompt: str,
        model_name: str = "gemini-2.0-flash",
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """Generate content using Gemini."""
        model = self.get_model(model_name)

        generation_config = genai.GenerationConfig(temperature=temperature)

        if system_instruction:
            model = genai.GenerativeModel(
                model_name, system_instruction=system_instruction
            )

        response = model.generate_content(prompt, generation_config=generation_config)

        input_tokens = response.usage_metadata.prompt_token_count
        output_tokens = response.usage_metadata.candidates_token_count
        cost = calculate_cost(model_name, input_tokens, output_tokens)

        return {
            "content": response.text,
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost,
                "model_used": model_name,
            },
        }

    async def generate_with_context(
        self,
        message: str,
        context: str,
        model_name: str = "gemini-2.0-flash",
        source_names: Optional[List[str]] = None,
        persona_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate content with document context for RAG."""
        base_instruction = """You are a helpful research assistant. Answer questions based on the provided sources.
Always cite your sources using [1], [2], etc. notation when referencing specific information.
If the information is not in the sources, say so clearly.
Be concise but thorough."""

        # Prepend persona instructions if provided
        if persona_instructions:
            system_instruction = f"{persona_instructions}\n\n{base_instruction}"
        else:
            system_instruction = base_instruction

        source_context = ""
        if source_names:
            for i, name in enumerate(source_names, 1):
                source_context += f"[{i}] Source: {name}\n"

        prompt = f"""Sources:
{context}

{source_context}

User Question: {message}

Provide a well-cited response:"""

        return await self.generate_content(
            prompt=prompt,
            model_name=model_name,
            system_instruction=system_instruction,
        )

    async def generate_summary(
        self, content: str, model_name: str = "gemini-2.0-flash"
    ) -> Dict[str, Any]:
        """Generate a summary of content."""
        prompt = f"""Analyze this content and provide:
1. A concise summary (2-3 paragraphs)
2. Key topics covered (list of 5-10 topics)
3. 5 suggested questions someone might ask about this content

Content:
{content}

Format your response as JSON:
{{
    "summary": "...",
    "topics": ["topic1", "topic2", ...],
    "suggested_questions": ["question1", "question2", ...]
}}"""

        return await self.generate_content(prompt=prompt, model_name=model_name)

    async def generate_flashcards(
        self,
        content: str,
        count: int = 10,
        model_name: str = "gemini-2.0-flash",
        persona_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate flashcards from content."""
        prompt = f"""Create {count} educational flashcards from this content.
Each flashcard should test understanding of key concepts.

Content:
{content}

Format as JSON array:
[
    {{"question": "...", "answer": "..."}},
    ...
]"""

        return await self.generate_content(
            prompt=prompt,
            model_name=model_name,
            system_instruction=persona_instructions,
        )

    async def generate_quiz(
        self,
        content: str,
        question_count: int = 10,
        model_name: str = "gemini-2.0-flash",
        persona_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate a quiz from content."""
        prompt = f"""Create a {question_count}-question multiple choice quiz from this content.
Each question should have 4 options with one correct answer.

Content:
{content}

Format as JSON array:
[
    {{
        "question": "...",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "correct_index": 0,
        "explanation": "..."
    }},
    ...
]"""

        return await self.generate_content(
            prompt=prompt,
            model_name=model_name,
            system_instruction=persona_instructions,
        )

    async def generate_study_guide(
        self,
        content: str,
        model_name: str = "gemini-2.0-flash",
        persona_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate a comprehensive study guide."""
        prompt = f"""Create a comprehensive study guide from this content.

Content:
{content}

Format as JSON:
{{
    "title": "...",
    "summary": "...",
    "key_concepts": [
        {{"term": "...", "definition": "...", "importance": "..."}}
    ],
    "glossary": [
        {{"term": "...", "definition": "..."}}
    ],
    "review_questions": ["...", "..."]
}}"""

        return await self.generate_content(
            prompt=prompt,
            model_name=model_name,
            system_instruction=persona_instructions,
        )

    async def generate_faq(
        self,
        content: str,
        count: int = 10,
        model_name: str = "gemini-2.0-flash",
        persona_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate FAQ from content."""
        prompt = f"""Generate {count} frequently asked questions and answers about this content.
Focus on common questions a reader might have.

Content:
{content}

Format as JSON array:
[
    {{"question": "...", "answer": "..."}},
    ...
]"""

        return await self.generate_content(
            prompt=prompt,
            model_name=model_name,
            system_instruction=persona_instructions,
        )

    async def generate_audio_script(
        self,
        content: str,
        format_type: str = "deep_dive",
        custom_instructions: Optional[str] = None,
        model_name: str = "gemini-2.5-pro",
    ) -> Dict[str, Any]:
        """Generate a podcast-style script."""
        format_prompts = {
            "deep_dive": "Create an engaging 10-15 minute two-host podcast script exploring this topic in depth. The hosts should have a natural conversation, with one explaining concepts and the other asking clarifying questions.",
            "brief": "Create a concise 2-3 minute single-speaker summary of the key points.",
            "critique": "Create a 5-10 minute two-host analytical discussion examining strengths and weaknesses of the ideas presented.",
            "debate": "Create an 8-15 minute two-host debate script with opposing viewpoints on the topics discussed.",
        }

        format_instruction = format_prompts.get(format_type, format_prompts["deep_dive"])

        extra = ""
        if custom_instructions:
            extra = f"\n\nAdditional instructions: {custom_instructions}"

        prompt = f"""{format_instruction}{extra}

Content to discuss:
{content}

Format the script with clear speaker labels (Host 1:, Host 2:, or Speaker:) for each line of dialogue.
Make it natural, engaging, and educational."""

        return await self.generate_content(prompt=prompt, model_name=model_name)

    async def generate_tts_audio(
        self,
        script: str,
        format_type: str = "deep_dive",
    ) -> Dict[str, Any]:
        """Generate TTS audio from script using Gemini 2.5 Flash TTS."""
        if not NEW_SDK_AVAILABLE or not genai_client:
            raise Exception("TTS not available: google-genai SDK not installed")

        # Parse script to extract speakers
        speakers = self._extract_speakers(script, format_type)

        try:
            if len(speakers) == 1:
                # Single speaker TTS
                response = genai_client.models.generate_content(
                    model="gemini-2.5-flash-preview-tts",
                    contents=script,
                    config=genai_types.GenerateContentConfig(
                        response_modalities=["AUDIO"],
                        speech_config=genai_types.SpeechConfig(
                            voice_config=genai_types.VoiceConfig(
                                prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                                    voice_name='Kore',
                                )
                            )
                        ),
                    )
                )
            else:
                # Multi-speaker TTS
                speaker_configs = []
                voice_names = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede']
                for i, speaker in enumerate(speakers):
                    speaker_configs.append(
                        genai_types.SpeakerVoiceConfig(
                            speaker=speaker,
                            voice_config=genai_types.VoiceConfig(
                                prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                                    voice_name=voice_names[i % len(voice_names)],
                                )
                            )
                        )
                    )

                response = genai_client.models.generate_content(
                    model="gemini-2.5-flash-preview-tts",
                    contents=script,
                    config=genai_types.GenerateContentConfig(
                        response_modalities=["AUDIO"],
                        speech_config=genai_types.SpeechConfig(
                            multi_speaker_voice_config=genai_types.MultiSpeakerVoiceConfig(
                                speaker_voice_configs=speaker_configs
                            )
                        )
                    )
                )

            # Extract audio data
            audio_data = response.candidates[0].content.parts[0].inline_data.data

            # Convert PCM to WAV
            wav_buffer = io.BytesIO()
            with wave.open(wav_buffer, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(24000)  # 24kHz
                wf.writeframes(audio_data)

            wav_buffer.seek(0)
            duration_seconds = len(audio_data) / (24000 * 2)  # samples / (rate * bytes_per_sample)

            return {
                "audio_data": wav_buffer.getvalue(),
                "duration_seconds": duration_seconds,
                "format": "wav",
                "sample_rate": 24000,
            }

        except Exception as e:
            raise Exception(f"TTS generation failed: {str(e)}")

    def _extract_speakers(self, script: str, format_type: str) -> List[str]:
        """Extract speaker names from script."""
        speakers = set()

        # Common patterns for speaker labels
        import re
        # Match patterns like "Alex:", "Host 1:", "Speaker:"
        matches = re.findall(r'^([A-Za-z0-9\s]+):', script, re.MULTILINE)
        for match in matches:
            speaker = match.strip()
            if speaker:
                speakers.add(speaker)

        if not speakers:
            # Default single speaker
            return ["Speaker"]

        return list(speakers)[:5]  # Limit to 5 speakers

    async def generate_video_script(
        self,
        content: str,
        style: str = "explainer",
        model_name: str = "gemini-2.5-pro",
    ) -> Dict[str, Any]:
        """Generate a video script."""
        style_prompts = {
            "documentary": "Create a documentary-style video script with narration and scene descriptions. Include visual cues for cinematic shots.",
            "explainer": "Create an educational explainer video script. Include on-screen text suggestions and visual aids.",
            "presentation": "Create a business presentation video script with clear sections and bullet points for slides.",
        }

        style_instruction = style_prompts.get(style, style_prompts["explainer"])

        prompt = f"""{style_instruction}

Content to cover:
{content}

Format the script with:
- [SCENE X: Description] for scene markers
- [VISUAL: Description] for visual suggestions
- [TEXT ON SCREEN: Content] for text overlays
- Clear narration text

Make it engaging and suitable for a 30-60 second video."""

        return await self.generate_content(prompt=prompt, model_name=model_name)

    async def generate_research_report(
        self,
        query: str,
        mode: str = "fast",
        model_name: str = "gemini-2.5-pro",
    ) -> Dict[str, Any]:
        """Generate a research report."""
        depth_instruction = "comprehensive and detailed" if mode == "deep" else "concise but thorough"

        prompt = f"""Create a {depth_instruction} research report on the following topic:

Topic: {query}

Structure your report with:
1. Executive Summary (2-3 paragraphs)
2. Key Findings (numbered list)
3. Analysis (main body with subsections)
4. Methodology notes
5. Conclusion and recommendations

Use markdown formatting. Be factual and cite sources where applicable.
Note: In production, this would use Deep Research API for real web search and analysis."""

        result = await self.generate_content(prompt=prompt, model_name=model_name)

        # Add mock citations for demo
        result["citations"] = [
            {"title": "Research Source 1", "url": "https://example.com/source1"},
            {"title": "Research Source 2", "url": "https://example.com/source2"},
        ]

        return result

    async def generate_data_table(
        self,
        content: str,
        custom_instructions: Optional[str] = None,
        model_name: str = "gemini-2.0-flash",
        persona_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate a data table from content."""
        extra = ""
        if custom_instructions:
            extra = f"\n\nAdditional instructions: {custom_instructions}"

        prompt = f"""Extract and organize the key data from this content into a structured table.{extra}

Content:
{content}

Format as JSON:
{{
    "title": "...",
    "columns": ["Column 1", "Column 2", ...],
    "rows": [
        ["value1", "value2", ...],
        ...
    ],
    "summary": "Brief description of what this table shows"
}}"""

        return await self.generate_content(
            prompt=prompt,
            model_name=model_name,
            system_instruction=persona_instructions,
        )

    async def generate_report(
        self,
        content: str,
        custom_instructions: Optional[str] = None,
        model_name: str = "gemini-2.0-flash",
        persona_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate a briefing document/report from content."""
        extra = ""
        if custom_instructions:
            extra = f"\n\nAdditional instructions: {custom_instructions}"

        prompt = f"""Create a comprehensive briefing document/report from this content.{extra}

Content:
{content}

Format as JSON:
{{
    "title": "...",
    "executive_summary": "...",
    "key_findings": ["...", "..."],
    "sections": [
        {{"heading": "...", "content": "..."}}
    ],
    "conclusion": "...",
    "recommendations": ["...", "..."]
}}"""

        return await self.generate_content(
            prompt=prompt,
            model_name=model_name,
            system_instruction=persona_instructions,
        )

    async def generate_slide_deck(
        self,
        content: str,
        slide_count: int = 10,
        custom_instructions: Optional[str] = None,
        model_name: str = "gemini-2.0-flash",
        persona_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate a slide deck from content."""
        extra = ""
        if custom_instructions:
            extra = f"\n\nAdditional instructions: {custom_instructions}"

        prompt = f"""Create a {slide_count}-slide presentation from this content.{extra}

Content:
{content}

Format as JSON:
{{
    "title": "...",
    "subtitle": "...",
    "slides": [
        {{
            "title": "...",
            "bullet_points": ["...", "..."],
            "speaker_notes": "..."
        }}
    ]
}}"""

        return await self.generate_content(
            prompt=prompt,
            model_name=model_name,
            system_instruction=persona_instructions,
        )

    async def generate_infographic_plan(
        self,
        content: str,
        style: str = "modern",
        custom_instructions: Optional[str] = None,
        model_name: str = "gemini-2.0-flash",
        persona_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate an infographic content plan."""
        extra = ""
        if custom_instructions:
            extra = f"\n\nAdditional instructions: {custom_instructions}"

        prompt = f"""Create an infographic content plan in a {style} style from this content.{extra}

Content:
{content}

Format as JSON:
{{
    "title": "...",
    "subtitle": "...",
    "sections": [
        {{
            "heading": "...",
            "icon_suggestion": "...",
            "key_stats": ["...", "..."],
            "description": "..."
        }}
    ],
    "color_scheme": ["#hex1", "#hex2", "#hex3"],
    "image_prompt": "Detailed prompt for generating the infographic image"
}}"""

        return await self.generate_content(
            prompt=prompt,
            model_name=model_name,
            system_instruction=persona_instructions,
        )


# Singleton instance
gemini_service = GeminiService()
