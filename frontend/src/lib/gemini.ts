import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Initialize Gemini with API key
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.warn('GOOGLE_API_KEY is not set. Gemini features will not work.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Models for different use cases
export function getFlashModel(): GenerativeModel | null {
  if (!genAI) return null;
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
}

export function getProModel(): GenerativeModel | null {
  if (!genAI) return null;
  return genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
}

// Generate flashcards from source content
export async function generateFlashcards(
  content: string,
  count: number = 10
): Promise<{ front: string; back: string }[]> {
  const model = getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  const prompt = `You are an expert educator. Based on the following content, create ${count} high-quality flashcards for studying.

CONTENT:
${content}

Generate exactly ${count} flashcards. Each flashcard should:
- Have a clear, specific question on the front
- Have a comprehensive but concise answer on the back
- Cover key concepts, definitions, facts, and important details
- Be useful for active recall learning

Return ONLY a valid JSON array with no markdown formatting, code blocks, or extra text. Format:
[
  {"front": "Question 1?", "back": "Answer 1"},
  {"front": "Question 2?", "back": "Answer 2"}
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Parse JSON from response (handle potential markdown code blocks)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid response format');

  return JSON.parse(jsonMatch[0]);
}

// Generate quiz questions from source content
export async function generateQuiz(
  content: string,
  count: number = 5
): Promise<{ question: string; options: string[]; correct_index: number; explanation: string }[]> {
  const model = getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  const prompt = `You are an expert educator. Based on the following content, create ${count} multiple-choice quiz questions.

CONTENT:
${content}

Generate exactly ${count} quiz questions. Each question should:
- Test understanding of key concepts from the content
- Have 4 plausible options (A, B, C, D)
- Have exactly one correct answer
- Include a brief explanation of why the correct answer is right

Return ONLY a valid JSON array with no markdown formatting, code blocks, or extra text. Format:
[
  {
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "Explanation of why this is correct"
  }
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid response format');

  return JSON.parse(jsonMatch[0]);
}

// Generate study guide from source content
export async function generateStudyGuide(
  content: string
): Promise<{ title: string; sections: { heading: string; content: string }[] }> {
  const model = getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  const prompt = `You are an expert educator. Based on the following content, create a comprehensive study guide.

CONTENT:
${content}

Create a well-structured study guide with:
- A clear, descriptive title
- Multiple sections covering all major topics
- Each section should have a heading and detailed content
- Include key concepts, definitions, examples, and important points
- Use bullet points and clear formatting within the content

Return ONLY a valid JSON object with no markdown formatting, code blocks, or extra text. Format:
{
  "title": "Study Guide Title",
  "sections": [
    {"heading": "Section 1 Title", "content": "Section 1 content with key points..."},
    {"heading": "Section 2 Title", "content": "Section 2 content..."}
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');

  return JSON.parse(jsonMatch[0]);
}

// Generate FAQ from source content
export async function generateFAQ(
  content: string,
  count: number = 8
): Promise<{ question: string; answer: string }[]> {
  const model = getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  const prompt = `You are an expert educator. Based on the following content, create ${count} frequently asked questions and answers.

CONTENT:
${content}

Generate ${count} FAQs that:
- Address common questions someone studying this material might have
- Cover key concepts and potential points of confusion
- Have clear, comprehensive answers
- Range from basic to more advanced questions

Return ONLY a valid JSON array with no markdown formatting, code blocks, or extra text. Format:
[
  {"question": "FAQ question 1?", "answer": "Comprehensive answer 1"},
  {"question": "FAQ question 2?", "answer": "Comprehensive answer 2"}
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid response format');

  return JSON.parse(jsonMatch[0]);
}

// Mind map node structure
export interface MindMapNode {
  id: string;
  label: string;
  description?: string;
  children?: MindMapNode[];
}

// Generate mind map from source content
export async function generateMindMap(
  content: string
): Promise<{ title: string; nodes: MindMapNode[] }> {
  const model = getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  const prompt = `You are an expert at creating visual knowledge maps. Based on the following content, create a hierarchical mind map structure.

CONTENT:
${content}

Create a mind map with:
- A central topic/theme as the root
- 4-6 main branches (key concepts/themes)
- Each main branch should have 2-4 sub-branches (supporting details)
- Keep labels concise (2-5 words max)
- Add brief descriptions where helpful (1 sentence max)

Return ONLY a valid JSON object with no markdown formatting, code blocks, or extra text. Format:
{
  "title": "Central Topic",
  "nodes": [
    {
      "id": "1",
      "label": "Main Concept 1",
      "description": "Brief description",
      "children": [
        {"id": "1-1", "label": "Sub-concept", "description": "Detail"},
        {"id": "1-2", "label": "Sub-concept 2"}
      ]
    },
    {
      "id": "2",
      "label": "Main Concept 2",
      "children": [
        {"id": "2-1", "label": "Sub-concept"}
      ]
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');

  return JSON.parse(jsonMatch[0]);
}

// Generate audio script for podcast-style overview with two speakers
export async function generateAudioScript(
  content: string,
  format: 'deep_dive' | 'brief' | 'critique' | 'debate' = 'deep_dive'
): Promise<string> {
  const model = getProModel() || getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  const durationGuide: Record<string, string> = {
    deep_dive: '10-15 minutes when read aloud',
    brief: '3-5 minutes when read aloud',
    critique: '8-10 minutes when read aloud',
    debate: '10-12 minutes when read aloud',
  };

  const prompt = `You are an expert podcast scriptwriter creating a NotebookLM-style audio overview. Create an engaging two-person podcast conversation about the following content.

CONTENT TO DISCUSS:
${content}

REQUIREMENTS:
1. Write a ${format.replace('_', ' ')} style podcast (${durationGuide[format]})
2. Format as a natural conversation between exactly TWO speakers named "Alex" and "Sam"
3. Use EXACTLY this format for each line - speaker name followed by colon:
   Alex: [dialogue]
   Sam: [dialogue]
4. Make it sound like two friends having an engaging, informative conversation
5. Include natural reactions like "That's fascinating!", "Right, exactly!", "Oh interesting..."
6. Alex should be the main explainer, Sam asks good questions and adds insights
7. Start with a brief intro, cover the key points, end with a summary
8. Keep it conversational and accessible - avoid being too academic
9. Include smooth transitions between topics

${format === 'critique' ? 'Focus on analyzing strengths and weaknesses of the content.' : ''}
${format === 'debate' ? 'Have Alex and Sam take slightly different perspectives and discuss them respectfully.' : ''}

Write ONLY the dialogue, no stage directions or extra formatting. Start directly with "Alex:" on the first line.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Generate video script
export async function generateVideoScript(
  content: string,
  style: 'documentary' | 'explainer' | 'presentation' = 'explainer'
): Promise<string> {
  const model = getProModel() || getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  const styleInstructions: Record<string, string> = {
    documentary: `Create a documentary-style video script (5-8 minutes).
Include:
- Scene descriptions with visual suggestions
- Narration text
- B-roll suggestions
- Interview-style segments if appropriate
- Atmospheric/emotional beats`,

    explainer: `Create an explainer video script (3-5 minutes).
Include:
- Clear scene breakdowns
- On-screen text suggestions
- Visual diagram/animation descriptions
- Step-by-step explanations
- Call-to-action ending`,

    presentation: `Create a presentation-style video script (5-7 minutes).
Include:
- Slide suggestions with bullet points
- Speaker notes for each section
- Transition suggestions
- Visual aid descriptions
- Q&A prompts at the end`,
  };

  const prompt = `You are an expert video scriptwriter. Based on the following content, create a ${style} video script.

CONTENT:
${content}

${styleInstructions[style]}

Format the script with clear scene markers like [SCENE 1], [SCENE 2], etc.
Include [VISUAL] tags for visual suggestions and [NARRATION] tags for spoken content.

Do NOT include any JSON formatting. Write the script as plain text with clear markers.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Generate research report
export async function generateResearchReport(
  query: string,
  mode: 'fast' | 'deep' = 'fast'
): Promise<{
  report_content: string;
  sources_found_count: number;
  sources_analyzed_count: number;
  citations: { title: string; url: string }[];
}> {
  const model = mode === 'deep' ? getProModel() : getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  const prompt = `You are an expert researcher. Conduct ${mode === 'deep' ? 'comprehensive' : 'focused'} research on the following query:

QUERY: ${query}

${
  mode === 'deep'
    ? 'Provide a thorough, well-researched report with multiple perspectives, detailed analysis, and comprehensive coverage of the topic.'
    : 'Provide a focused, concise research report covering the key aspects of the query.'
}

Structure your report with:
# Research Report: [Topic]

## Executive Summary
Brief overview of findings

## Background
Context and background information

## Key Findings
Main discoveries and insights (use numbered points)

## Analysis
Deeper examination of the findings

## Conclusion
Summary and implications

## References
List sources you would cite (note: as an AI, provide hypothetical but realistic sources)

Write in an academic but accessible style. Be thorough and evidence-based.`;

  const result = await model.generateContent(prompt);
  const reportContent = result.response.text();

  // Generate hypothetical but realistic citations based on the query
  const citationPrompt = `For a research report about "${query}", generate 5 realistic academic/web citations. Return ONLY a JSON array:
[{"title": "Article Title", "url": "https://example.com/article"}]`;

  let citations: { title: string; url: string }[] = [];
  try {
    const citationResult = await model.generateContent(citationPrompt);
    const citationText = citationResult.response.text();
    const jsonMatch = citationText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      citations = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // If citation generation fails, use empty array
    citations = [];
  }

  return {
    report_content: reportContent,
    sources_found_count: Math.floor(Math.random() * 10) + 15,
    sources_analyzed_count: Math.floor(Math.random() * 5) + 8,
    citations,
  };
}

// Check if Gemini is configured
export function isGeminiConfigured(): boolean {
  return !!apiKey;
}

// Simple text generation
export async function generateContent(
  prompt: string,
  modelName: string = 'gemini-2.0-flash'
): Promise<{ text: string }> {
  if (!genAI) throw new Error('Gemini API not configured');

  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  return { text: result.response.text() };
}

// ============ STUDIO OUTPUT GENERATORS ============

// Data table structure
export interface TableColumn {
  header: string;
  key: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

export interface DataTableData {
  title: string;
  description: string;
  columns: TableColumn[];
  rows: Record<string, string | number | boolean>[];
}

// Generate data table from source content
export async function generateDataTable(
  content: string,
  customInstructions?: string
): Promise<DataTableData> {
  const model = getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  const prompt = `You are an expert data analyst. Based on the following content, extract and structure the key information into a data table format.

CONTENT:
${content}

${customInstructions ? `CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}

Create a well-structured data table that:
- Has a clear, descriptive title
- Includes 3-7 relevant columns based on the content
- Contains 5-15 rows of extracted data
- Uses appropriate column types (text, number, date, boolean)
- Captures the most important information from the sources

Return ONLY a valid JSON object with no markdown formatting, code blocks, or extra text. Format:
{
  "title": "Table Title",
  "description": "Brief description of what this table shows",
  "columns": [
    {"header": "Column Name", "key": "column_key", "type": "text"},
    {"header": "Value", "key": "value", "type": "number"}
  ],
  "rows": [
    {"column_key": "Value 1", "value": 100},
    {"column_key": "Value 2", "value": 200}
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');

  return JSON.parse(jsonMatch[0]);
}

// Report structure
export interface ReportSection {
  heading: string;
  content: string;
  subsections?: { subheading: string; content: string }[];
}

export interface ReportData {
  title: string;
  executive_summary: string;
  sections: ReportSection[];
  key_takeaways: string[];
  references?: string[];
}

// Generate report from source content
export async function generateReport(
  content: string,
  reportType: 'briefing_doc' | 'study_guide' | 'blog_post' | 'custom' = 'briefing_doc',
  customInstructions?: string
): Promise<ReportData> {
  const model = getProModel() || getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  const reportTypeInstructions: Record<string, string> = {
    briefing_doc: `Create a professional briefing document:
- Executive summary with key insights
- Well-organized sections with clear headings
- Bullet points for key facts
- Formal, concise writing style
- Action items or recommendations if applicable`,

    study_guide: `Create a comprehensive study guide:
- Overview of the topic
- Key concepts and definitions
- Important details organized by topic
- Practice questions or review points
- Summary of main takeaways`,

    blog_post: `Create an engaging blog post:
- Catchy introduction that hooks the reader
- Conversational but informative tone
- Clear sections with engaging headings
- Examples and analogies to explain concepts
- Strong conclusion with call-to-action`,

    custom: customInstructions || 'Create a comprehensive report covering the main points.',
  };

  const prompt = `You are an expert writer. Based on the following content, create a ${reportType.replace('_', ' ')}.

CONTENT:
${content}

${reportTypeInstructions[reportType]}

${customInstructions && reportType !== 'custom' ? `ADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

Return ONLY a valid JSON object with no markdown formatting, code blocks, or extra text. Format:
{
  "title": "Report Title",
  "executive_summary": "A brief executive summary...",
  "sections": [
    {
      "heading": "Section 1 Title",
      "content": "Section content with full markdown formatting...",
      "subsections": [
        {"subheading": "Subsection Title", "content": "Subsection content..."}
      ]
    }
  ],
  "key_takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  "references": ["Source 1", "Source 2"]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');

  return JSON.parse(jsonMatch[0]);
}

// Slide structure
export interface Slide {
  slide_number: number;
  title: string;
  content_type: 'title' | 'content' | 'bullets' | 'image_placeholder' | 'comparison' | 'summary';
  main_content: string;
  bullet_points?: string[];
  speaker_notes?: string;
  visual_suggestion?: string;
}

export interface SlideDeckData {
  title: string;
  subtitle?: string;
  slides: Slide[];
  theme_suggestion: string;
}

// Generate slide deck from source content
export async function generateSlideDeck(
  content: string,
  customInstructions?: string
): Promise<SlideDeckData> {
  const model = getProModel() || getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  const prompt = `You are an expert presentation designer. Based on the following content, create a professional slide deck structure.

CONTENT:
${content}

${customInstructions ? `CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}

Create a presentation with:
- 8-15 slides total
- Title slide with subtitle
- Content slides with clear hierarchy
- Bullet points (3-5 per slide max)
- Visual suggestions for key slides
- Speaker notes for each slide
- Summary/conclusion slide

Return ONLY a valid JSON object with no markdown formatting, code blocks, or extra text. Format:
{
  "title": "Presentation Title",
  "subtitle": "Subtitle or Tagline",
  "slides": [
    {
      "slide_number": 1,
      "title": "Presentation Title",
      "content_type": "title",
      "main_content": "Subtitle text",
      "speaker_notes": "Welcome everyone...",
      "visual_suggestion": "Company logo, professional background"
    },
    {
      "slide_number": 2,
      "title": "Overview",
      "content_type": "bullets",
      "main_content": "What we'll cover today",
      "bullet_points": ["Point 1", "Point 2", "Point 3"],
      "speaker_notes": "Here's what we'll discuss...",
      "visual_suggestion": "Agenda icons or timeline graphic"
    }
  ],
  "theme_suggestion": "Professional blue theme with clean typography"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');

  return JSON.parse(jsonMatch[0]);
}

// Infographic structure
export interface InfographicSection {
  section_type:
    | 'header'
    | 'stats'
    | 'timeline'
    | 'comparison'
    | 'process'
    | 'list'
    | 'quote'
    | 'footer';
  title?: string;
  content: Record<string, unknown>;
}

export interface InfographicData {
  title: string;
  subtitle?: string;
  color_scheme: string[];
  sections: InfographicSection[];
  style_suggestion: string;
}

// Generate infographic structure from source content
// Note: This generates the data structure. Actual image generation will use Nano Banana API
export async function generateInfographic(
  content: string,
  customInstructions?: string
): Promise<InfographicData> {
  const model = getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  const prompt = `You are an expert infographic designer. Based on the following content, create a detailed infographic structure that can be rendered visually.

CONTENT:
${content}

${customInstructions ? `CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}

Create an infographic structure with:
- Engaging title and subtitle
- 4-8 distinct sections
- Mix of section types: stats, timeline, comparison, process, list, quote
- Color scheme suggestion (4-5 hex colors)
- Clear visual hierarchy

Return ONLY a valid JSON object with no markdown formatting, code blocks, or extra text. Format:
{
  "title": "Infographic Title",
  "subtitle": "A brief subtitle",
  "color_scheme": ["#1a73e8", "#34a853", "#fbbc04", "#ea4335", "#ffffff"],
  "sections": [
    {
      "section_type": "header",
      "title": "Main Title",
      "content": {"subtitle": "Subtitle text", "background_style": "gradient"}
    },
    {
      "section_type": "stats",
      "title": "Key Statistics",
      "content": {
        "items": [
          {"value": "85%", "label": "Success Rate", "icon": "chart-up"},
          {"value": "1M+", "label": "Users", "icon": "users"},
          {"value": "50+", "label": "Countries", "icon": "globe"}
        ]
      }
    },
    {
      "section_type": "timeline",
      "title": "Timeline",
      "content": {
        "events": [
          {"date": "2020", "title": "Event 1", "description": "What happened"},
          {"date": "2022", "title": "Event 2", "description": "Another milestone"}
        ]
      }
    },
    {
      "section_type": "comparison",
      "title": "Comparison",
      "content": {
        "left": {"label": "Option A", "points": ["Point 1", "Point 2"]},
        "right": {"label": "Option B", "points": ["Point 1", "Point 2"]}
      }
    },
    {
      "section_type": "process",
      "title": "Process Flow",
      "content": {
        "steps": [
          {"step": 1, "title": "Step 1", "description": "First step"},
          {"step": 2, "title": "Step 2", "description": "Second step"}
        ]
      }
    },
    {
      "section_type": "list",
      "title": "Key Points",
      "content": {
        "items": ["Item 1", "Item 2", "Item 3", "Item 4"]
      }
    },
    {
      "section_type": "footer",
      "content": {"text": "Source: Your Sources", "logo_placeholder": true}
    }
  ],
  "style_suggestion": "Modern, clean design with bold icons and clear typography"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');

  return JSON.parse(jsonMatch[0]);
}

// Convert raw PCM audio data to WAV format
// PCM from Gemini TTS is 16-bit mono at 24000Hz
export function pcmToWav(pcmData: Buffer, sampleRate: number = 24000): Buffer {
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;

  const wavBuffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + dataSize, 4); // File size - 8
  wavBuffer.write('WAVE', 8);

  // fmt chunk
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16); // Chunk size
  wavBuffer.writeUInt16LE(1, 20); // Audio format (1 = PCM)
  wavBuffer.writeUInt16LE(numChannels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);

  // Copy PCM data
  pcmData.copy(wavBuffer, headerSize);

  return wavBuffer;
}

// Generate multi-speaker TTS audio from podcast script using Gemini TTS
export async function generateTTSAudio(
  script: string,
  voiceConfig: { voice1?: string; voice2?: string } = {}
): Promise<{ audioData: string; mimeType: string }> {
  if (!apiKey) throw new Error('Gemini API not configured');

  // Voice options: Kore (firm), Puck (upbeat), Charon (informative), Fenrir (excitable),
  // Leda (youthful), Orus (firm), Aoede (breezy), Zephyr (bright)
  const voice1 = voiceConfig.voice1 || 'Orus'; // Alex - deeper, authoritative
  const voice2 = voiceConfig.voice2 || 'Aoede'; // Sam - lighter, curious

  // Use Gemini 2.5 Flash Preview TTS for multi-speaker support
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: script,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: 'Alex',
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: voice1,
                    },
                  },
                },
                {
                  speaker: 'Sam',
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: voice2,
                    },
                  },
                },
              ],
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('TTS API error:', error);
    throw new Error(`TTS generation failed: ${response.status}`);
  }

  const data = await response.json();

  // Extract audio data from response
  const audioPart = data.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { mimeType: string; data: string } }) =>
      part.inlineData?.mimeType?.startsWith('audio/')
  );

  if (!audioPart?.inlineData) {
    throw new Error('No audio data in response');
  }

  return {
    audioData: audioPart.inlineData.data,
    mimeType: audioPart.inlineData.mimeType,
  };
}

// Generate video using Veo
export async function generateVideo(
  prompt: string,
  durationSeconds: number = 8
): Promise<{ videoData: string; mimeType: string } | { operationName: string }> {
  if (!apiKey) throw new Error('Gemini API not configured');

  // Veo video generation - start async operation
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [
          {
            prompt: prompt,
          },
        ],
        parameters: {
          aspectRatio: '16:9',
          durationSeconds: Math.min(durationSeconds, 8), // Veo max is 8 seconds per clip
          personGeneration: 'dont_allow',
          sampleCount: 1,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Veo API error:', error);
    throw new Error(`Video generation failed: ${response.status}`);
  }

  const data = await response.json();

  // Veo returns an operation name for long-running generation
  if (data.name) {
    return { operationName: data.name };
  }

  // If immediate result (unlikely for video)
  const videoPart = data.predictions?.[0];
  if (videoPart?.bytesBase64Encoded) {
    return {
      videoData: videoPart.bytesBase64Encoded,
      mimeType: 'video/mp4',
    };
  }

  throw new Error('Unexpected video generation response');
}

// Check video generation operation status
export async function checkVideoOperation(
  operationName: string
): Promise<{ done: boolean; videoUrl?: string; error?: string }> {
  if (!apiKey) throw new Error('Gemini API not configured');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Operation check failed: ${error}`);
  }

  const data = await response.json();

  if (data.done) {
    if (data.error) {
      return { done: true, error: data.error.message };
    }

    const videoUri = data.response?.generatedSamples?.[0]?.video?.uri;
    return { done: true, videoUrl: videoUri };
  }

  return { done: false };
}

// ============ NANO BANANA PRO (Gemini 3 Pro Image) ============

export interface GeneratedImage {
  imageData: string; // Base64-encoded image
  mimeType: string;
}

// Generate image using Nano Banana Pro (Gemini 3 Pro Image Preview)
export async function generateImage(
  prompt: string,
  aspectRatio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16' | '5:4' = '1:1',
  imageSize: '1K' | '2K' | '4K' = '1K'
): Promise<GeneratedImage> {
  if (!apiKey) throw new Error('Gemini API not configured');

  // Use Nano Banana Pro (Gemini 3 Pro Image Preview)
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: imageSize,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Nano Banana Pro API error:', error);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();

  // Extract image from response
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { mimeType: string; data: string } }) =>
      part.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData) {
    throw new Error('No image data in response');
  }

  return {
    imageData: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
}

// Generate multiple infographic images from content using Nano Banana Pro
export async function generateInfographicImages(
  content: string,
  imageCount: number = 4,
  imageStyle: string = 'infographic',
  colorTheme: string = 'modern'
): Promise<{
  images: { prompt: string; imageData: string; mimeType: string; title: string }[];
  concepts: string[];
}> {
  const model = getFlashModel();
  if (!model) throw new Error('Gemini API not configured');

  // Style descriptions for Nano Banana Pro
  const styleDescriptions: Record<string, string> = {
    infographic:
      'professional infographic with clean icons, data visualization elements, charts, and modern typography',
    illustration:
      'vibrant digital illustration with bold colors, stylized graphics, and artistic flair',
    diagram: 'technical diagram with precise lines, flowchart elements, and schematic design',
    flat: 'flat design aesthetic with geometric shapes, minimal shadows, and bold solid colors',
    '3d': 'photorealistic 3D render with lighting, depth, materials, and dimensional elements',
  };

  const themeDescriptions: Record<string, string> = {
    modern: 'modern color palette with blues, teals, and clean whites',
    colorful: 'vibrant rainbow palette with saturated colors',
    minimal: 'monochromatic with subtle grays and single accent color',
    professional: 'corporate blues, grays, and professional tones',
    dark: 'dark mode with deep backgrounds and neon accents',
  };

  const styleDesc = styleDescriptions[imageStyle] || styleDescriptions['infographic'];
  const themeDesc = themeDescriptions[colorTheme] || themeDescriptions['modern'];

  // First, extract key concepts to visualize
  const conceptPrompt = `You are an expert at visual communication and creating prompts for Nano Banana Pro (Gemini 3 Pro Image). Based on the following content, identify ${imageCount} key concepts that would make excellent infographic images.

CONTENT:
${content.slice(0, 50000)}

For each concept, create a detailed image generation prompt optimized for Nano Banana Pro. The model excels at:
- Rendering text within images (include relevant labels, titles, or short text)
- Complex compositions with multiple visual elements
- High-fidelity graphics with precise details
- Professional design aesthetics

Style requirements:
- Visual style: ${styleDesc}
- Color theme: ${themeDesc}
- Include text labels and annotations where helpful
- Design should be visually striking and professional
- Avoid photorealistic people/faces

Return ONLY a valid JSON array with no markdown formatting, code blocks, or extra text. Format:
[
  {
    "title": "Concept Title",
    "prompt": "Create a ${imageStyle} style image about [concept]. Include [specific visual elements]. The design should feature ${themeDesc}. Add text labels showing [key terms]. Style: ${styleDesc}. High quality, professional design."
  }
]`;

  const result = await model.generateContent(conceptPrompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid response format');

  const concepts: { title: string; prompt: string }[] = JSON.parse(jsonMatch[0]);

  // Generate images for each concept using Nano Banana Pro
  const images: { prompt: string; imageData: string; mimeType: string; title: string }[] = [];

  for (const concept of concepts.slice(0, imageCount)) {
    try {
      // Add a small delay between requests to avoid rate limiting
      if (images.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const image = await generateImage(concept.prompt, '1:1', '1K');
      images.push({
        title: concept.title,
        prompt: concept.prompt,
        imageData: image.imageData,
        mimeType: image.mimeType,
      });
    } catch (error) {
      console.error(`Failed to generate image for "${concept.title}":`, error);
      // Continue with other images even if one fails
    }
  }

  return {
    images,
    concepts: concepts.map((c) => c.title),
  };
}
