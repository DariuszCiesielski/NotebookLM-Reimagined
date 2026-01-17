Here’s a clear, prioritized list of features/improvements you can copy-paste directly to Claude (or any coding AI) to implement on top of your existing AI Research Notes codebase. I ordered them by impact — the ones that fix the biggest NotebookLM pain points first.

### High-Priority (Implement these first — they make the app feel dramatically better)

1. **Advanced Source Organization**  
   Add folders and subfolders for sources within a notebook. Also add tagging, full-text search across source titles/metadata, bulk actions (multi-select delete/move/tag), and optional version history for uploaded files. Update the Sources panel UI to show a tree view (collapsible folders) and a search bar.

2. **Multiple Parallel Chat Threads**  
   Allow multiple independent chat conversations within the same notebook. Each thread should have its own history, context (grounded in all notebook sources), and title (auto-generated or user-editable). Add a sidebar or tab system to switch between threads, plus the ability to create/rename/delete threads.

3. **Fully Editable Generated Outputs**  
   Make all generated artifacts (audio scripts, video storyboards, infographics, study guides, tables, etc.) editable after creation. Store them as editable objects, allow text/visual edits in the UI, and add a “Re-generate” button that uses the edited version as the new prompt/input. Also support custom duration (up to 60+ min for audio/video) and style presets.

4. **Complete Mobile Parity**  
   Ensure every desktop feature (Studio panel, source organization, multiple chats, editing outputs, Deep Research toggle, custom instructions) works identically on mobile (iOS/Android). Add offline access to cached sources/notes and smooth syncing when online.

### Medium-Priority (Great quality-of-life upgrades)

5. **Persistent Custom Personas / Notebook Instructions**  
   Add a notebook-level settings panel where users can define persistent custom instructions or personas (e.g., “Always explain concepts simply” or “Be skeptical and poke holes”). These should automatically apply to all chat responses and generated artifacts in that notebook.

6. **Hybrid Model Selection Controls**  
   Add UI toggles/sliders for users to manually choose between “Fast/Cheap” (Gemini 2.5 Flash) and “Best Quality” (Gemini 3 or Alibaba video model) on a per-generation basis (chat, audio, video, images). Show estimated time/cost difference if possible.

7. **One-Click Full Notebook Export**  
   Add an export button that packages the entire notebook (all sources, chats, notes, generated artifacts) into a single downloadable ZIP or PDF bundle, or a clean Markdown/HTML site. Include options for what to include/exclude.

### Lower-Priority / Nice-to-Have

8. **Cross-Notebook Source/Note Linking**  
   Allow referencing or linking sources/notes from other notebooks within a chat or generation (e.g., for large multi-notebook projects). Add a search-across-notebooks picker when relevant.

9. **Extra Polish Items**  
   - Longer default output lengths and depth controls (avoid superficial bullet lists).  
   - Built-in audio player for generated podcasts directly in the app.  
   - Better PDF handling (clickable page citations in responses).  
   - Preserved formatting (especially math/LaTeX) in exports.

You can feed these to Claude one by one (starting with the high-priority ones) and say something like:  
“Please implement feature #1 (Advanced Source Organization) in my existing codebase. The current sources are stored in Supabase, UI is React/React Native, etc.”

Let me know if you want any of these rephrased, split into smaller tasks, or reordered!