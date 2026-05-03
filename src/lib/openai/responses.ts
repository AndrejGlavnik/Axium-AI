import "server-only";

export type SourceReference = {
  file_id?: string;
  file_name?: string;
  score?: number;
};

export function extractResponseText(response: unknown) {
  const withOutputText = response as { output_text?: unknown };
  if (typeof withOutputText.output_text === "string" && withOutputText.output_text.trim()) {
    return withOutputText.output_text;
  }

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return "";
  }

  const chunks: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") {
        chunks.push(text);
      }
    }
  }

  return chunks.join("\n").trim();
}

export function extractFileSearchSources(response: unknown): SourceReference[] {
  const seen = new Set<string>();
  const sources: SourceReference[] = [];

  function addSource(source: SourceReference) {
    const key = source.file_id || source.file_name;
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    sources.push(source);
  }

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return sources;
  }

  for (const item of output) {
    const typedItem = item as { type?: unknown; results?: unknown; content?: unknown };

    if (typedItem.type === "file_search_call" && Array.isArray(typedItem.results)) {
      for (const result of typedItem.results) {
        const typedResult = result as { file_id?: unknown; filename?: unknown; score?: unknown };
        addSource({
          file_id: typeof typedResult.file_id === "string" ? typedResult.file_id : undefined,
          file_name: typeof typedResult.filename === "string" ? typedResult.filename : undefined,
          score: typeof typedResult.score === "number" ? typedResult.score : undefined
        });
      }
    }

    if (Array.isArray(typedItem.content)) {
      for (const part of typedItem.content) {
        const annotations = (part as { annotations?: unknown }).annotations;
        if (!Array.isArray(annotations)) {
          continue;
        }

        for (const annotation of annotations) {
          const typedAnnotation = annotation as { file_id?: unknown; filename?: unknown };
          addSource({
            file_id: typeof typedAnnotation.file_id === "string" ? typedAnnotation.file_id : undefined,
            file_name: typeof typedAnnotation.filename === "string" ? typedAnnotation.filename : undefined
          });
        }
      }
    }
  }

  return sources;
}
