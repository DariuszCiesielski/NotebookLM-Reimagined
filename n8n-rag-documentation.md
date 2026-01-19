# n8n Automation dla NotebookLM RAG

## Wymagane credentials w n8n

### 1. Supabase API
- URL: `https://avccabohbvtemhispguz.supabase.co`
- Service Role Key: `***REMOVED***`

### 2. Gemini API (HTTP Query Auth)
- Parameter Name: `key`
- Value: `***REMOVED***`

---

## Workflow 1: Process Sources (n8n-rag-workflow.json)

Ten workflow przetwarza nieprzetworne źródła:
1. Pobiera źródła bez chunków
2. Dzieli tekst na chunki (1000 znaków, 200 overlap)
3. Generuje embeddingi via Gemini text-embedding-004
4. Zapisuje chunki do tabeli `source_chunks`

### Import do n8n
1. Wejdź w n8n → Settings → Import From File
2. Wybierz `n8n-rag-workflow.json`
3. Zaktualizuj credentials ID na swoje

---

## Workflow 2: Vector Search (ręcznie)

Aby wyszukać relevantne chunki dla pytania:

### Node 1: Generate Query Embedding
```
HTTP Request Node
POST https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={{API_KEY}}
Body:
{
  "model": "models/text-embedding-004",
  "content": {"parts":[{"text":"TWOJE PYTANIE"}]},
  "taskType": "RETRIEVAL_QUERY"
}
```

### Node 2: Call Supabase RPC
```
Supabase Node
RPC: match_source_chunks
Parameters:
- query_embedding: {{$json.embedding.values}}
- match_count: 5
- p_notebook_id: "UUID notebooka"
```

### Node 3: Build Context for LLM
```
Code Node
const chunks = $input.all().map(i => i.json);
const context = chunks.map((c, i) => `[${i+1}] ${c.content}`).join('\n\n');
return [{ json: { context } }];
```

---

## API Endpoints

### Dodanie źródła (POST)
```
POST https://avccabohbvtemhispguz.supabase.co/rest/v1/sources
Headers:
  apikey: {{SERVICE_ROLE_KEY}}
  Authorization: Bearer {{SERVICE_ROLE_KEY}}
  Content-Type: application/json
  Prefer: return=representation

Body:
{
  "notebook_id": "UUID",
  "type": "text",
  "name": "Nazwa źródła",
  "status": "ready",
  "metadata": {"content": "Treść dokumentu..."}
}
```

### Vector Search (RPC)
```
POST https://avccabohbvtemhispguz.supabase.co/rest/v1/rpc/match_source_chunks
Headers:
  apikey: {{SERVICE_ROLE_KEY}}
  Authorization: Bearer {{SERVICE_ROLE_KEY}}
  Content-Type: application/json

Body:
{
  "query_embedding": [0.123, 0.456, ...],
  "match_count": 5,
  "p_notebook_id": "UUID"
}
```
