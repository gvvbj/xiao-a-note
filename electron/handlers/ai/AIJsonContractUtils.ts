export function extractJsonCandidate(answer: string): string | null {
    const trimmed = answer.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith('```')) {
        const normalized = trimmed
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/, '');
        return normalized.trim();
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1);
    }

    return trimmed;
}

export function safeJsonParse<T>(answer: string): T | null {
    const candidate = extractJsonCandidate(answer);
    if (!candidate) {
        return null;
    }

    try {
        return JSON.parse(candidate) as T;
    } catch {
        return null;
    }
}
