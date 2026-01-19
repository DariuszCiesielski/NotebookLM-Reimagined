/**
 * RAG Service - Chunking and Embeddings for Frontend
 * Handles text splitting and embedding generation using Google's Gemini API
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Initialize Supabase with service role for server-side operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Chunking parameters
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export interface Chunk {
    chunk_index: number;
    content: string;
    token_count: number;
}

export interface ChunkWithEmbedding extends Chunk {
    source_id: string;
    embedding: number[];
    metadata: Record<string, unknown>;
}

/**
 * Split text into overlapping chunks
 */
export function splitIntoChunks(text: string): Chunk[] {
    if (!text || !text.trim()) {
        return [];
    }

    const cleanText = text.trim();
    const chunks: Chunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < cleanText.length) {
        const end = Math.min(start + CHUNK_SIZE, cleanText.length);
        let chunk = cleanText.slice(start, end);

        // Try to break at sentence or word boundary
        if (end < cleanText.length) {
            const lastPeriod = chunk.lastIndexOf('. ');
            const lastNewline = chunk.lastIndexOf('\n');
            const lastSpace = chunk.lastIndexOf(' ');

            const breakPoint = Math.max(lastPeriod, lastNewline, lastSpace);
            if (breakPoint > CHUNK_SIZE / 2) {
                chunk = chunk.slice(0, breakPoint + 1);
            }
        }

        chunk = chunk.trim();
        if (chunk.length > 0) {
            chunks.push({
                chunk_index: chunkIndex,
                content: chunk,
                token_count: Math.ceil(chunk.length / 4), // Rough estimate
            });
            chunkIndex++;
        }

        // Move start position with overlap
        start += chunk.length > 0 ? chunk.length - Math.min(CHUNK_OVERLAP, chunk.length / 2) : CHUNK_SIZE;
    }

    return chunks;
}

/**
 * Generate embedding for a single text using Gemini
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!text || !text.trim()) {
        return [];
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await model.embedContent(text.slice(0, 10000)); // Limit text length
        return result.embedding.values;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

/**
 * Process source content: chunk and generate embeddings
 * @returns number of chunks created
 */
export async function processSourceContent(
    sourceId: string,
    content: string
): Promise<number> {
    if (!content || !content.trim()) {
        console.log('No content to process');
        return 0;
    }

    // 1. Split into chunks
    const chunks = splitIntoChunks(content);
    console.log(`Created ${chunks.length} chunks for source ${sourceId}`);

    if (chunks.length === 0) {
        return 0;
    }

    // 2. Generate embeddings for each chunk
    const chunksWithEmbeddings: ChunkWithEmbedding[] = [];

    for (const chunk of chunks) {
        try {
            const embedding = await generateEmbedding(chunk.content);
            chunksWithEmbeddings.push({
                source_id: sourceId,
                chunk_index: chunk.chunk_index,
                content: chunk.content,
                embedding: embedding,
                token_count: chunk.token_count,
                metadata: {},
            });
        } catch (error) {
            console.error(`Failed to generate embedding for chunk ${chunk.chunk_index}:`, error);
            // Continue with other chunks
        }
    }

    if (chunksWithEmbeddings.length === 0) {
        console.log('No embeddings generated');
        return 0;
    }

    // 3. Insert chunks into database
    const { error } = await supabaseAdmin
        .from('source_chunks')
        .insert(chunksWithEmbeddings);

    if (error) {
        console.error('Error inserting chunks:', error);
        throw error;
    }

    console.log(`Successfully inserted ${chunksWithEmbeddings.length} chunks with embeddings`);
    return chunksWithEmbeddings.length;
}

/**
 * Delete all chunks for a source
 */
export async function deleteSourceChunks(sourceId: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('source_chunks')
        .delete()
        .eq('source_id', sourceId);

    if (error) {
        console.error('Error deleting chunks:', error);
        throw error;
    }
}

/**
 * Search for similar chunks using vector similarity
 */
export async function searchSimilarChunks(
    query: string,
    notebookId: string,
    matchCount: number = 5
): Promise<Array<{ id: string; source_id: string; content: string; similarity: number }>> {
    try {
        // Generate query embedding
        const queryEmbedding = await generateEmbedding(query);

        // Call the RPC function for vector search
        const { data, error } = await supabaseAdmin.rpc('match_source_chunks', {
            query_embedding: queryEmbedding,
            match_count: matchCount,
            p_notebook_id: notebookId,
        });

        if (error) {
            console.error('Error searching chunks:', error);
            throw error;
        }

        return data || [];
    } catch (error) {
        console.error('Search failed:', error);
        return [];
    }
}
