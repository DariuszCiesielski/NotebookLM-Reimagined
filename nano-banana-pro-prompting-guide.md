# Nano Banana Pro Prompting Guide (November 2025)
**Model Version:** Nano Banana Pro (Gemini 3 Pro Image)  
**Release Date:** November 20, 2025

## 1. Core Philosophy: The "Thinking" Model
Unlike previous generation image models that relied on keyword matching ("tag soup"), Nano Banana Pro is built on the Gemini 3 Pro reasoning engine. It understands physics, intent, and composition. 

**The Golden Rule:** Talk to it like a Creative Director, not a search engine.

---

## 2. The Four Pillars of Prompting

### A. Natural Language Over Tags
*   **❌ Avoid:** `dog, park, 4k, realistic, sunset`
*   **✅ Use:** "A cinematic wide shot of a Golden Retriever sprinting through a sunlit park at golden hour. The low sun casts long shadows on the grass."

### B. Edit, Don't Re-roll
Nano Banana Pro excels at conversational editing. If an image is 80% right, do not generate a new one.
*   **Technique:** Use the "Edit" function with natural instructions.
*   **Prompt:** "That's great, but change the lighting to a moody cyberpunk night scene and make the text neon blue."

### C. Context is King (The "Why")
Give the model context so it can infer artistic decisions (lighting, depth of field, plating).
*   **Template:** `[Subject] + [Context/Use Case]`
*   **Example:** "Create an image of a sandwich **for a high-end Brazilian gourmet cookbook**." (The model infers professional plating, macro focal length, and dramatic lighting).

### D. Specificity & Materiality
Define textures and materials to avoid the "plastic AI look."
*   **Keywords to use:** `Brushed steel`, `soft velvet`, `crumpled paper`, `matte finish`, `grainy film texture`.

---

## 3. Advanced Features & Techniques

### Identity Locking (Character Consistency)
Nano Banana Pro supports up to **14 reference images** (6 high-fidelity) to maintain character identity across different scenes.

*   **Prompt Formula:** 
    > "Keep [Person A]'s facial features exactly the same as Image 1, but change [Expression/Action]."
*   **Example:** "Design a viral thumbnail using the person from Image 1. **Face Consistency:** Keep facial features identical to Reference A. **Action:** Pose them pointing excitedly at a floating hologram."

### Text Rendering & Typography
The model has achieved ~94% character accuracy. Use it for logos, posters, and thumbnails.
*   **Instruction:** Explicitly state the text and style.
*   **Prompt:** "A retro 80s movie poster. Title text at the top reads 'NANO NIGHTS' in chrome metallic font with pink neon outlines."

### Grounding with Google Search
The model can pull real-time data for visualizations.
*   **Use Case:** Charts, infographics, and news visuals.
*   **Prompt:** "Create an infographic showing the stock performance of renewable energy sectors in 2025 based on current market data."

### Layout Control (Sketches & Wireframes)
Upload a rough sketch or wireframe to control exact element placement.
*   **Prompt:** "Generate a high-fidelity UI mockup for a travel app based on this wireframe. Use a clean, airy aesthetic with teal accents."

---

## 4. The Ultimate Prompt Structure
For best results, construct your prompts using this sequence:

1.  **Subject:** (Who/What)
2.  **Action:** (Doing what)
3.  **Environment:** (Where)
4.  **Lighting/Mood:** (Time of day, atmosphere)
5.  **Technical Specs:** (Camera angle, style, texture)
6.  **Context:** (Intended audience/medium)

**Master Example:**
> "A hyper-realistic close-up of an astronaut fixing a circuit board **(Subject/Action)** on the surface of Mars **(Environment)**. Harsh sunlight from the right creates deep contrast **(Lighting)**. Shot on 35mm film with visible grain and dust textures **(Technical)**. For a sci-fi documentary promotional poster **(Context)**."

---

## 5. Quick Reference: Parameter Constraints
*   **Aspect Ratios:** No longer locked to 1:1. Supports 16:9, 9:16, 4:3, 2:3, etc.
*   **Resolution:** Native 4K support.
*   **Negative Prompts:** Less necessary due to reasoning capabilities, but can be used for style exclusions (e.g., "no cartoon style").
