import { acceptCompletion, autocompletion, completionStatus, Completion, CompletionContext, CompletionSource, startCompletion } from '@codemirror/autocomplete';
import { Prec, type Extension } from '@codemirror/state';
import { EditorView, keymap, ViewPlugin } from '@codemirror/view';
import { LOCAL_CONTENT_SUGGEST_CONSTANTS as C } from '../constants/LocalContentSuggestConstants';

type SuggestionEntry = {
    value: string;
    count: number;
    kind: 'word' | 'line';
};

type CachedIndex = {
    docText: string;
    words: Map<string, number>;
    lines: Map<string, number>;
};

const TOKEN_CHAR_RE = /[A-Za-z0-9_\-\u4E00-\u9FFF]/;
const TOKEN_VALID_RE = /[A-Za-z0-9_\-\u4E00-\u9FFF]*/;
const ASCII_TOKEN_EXTRACT_RE = /[A-Za-z0-9_\-]{2,64}/g;
const CJK_RUN_EXTRACT_RE = /[\u4E00-\u9FFF]{2,}/g;

function isTokenChar(char: string): boolean {
    return TOKEN_CHAR_RE.test(char);
}

function extractPrefix(docText: string, pos: number): string {
    let start = pos;
    let scanned = 0;

    while (start > 0 && scanned < C.MAX_TOKEN_LENGTH) {
        const ch = docText[start - 1];
        if (!isTokenChar(ch)) {
            break;
        }
        start--;
        scanned++;
    }

    return docText.slice(start, pos);
}

function inc(map: Map<string, number>, key: string) {
    map.set(key, (map.get(key) ?? 0) + 1);
}

function addCjkPhrases(words: Map<string, number>, docText: string) {
    const runs = docText.match(CJK_RUN_EXTRACT_RE) ?? [];
    for (const run of runs) {
        const maxLen = Math.min(C.MAX_CJK_PHRASE_LENGTH, run.length);
        for (let len = 2; len <= maxLen; len++) {
            for (let i = 0; i + len <= run.length; i++) {
                inc(words, run.slice(i, i + len));
            }
        }
    }
}

function buildIndex(docText: string): CachedIndex {
    const words = new Map<string, number>();
    const lines = new Map<string, number>();

    const wordMatches = docText.match(ASCII_TOKEN_EXTRACT_RE) ?? [];
    for (const token of wordMatches) {
        if (token.length > C.MAX_TOKEN_LENGTH) continue;
        inc(words, token);
    }
    addCjkPhrases(words, docText);

    const rawLines = docText.split(/\r?\n/);
    for (const raw of rawLines) {
        const line = raw.trim();
        if (line.length < C.MIN_LINE_PREFIX) continue;
        if (line.length > C.MAX_LINE_LENGTH) continue;
        inc(lines, line);
    }

    return { docText, words, lines };
}

function sortSuggestions(a: SuggestionEntry, b: SuggestionEntry): number {
    if (a.kind !== b.kind) {
        return a.kind === 'word' ? -1 : 1;
    }
    if (a.count !== b.count) {
        return b.count - a.count;
    }
    if (a.value.length !== b.value.length) {
        return a.value.length - b.value.length;
    }
    return a.value.localeCompare(b.value, 'zh-Hans-CN');
}

function buildCompletionOptions(entries: SuggestionEntry[]): Completion[] {
    return entries.map((entry) => ({
        label: entry.value,
        type: 'text',
        detail: entry.kind === 'word'
            ? `文档内词汇（出现 ${entry.count} 次）`
            : `文档内行片段（出现 ${entry.count} 次）`,
        boost: entry.kind === 'word' ? 2 : 0,
    }));
}

function acceptWhenCompletionActive(view: EditorView): boolean {
    const status = completionStatus(view.state);
    if (status !== 'active' && status !== 'pending') {
        return false;
    }

    // 优先尝试接受当前候选；如果因宿主/时序导致返回 false，也拦截 Enter/Tab，
    // 避免事件继续落到换行/制表符逻辑。
    return acceptCompletion(view) || true;
}

function createCompletionAcceptCaptureExtension(): Extension {
    return ViewPlugin.fromClass(class {
        private keydownHandler: (event: KeyboardEvent) => void;

        constructor(private view: EditorView) {
            this.keydownHandler = (event: KeyboardEvent) => {
                if (event.key !== 'Enter' && event.key !== 'Tab') {
                    return;
                }

                const status = completionStatus(this.view.state);
                if (status !== 'active' && status !== 'pending') {
                    return;
                }

                // 在捕获阶段优先接管，避免基础编辑器 keymap 把 Enter/Tab 当作换行/制表符处理
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                acceptWhenCompletionActive(this.view);
            };

            this.view.dom.addEventListener('keydown', this.keydownHandler, true);
        }

        destroy() {
            this.view.dom.removeEventListener('keydown', this.keydownHandler, true);
        }
    });
}

function createLocalContentCompletionSource(): CompletionSource {
    let cache: CachedIndex | null = null;

    return (context: CompletionContext) => {
        const docText = context.state.doc.toString();
        const prefix = extractPrefix(docText, context.pos);

        if (!context.explicit && prefix.length < C.MIN_WORD_PREFIX) {
            return null;
        }

        if (!cache || cache.docText !== docText) {
            cache = buildIndex(docText);
        }

        const entries: SuggestionEntry[] = [];
        const seen = new Set<string>();

        if (prefix.length >= C.MIN_WORD_PREFIX) {
            for (const [word, count] of cache.words) {
                if (word === prefix) continue;
                if (!word.startsWith(prefix)) continue;
                if (seen.has(word)) continue;
                entries.push({ value: word, count, kind: 'word' });
                seen.add(word);
                if (entries.filter(e => e.kind === 'word').length >= C.MAX_WORD_SUGGESTIONS) {
                    break;
                }
            }
        }

        if (prefix.length >= C.MIN_LINE_PREFIX) {
            let lineCount = 0;
            for (const [line, count] of cache.lines) {
                if (line === prefix) continue;
                if (!line.startsWith(prefix)) continue;
                if (seen.has(line)) continue;
                entries.push({ value: line, count, kind: 'line' });
                seen.add(line);
                lineCount++;
                if (lineCount >= C.MAX_LINE_SUGGESTIONS) {
                    break;
                }
            }
        }

        if (entries.length === 0) {
            return null;
        }

        entries.sort(sortSuggestions);

        return {
            from: context.pos - prefix.length,
            options: buildCompletionOptions(entries),
            validFor: TOKEN_VALID_RE,
        };
    };
}

export function createLocalContentSuggestExtensions(): Extension[] {
    const source = createLocalContentCompletionSource();

    return [
        autocompletion({
            override: [source],
            activateOnTyping: true,
            maxRenderedOptions: 12,
            defaultKeymap: true,
            closeOnBlur: true,
            selectOnOpen: true,
        }),
        createCompletionAcceptCaptureExtension(),
        // 高优先级处理补全接受，避免被宿主 Enter/Tab 行为提前吞掉
        Prec.highest(keymap.of([
            {
                key: 'Enter',
                run: (view) => acceptWhenCompletionActive(view),
                preventDefault: true,
            },
            {
                key: 'Tab',
                run: (view) => acceptWhenCompletionActive(view),
                preventDefault: true,
            },
        ])),
        keymap.of([
            {
                key: 'Ctrl-Space',
                run: (view) => {
                    startCompletion(view);
                    return true;
                },
            },
        ]),
    ];
}
