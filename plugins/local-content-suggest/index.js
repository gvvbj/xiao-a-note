"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/modules/extensions/local-content-suggest/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => LocalContentSuggestPlugin
});
module.exports = __toCommonJS(index_exports);

// src/modules/extensions/local-content-suggest/constants/LocalContentSuggestConstants.ts
var LOCAL_CONTENT_SUGGEST_CONSTANTS = {
  PLUGIN_ID: "local-content-suggest",
  PLUGIN_NAME: "\u6587\u6863\u5185\u5185\u5BB9\u63D0\u793A",
  VERSION: "1.0.0",
  DESCRIPTION: "\u6839\u636E\u5F53\u524D\u6587\u6863\u4E2D\u5DF2\u51FA\u73B0\u7684\u5185\u5BB9\u63D0\u4F9B\u8F93\u5165\u8865\u5168\u63D0\u793A",
  MAX_WORD_SUGGESTIONS: 8,
  MAX_LINE_SUGGESTIONS: 4,
  MIN_WORD_PREFIX: 1,
  MIN_LINE_PREFIX: 4,
  MAX_TOKEN_LENGTH: 64,
  MAX_LINE_LENGTH: 120,
  MAX_CJK_PHRASE_LENGTH: 8
};

// node_modules/@codemirror/autocomplete/dist/index.js
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");
var import_language = require("@codemirror/language");
var CompletionContext = class {
  /**
  Create a new completion context. (Mostly useful for testing
  completion sources—in the editor, the extension will create
  these for you.)
  */
  constructor(state, pos, explicit, view) {
    this.state = state;
    this.pos = pos;
    this.explicit = explicit;
    this.view = view;
    this.abortListeners = [];
    this.abortOnDocChange = false;
  }
  /**
  Get the extent, content, and (if there is a token) type of the
  token before `this.pos`.
  */
  tokenBefore(types) {
    let token = (0, import_language.syntaxTree)(this.state).resolveInner(this.pos, -1);
    while (token && types.indexOf(token.name) < 0)
      token = token.parent;
    return token ? {
      from: token.from,
      to: this.pos,
      text: this.state.sliceDoc(token.from, this.pos),
      type: token.type
    } : null;
  }
  /**
  Get the match of the given expression directly before the
  cursor.
  */
  matchBefore(expr) {
    let line = this.state.doc.lineAt(this.pos);
    let start = Math.max(line.from, this.pos - 250);
    let str = line.text.slice(start - line.from, this.pos - line.from);
    let found = str.search(ensureAnchor(expr, false));
    return found < 0 ? null : { from: start + found, to: this.pos, text: str.slice(found) };
  }
  /**
  Yields true when the query has been aborted. Can be useful in
  asynchronous queries to avoid doing work that will be ignored.
  */
  get aborted() {
    return this.abortListeners == null;
  }
  /**
  Allows you to register abort handlers, which will be called when
  the query is
  [aborted](https://codemirror.net/6/docs/ref/#autocomplete.CompletionContext.aborted).
  
  By default, running queries will not be aborted for regular
  typing or backspacing, on the assumption that they are likely to
  return a result with a
  [`validFor`](https://codemirror.net/6/docs/ref/#autocomplete.CompletionResult.validFor) field that
  allows the result to be used after all. Passing `onDocChange:
  true` will cause this query to be aborted for any document
  change.
  */
  addEventListener(type, listener, options) {
    if (type == "abort" && this.abortListeners) {
      this.abortListeners.push(listener);
      if (options && options.onDocChange)
        this.abortOnDocChange = true;
    }
  }
};
function toSet(chars) {
  let flat = Object.keys(chars).join("");
  let words = /\w/.test(flat);
  if (words)
    flat = flat.replace(/\w/g, "");
  return `[${words ? "\\w" : ""}${flat.replace(/[^\w\s]/g, "\\$&")}]`;
}
function prefixMatch(options) {
  let first = /* @__PURE__ */ Object.create(null), rest = /* @__PURE__ */ Object.create(null);
  for (let { label } of options) {
    first[label[0]] = true;
    for (let i = 1; i < label.length; i++)
      rest[label[i]] = true;
  }
  let source = toSet(first) + toSet(rest) + "*$";
  return [new RegExp("^" + source), new RegExp(source)];
}
function completeFromList(list) {
  let options = list.map((o) => typeof o == "string" ? { label: o } : o);
  let [validFor, match] = options.every((o) => /^\w+$/.test(o.label)) ? [/\w*$/, /\w+$/] : prefixMatch(options);
  return (context) => {
    let token = context.matchBefore(match);
    return token || context.explicit ? { from: token ? token.from : context.pos, options, validFor } : null;
  };
}
var Option = class {
  constructor(completion, source, match, score2) {
    this.completion = completion;
    this.source = source;
    this.match = match;
    this.score = score2;
  }
};
function cur(state) {
  return state.selection.main.from;
}
function ensureAnchor(expr, start) {
  var _a;
  let { source } = expr;
  let addStart = start && source[0] != "^", addEnd = source[source.length - 1] != "$";
  if (!addStart && !addEnd)
    return expr;
  return new RegExp(`${addStart ? "^" : ""}(?:${source})${addEnd ? "$" : ""}`, (_a = expr.flags) !== null && _a !== void 0 ? _a : expr.ignoreCase ? "i" : "");
}
var pickedCompletion = /* @__PURE__ */ import_state.Annotation.define();
function insertCompletionText(state, text, from, to) {
  let { main } = state.selection, fromOff = from - main.from, toOff = to - main.from;
  return {
    ...state.changeByRange((range) => {
      if (range != main && from != to && state.sliceDoc(range.from + fromOff, range.from + toOff) != state.sliceDoc(from, to))
        return { range };
      let lines = state.toText(text);
      return {
        changes: { from: range.from + fromOff, to: to == main.from ? range.to : range.from + toOff, insert: lines },
        range: import_state.EditorSelection.cursor(range.from + fromOff + lines.length)
      };
    }),
    scrollIntoView: true,
    userEvent: "input.complete"
  };
}
var SourceCache = /* @__PURE__ */ new WeakMap();
function asSource(source) {
  if (!Array.isArray(source))
    return source;
  let known = SourceCache.get(source);
  if (!known)
    SourceCache.set(source, known = completeFromList(source));
  return known;
}
var startCompletionEffect = /* @__PURE__ */ import_state.StateEffect.define();
var closeCompletionEffect = /* @__PURE__ */ import_state.StateEffect.define();
var FuzzyMatcher = class {
  constructor(pattern) {
    this.pattern = pattern;
    this.chars = [];
    this.folded = [];
    this.any = [];
    this.precise = [];
    this.byWord = [];
    this.score = 0;
    this.matched = [];
    for (let p = 0; p < pattern.length; ) {
      let char = (0, import_state.codePointAt)(pattern, p), size = (0, import_state.codePointSize)(char);
      this.chars.push(char);
      let part = pattern.slice(p, p + size), upper = part.toUpperCase();
      this.folded.push((0, import_state.codePointAt)(upper == part ? part.toLowerCase() : upper, 0));
      p += size;
    }
    this.astral = pattern.length != this.chars.length;
  }
  ret(score2, matched) {
    this.score = score2;
    this.matched = matched;
    return this;
  }
  // Matches a given word (completion) against the pattern (input).
  // Will return a boolean indicating whether there was a match and,
  // on success, set `this.score` to the score, `this.matched` to an
  // array of `from, to` pairs indicating the matched parts of `word`.
  //
  // The score is a number that is more negative the worse the match
  // is. See `Penalty` above.
  match(word) {
    if (this.pattern.length == 0)
      return this.ret(-100, []);
    if (word.length < this.pattern.length)
      return null;
    let { chars, folded, any, precise, byWord } = this;
    if (chars.length == 1) {
      let first = (0, import_state.codePointAt)(word, 0), firstSize = (0, import_state.codePointSize)(first);
      let score2 = firstSize == word.length ? 0 : -100;
      if (first == chars[0]) ;
      else if (first == folded[0])
        score2 += -200;
      else
        return null;
      return this.ret(score2, [0, firstSize]);
    }
    let direct = word.indexOf(this.pattern);
    if (direct == 0)
      return this.ret(word.length == this.pattern.length ? 0 : -100, [0, this.pattern.length]);
    let len = chars.length, anyTo = 0;
    if (direct < 0) {
      for (let i = 0, e = Math.min(word.length, 200); i < e && anyTo < len; ) {
        let next = (0, import_state.codePointAt)(word, i);
        if (next == chars[anyTo] || next == folded[anyTo])
          any[anyTo++] = i;
        i += (0, import_state.codePointSize)(next);
      }
      if (anyTo < len)
        return null;
    }
    let preciseTo = 0;
    let byWordTo = 0, byWordFolded = false;
    let adjacentTo = 0, adjacentStart = -1, adjacentEnd = -1;
    let hasLower = /[a-z]/.test(word), wordAdjacent = true;
    for (let i = 0, e = Math.min(word.length, 200), prevType = 0; i < e && byWordTo < len; ) {
      let next = (0, import_state.codePointAt)(word, i);
      if (direct < 0) {
        if (preciseTo < len && next == chars[preciseTo])
          precise[preciseTo++] = i;
        if (adjacentTo < len) {
          if (next == chars[adjacentTo] || next == folded[adjacentTo]) {
            if (adjacentTo == 0)
              adjacentStart = i;
            adjacentEnd = i + 1;
            adjacentTo++;
          } else {
            adjacentTo = 0;
          }
        }
      }
      let ch, type = next < 255 ? next >= 48 && next <= 57 || next >= 97 && next <= 122 ? 2 : next >= 65 && next <= 90 ? 1 : 0 : (ch = (0, import_state.fromCodePoint)(next)) != ch.toLowerCase() ? 1 : ch != ch.toUpperCase() ? 2 : 0;
      if (!i || type == 1 && hasLower || prevType == 0 && type != 0) {
        if (chars[byWordTo] == next || folded[byWordTo] == next && (byWordFolded = true))
          byWord[byWordTo++] = i;
        else if (byWord.length)
          wordAdjacent = false;
      }
      prevType = type;
      i += (0, import_state.codePointSize)(next);
    }
    if (byWordTo == len && byWord[0] == 0 && wordAdjacent)
      return this.result(-100 + (byWordFolded ? -200 : 0), byWord, word);
    if (adjacentTo == len && adjacentStart == 0)
      return this.ret(-200 - word.length + (adjacentEnd == word.length ? 0 : -100), [0, adjacentEnd]);
    if (direct > -1)
      return this.ret(-700 - word.length, [direct, direct + this.pattern.length]);
    if (adjacentTo == len)
      return this.ret(-200 + -700 - word.length, [adjacentStart, adjacentEnd]);
    if (byWordTo == len)
      return this.result(-100 + (byWordFolded ? -200 : 0) + -700 + (wordAdjacent ? 0 : -1100), byWord, word);
    return chars.length == 2 ? null : this.result((any[0] ? -700 : 0) + -200 + -1100, any, word);
  }
  result(score2, positions, word) {
    let result = [], i = 0;
    for (let pos of positions) {
      let to = pos + (this.astral ? (0, import_state.codePointSize)((0, import_state.codePointAt)(word, pos)) : 1);
      if (i && result[i - 1] == pos)
        result[i - 1] = to;
      else {
        result[i++] = pos;
        result[i++] = to;
      }
    }
    return this.ret(score2 - word.length, result);
  }
};
var StrictMatcher = class {
  constructor(pattern) {
    this.pattern = pattern;
    this.matched = [];
    this.score = 0;
    this.folded = pattern.toLowerCase();
  }
  match(word) {
    if (word.length < this.pattern.length)
      return null;
    let start = word.slice(0, this.pattern.length);
    let match = start == this.pattern ? 0 : start.toLowerCase() == this.folded ? -200 : null;
    if (match == null)
      return null;
    this.matched = [0, start.length];
    this.score = match + (word.length == this.pattern.length ? 0 : -100);
    return this;
  }
};
var completionConfig = /* @__PURE__ */ import_state.Facet.define({
  combine(configs) {
    return (0, import_state.combineConfig)(configs, {
      activateOnTyping: true,
      activateOnCompletion: () => false,
      activateOnTypingDelay: 100,
      selectOnOpen: true,
      override: null,
      closeOnBlur: true,
      maxRenderedOptions: 100,
      defaultKeymap: true,
      tooltipClass: () => "",
      optionClass: () => "",
      aboveCursor: false,
      icons: true,
      addToOptions: [],
      positionInfo: defaultPositionInfo,
      filterStrict: false,
      compareCompletions: (a, b) => (a.sortText || a.label).localeCompare(b.sortText || b.label),
      interactionDelay: 75,
      updateSyncTime: 100
    }, {
      defaultKeymap: (a, b) => a && b,
      closeOnBlur: (a, b) => a && b,
      icons: (a, b) => a && b,
      tooltipClass: (a, b) => (c) => joinClass(a(c), b(c)),
      optionClass: (a, b) => (c) => joinClass(a(c), b(c)),
      addToOptions: (a, b) => a.concat(b),
      filterStrict: (a, b) => a || b
    });
  }
});
function joinClass(a, b) {
  return a ? b ? a + " " + b : a : b;
}
function defaultPositionInfo(view, list, option, info, space, tooltip) {
  let rtl = view.textDirection == import_view.Direction.RTL, left = rtl, narrow = false;
  let side = "top", offset, maxWidth;
  let spaceLeft = list.left - space.left, spaceRight = space.right - list.right;
  let infoWidth = info.right - info.left, infoHeight = info.bottom - info.top;
  if (left && spaceLeft < Math.min(infoWidth, spaceRight))
    left = false;
  else if (!left && spaceRight < Math.min(infoWidth, spaceLeft))
    left = true;
  if (infoWidth <= (left ? spaceLeft : spaceRight)) {
    offset = Math.max(space.top, Math.min(option.top, space.bottom - infoHeight)) - list.top;
    maxWidth = Math.min(400, left ? spaceLeft : spaceRight);
  } else {
    narrow = true;
    maxWidth = Math.min(
      400,
      (rtl ? list.right : space.right - list.left) - 30
      /* Info.Margin */
    );
    let spaceBelow = space.bottom - list.bottom;
    if (spaceBelow >= infoHeight || spaceBelow > list.top) {
      offset = option.bottom - list.top;
    } else {
      side = "bottom";
      offset = list.bottom - option.top;
    }
  }
  let scaleY = (list.bottom - list.top) / tooltip.offsetHeight;
  let scaleX = (list.right - list.left) / tooltip.offsetWidth;
  return {
    style: `${side}: ${offset / scaleY}px; max-width: ${maxWidth / scaleX}px`,
    class: "cm-completionInfo-" + (narrow ? rtl ? "left-narrow" : "right-narrow" : left ? "left" : "right")
  };
}
function optionContent(config) {
  let content = config.addToOptions.slice();
  if (config.icons)
    content.push({
      render(completion) {
        let icon = document.createElement("div");
        icon.classList.add("cm-completionIcon");
        if (completion.type)
          icon.classList.add(...completion.type.split(/\s+/g).map((cls) => "cm-completionIcon-" + cls));
        icon.setAttribute("aria-hidden", "true");
        return icon;
      },
      position: 20
    });
  content.push({
    render(completion, _s, _v, match) {
      let labelElt = document.createElement("span");
      labelElt.className = "cm-completionLabel";
      let label = completion.displayLabel || completion.label, off = 0;
      for (let j = 0; j < match.length; ) {
        let from = match[j++], to = match[j++];
        if (from > off)
          labelElt.appendChild(document.createTextNode(label.slice(off, from)));
        let span = labelElt.appendChild(document.createElement("span"));
        span.appendChild(document.createTextNode(label.slice(from, to)));
        span.className = "cm-completionMatchedText";
        off = to;
      }
      if (off < label.length)
        labelElt.appendChild(document.createTextNode(label.slice(off)));
      return labelElt;
    },
    position: 50
  }, {
    render(completion) {
      if (!completion.detail)
        return null;
      let detailElt = document.createElement("span");
      detailElt.className = "cm-completionDetail";
      detailElt.textContent = completion.detail;
      return detailElt;
    },
    position: 80
  });
  return content.sort((a, b) => a.position - b.position).map((a) => a.render);
}
function rangeAroundSelected(total, selected, max) {
  if (total <= max)
    return { from: 0, to: total };
  if (selected < 0)
    selected = 0;
  if (selected <= total >> 1) {
    let off2 = Math.floor(selected / max);
    return { from: off2 * max, to: (off2 + 1) * max };
  }
  let off = Math.floor((total - selected) / max);
  return { from: total - (off + 1) * max, to: total - off * max };
}
var CompletionTooltip = class {
  constructor(view, stateField, applyCompletion2) {
    this.view = view;
    this.stateField = stateField;
    this.applyCompletion = applyCompletion2;
    this.info = null;
    this.infoDestroy = null;
    this.placeInfoReq = {
      read: () => this.measureInfo(),
      write: (pos) => this.placeInfo(pos),
      key: this
    };
    this.space = null;
    this.currentClass = "";
    let cState = view.state.field(stateField);
    let { options, selected } = cState.open;
    let config = view.state.facet(completionConfig);
    this.optionContent = optionContent(config);
    this.optionClass = config.optionClass;
    this.tooltipClass = config.tooltipClass;
    this.range = rangeAroundSelected(options.length, selected, config.maxRenderedOptions);
    this.dom = document.createElement("div");
    this.dom.className = "cm-tooltip-autocomplete";
    this.updateTooltipClass(view.state);
    this.dom.addEventListener("mousedown", (e) => {
      let { options: options2 } = view.state.field(stateField).open;
      for (let dom = e.target, match; dom && dom != this.dom; dom = dom.parentNode) {
        if (dom.nodeName == "LI" && (match = /-(\d+)$/.exec(dom.id)) && +match[1] < options2.length) {
          this.applyCompletion(view, options2[+match[1]]);
          e.preventDefault();
          return;
        }
      }
    });
    this.dom.addEventListener("focusout", (e) => {
      let state = view.state.field(this.stateField, false);
      if (state && state.tooltip && view.state.facet(completionConfig).closeOnBlur && e.relatedTarget != view.contentDOM)
        view.dispatch({ effects: closeCompletionEffect.of(null) });
    });
    this.showOptions(options, cState.id);
  }
  mount() {
    this.updateSel();
  }
  showOptions(options, id) {
    if (this.list)
      this.list.remove();
    this.list = this.dom.appendChild(this.createListBox(options, id, this.range));
    this.list.addEventListener("scroll", () => {
      if (this.info)
        this.view.requestMeasure(this.placeInfoReq);
    });
  }
  update(update) {
    var _a;
    let cState = update.state.field(this.stateField);
    let prevState = update.startState.field(this.stateField);
    this.updateTooltipClass(update.state);
    if (cState != prevState) {
      let { options, selected, disabled } = cState.open;
      if (!prevState.open || prevState.open.options != options) {
        this.range = rangeAroundSelected(options.length, selected, update.state.facet(completionConfig).maxRenderedOptions);
        this.showOptions(options, cState.id);
      }
      this.updateSel();
      if (disabled != ((_a = prevState.open) === null || _a === void 0 ? void 0 : _a.disabled))
        this.dom.classList.toggle("cm-tooltip-autocomplete-disabled", !!disabled);
    }
  }
  updateTooltipClass(state) {
    let cls = this.tooltipClass(state);
    if (cls != this.currentClass) {
      for (let c of this.currentClass.split(" "))
        if (c)
          this.dom.classList.remove(c);
      for (let c of cls.split(" "))
        if (c)
          this.dom.classList.add(c);
      this.currentClass = cls;
    }
  }
  positioned(space) {
    this.space = space;
    if (this.info)
      this.view.requestMeasure(this.placeInfoReq);
  }
  updateSel() {
    let cState = this.view.state.field(this.stateField), open = cState.open;
    if (open.selected > -1 && open.selected < this.range.from || open.selected >= this.range.to) {
      this.range = rangeAroundSelected(open.options.length, open.selected, this.view.state.facet(completionConfig).maxRenderedOptions);
      this.showOptions(open.options, cState.id);
    }
    let newSel = this.updateSelectedOption(open.selected);
    if (newSel) {
      this.destroyInfo();
      let { completion } = open.options[open.selected];
      let { info } = completion;
      if (!info)
        return;
      let infoResult = typeof info === "string" ? document.createTextNode(info) : info(completion);
      if (!infoResult)
        return;
      if ("then" in infoResult) {
        infoResult.then((obj) => {
          if (obj && this.view.state.field(this.stateField, false) == cState)
            this.addInfoPane(obj, completion);
        }).catch((e) => (0, import_view.logException)(this.view.state, e, "completion info"));
      } else {
        this.addInfoPane(infoResult, completion);
        newSel.setAttribute("aria-describedby", this.info.id);
      }
    }
  }
  addInfoPane(content, completion) {
    this.destroyInfo();
    let wrap = this.info = document.createElement("div");
    wrap.className = "cm-tooltip cm-completionInfo";
    wrap.id = "cm-completionInfo-" + Math.floor(Math.random() * 65535).toString(16);
    if (content.nodeType != null) {
      wrap.appendChild(content);
      this.infoDestroy = null;
    } else {
      let { dom, destroy } = content;
      wrap.appendChild(dom);
      this.infoDestroy = destroy || null;
    }
    this.dom.appendChild(wrap);
    this.view.requestMeasure(this.placeInfoReq);
  }
  updateSelectedOption(selected) {
    let set = null;
    for (let opt = this.list.firstChild, i = this.range.from; opt; opt = opt.nextSibling, i++) {
      if (opt.nodeName != "LI" || !opt.id) {
        i--;
      } else if (i == selected) {
        if (!opt.hasAttribute("aria-selected")) {
          opt.setAttribute("aria-selected", "true");
          set = opt;
        }
      } else {
        if (opt.hasAttribute("aria-selected")) {
          opt.removeAttribute("aria-selected");
          opt.removeAttribute("aria-describedby");
        }
      }
    }
    if (set)
      scrollIntoView(this.list, set);
    return set;
  }
  measureInfo() {
    let sel = this.dom.querySelector("[aria-selected]");
    if (!sel || !this.info)
      return null;
    let listRect = this.dom.getBoundingClientRect();
    let infoRect = this.info.getBoundingClientRect();
    let selRect = sel.getBoundingClientRect();
    let space = this.space;
    if (!space) {
      let docElt = this.dom.ownerDocument.documentElement;
      space = { left: 0, top: 0, right: docElt.clientWidth, bottom: docElt.clientHeight };
    }
    if (selRect.top > Math.min(space.bottom, listRect.bottom) - 10 || selRect.bottom < Math.max(space.top, listRect.top) + 10)
      return null;
    return this.view.state.facet(completionConfig).positionInfo(this.view, listRect, selRect, infoRect, space, this.dom);
  }
  placeInfo(pos) {
    if (this.info) {
      if (pos) {
        if (pos.style)
          this.info.style.cssText = pos.style;
        this.info.className = "cm-tooltip cm-completionInfo " + (pos.class || "");
      } else {
        this.info.style.cssText = "top: -1e6px";
      }
    }
  }
  createListBox(options, id, range) {
    const ul = document.createElement("ul");
    ul.id = id;
    ul.setAttribute("role", "listbox");
    ul.setAttribute("aria-expanded", "true");
    ul.setAttribute("aria-label", this.view.state.phrase("Completions"));
    ul.addEventListener("mousedown", (e) => {
      if (e.target == ul)
        e.preventDefault();
    });
    let curSection = null;
    for (let i = range.from; i < range.to; i++) {
      let { completion, match } = options[i], { section } = completion;
      if (section) {
        let name = typeof section == "string" ? section : section.name;
        if (name != curSection && (i > range.from || range.from == 0)) {
          curSection = name;
          if (typeof section != "string" && section.header) {
            ul.appendChild(section.header(section));
          } else {
            let header = ul.appendChild(document.createElement("completion-section"));
            header.textContent = name;
          }
        }
      }
      const li = ul.appendChild(document.createElement("li"));
      li.id = id + "-" + i;
      li.setAttribute("role", "option");
      let cls = this.optionClass(completion);
      if (cls)
        li.className = cls;
      for (let source of this.optionContent) {
        let node = source(completion, this.view.state, this.view, match);
        if (node)
          li.appendChild(node);
      }
    }
    if (range.from)
      ul.classList.add("cm-completionListIncompleteTop");
    if (range.to < options.length)
      ul.classList.add("cm-completionListIncompleteBottom");
    return ul;
  }
  destroyInfo() {
    if (this.info) {
      if (this.infoDestroy)
        this.infoDestroy();
      this.info.remove();
      this.info = null;
    }
  }
  destroy() {
    this.destroyInfo();
  }
};
function completionTooltip(stateField, applyCompletion2) {
  return (view) => new CompletionTooltip(view, stateField, applyCompletion2);
}
function scrollIntoView(container, element) {
  let parent = container.getBoundingClientRect();
  let self = element.getBoundingClientRect();
  let scaleY = parent.height / container.offsetHeight;
  if (self.top < parent.top)
    container.scrollTop -= (parent.top - self.top) / scaleY;
  else if (self.bottom > parent.bottom)
    container.scrollTop += (self.bottom - parent.bottom) / scaleY;
}
function score(option) {
  return (option.boost || 0) * 100 + (option.apply ? 10 : 0) + (option.info ? 5 : 0) + (option.type ? 1 : 0);
}
function sortOptions(active, state) {
  let options = [];
  let sections = null, dynamicSectionScore = null;
  let addOption = (option) => {
    options.push(option);
    let { section } = option.completion;
    if (section) {
      if (!sections)
        sections = [];
      let name = typeof section == "string" ? section : section.name;
      if (!sections.some((s) => s.name == name))
        sections.push(typeof section == "string" ? { name } : section);
    }
  };
  let conf = state.facet(completionConfig);
  for (let a of active)
    if (a.hasResult()) {
      let getMatch = a.result.getMatch;
      if (a.result.filter === false) {
        for (let option of a.result.options) {
          addOption(new Option(option, a.source, getMatch ? getMatch(option) : [], 1e9 - options.length));
        }
      } else {
        let pattern = state.sliceDoc(a.from, a.to), match;
        let matcher = conf.filterStrict ? new StrictMatcher(pattern) : new FuzzyMatcher(pattern);
        for (let option of a.result.options)
          if (match = matcher.match(option.label)) {
            let matched = !option.displayLabel ? match.matched : getMatch ? getMatch(option, match.matched) : [];
            let score2 = match.score + (option.boost || 0);
            addOption(new Option(option, a.source, matched, score2));
            if (typeof option.section == "object" && option.section.rank === "dynamic") {
              let { name } = option.section;
              if (!dynamicSectionScore)
                dynamicSectionScore = /* @__PURE__ */ Object.create(null);
              dynamicSectionScore[name] = Math.max(score2, dynamicSectionScore[name] || -1e9);
            }
          }
      }
    }
  if (sections) {
    let sectionOrder = /* @__PURE__ */ Object.create(null), pos = 0;
    let cmp = (a, b) => {
      return (a.rank === "dynamic" && b.rank === "dynamic" ? dynamicSectionScore[b.name] - dynamicSectionScore[a.name] : 0) || (typeof a.rank == "number" ? a.rank : 1e9) - (typeof b.rank == "number" ? b.rank : 1e9) || (a.name < b.name ? -1 : 1);
    };
    for (let s of sections.sort(cmp)) {
      pos -= 1e5;
      sectionOrder[s.name] = pos;
    }
    for (let option of options) {
      let { section } = option.completion;
      if (section)
        option.score += sectionOrder[typeof section == "string" ? section : section.name];
    }
  }
  let result = [], prev = null;
  let compare = conf.compareCompletions;
  for (let opt of options.sort((a, b) => b.score - a.score || compare(a.completion, b.completion))) {
    let cur2 = opt.completion;
    if (!prev || prev.label != cur2.label || prev.detail != cur2.detail || prev.type != null && cur2.type != null && prev.type != cur2.type || prev.apply != cur2.apply || prev.boost != cur2.boost)
      result.push(opt);
    else if (score(opt.completion) > score(prev))
      result[result.length - 1] = opt;
    prev = opt.completion;
  }
  return result;
}
var CompletionDialog = class _CompletionDialog {
  constructor(options, attrs, tooltip, timestamp, selected, disabled) {
    this.options = options;
    this.attrs = attrs;
    this.tooltip = tooltip;
    this.timestamp = timestamp;
    this.selected = selected;
    this.disabled = disabled;
  }
  setSelected(selected, id) {
    return selected == this.selected || selected >= this.options.length ? this : new _CompletionDialog(this.options, makeAttrs(id, selected), this.tooltip, this.timestamp, selected, this.disabled);
  }
  static build(active, state, id, prev, conf, didSetActive) {
    if (prev && !didSetActive && active.some((s) => s.isPending))
      return prev.setDisabled();
    let options = sortOptions(active, state);
    if (!options.length)
      return prev && active.some((a) => a.isPending) ? prev.setDisabled() : null;
    let selected = state.facet(completionConfig).selectOnOpen ? 0 : -1;
    if (prev && prev.selected != selected && prev.selected != -1) {
      let selectedValue = prev.options[prev.selected].completion;
      for (let i = 0; i < options.length; i++)
        if (options[i].completion == selectedValue) {
          selected = i;
          break;
        }
    }
    return new _CompletionDialog(options, makeAttrs(id, selected), {
      pos: active.reduce((a, b) => b.hasResult() ? Math.min(a, b.from) : a, 1e8),
      create: createTooltip,
      above: conf.aboveCursor
    }, prev ? prev.timestamp : Date.now(), selected, false);
  }
  map(changes) {
    return new _CompletionDialog(this.options, this.attrs, { ...this.tooltip, pos: changes.mapPos(this.tooltip.pos) }, this.timestamp, this.selected, this.disabled);
  }
  setDisabled() {
    return new _CompletionDialog(this.options, this.attrs, this.tooltip, this.timestamp, this.selected, true);
  }
};
var CompletionState = class _CompletionState {
  constructor(active, id, open) {
    this.active = active;
    this.id = id;
    this.open = open;
  }
  static start() {
    return new _CompletionState(none, "cm-ac-" + Math.floor(Math.random() * 2e6).toString(36), null);
  }
  update(tr) {
    let { state } = tr, conf = state.facet(completionConfig);
    let sources = conf.override || state.languageDataAt("autocomplete", cur(state)).map(asSource);
    let active = sources.map((source) => {
      let value = this.active.find((s) => s.source == source) || new ActiveSource(
        source,
        this.active.some(
          (a) => a.state != 0
          /* State.Inactive */
        ) ? 1 : 0
        /* State.Inactive */
      );
      return value.update(tr, conf);
    });
    if (active.length == this.active.length && active.every((a, i) => a == this.active[i]))
      active = this.active;
    let open = this.open, didSet = tr.effects.some((e) => e.is(setActiveEffect));
    if (open && tr.docChanged)
      open = open.map(tr.changes);
    if (tr.selection || active.some((a) => a.hasResult() && tr.changes.touchesRange(a.from, a.to)) || !sameResults(active, this.active) || didSet)
      open = CompletionDialog.build(active, state, this.id, open, conf, didSet);
    else if (open && open.disabled && !active.some((a) => a.isPending))
      open = null;
    if (!open && active.every((a) => !a.isPending) && active.some((a) => a.hasResult()))
      active = active.map((a) => a.hasResult() ? new ActiveSource(
        a.source,
        0
        /* State.Inactive */
      ) : a);
    for (let effect of tr.effects)
      if (effect.is(setSelectedEffect))
        open = open && open.setSelected(effect.value, this.id);
    return active == this.active && open == this.open ? this : new _CompletionState(active, this.id, open);
  }
  get tooltip() {
    return this.open ? this.open.tooltip : null;
  }
  get attrs() {
    return this.open ? this.open.attrs : this.active.length ? baseAttrs : noAttrs;
  }
};
function sameResults(a, b) {
  if (a == b)
    return true;
  for (let iA = 0, iB = 0; ; ) {
    while (iA < a.length && !a[iA].hasResult())
      iA++;
    while (iB < b.length && !b[iB].hasResult())
      iB++;
    let endA = iA == a.length, endB = iB == b.length;
    if (endA || endB)
      return endA == endB;
    if (a[iA++].result != b[iB++].result)
      return false;
  }
}
var baseAttrs = {
  "aria-autocomplete": "list"
};
var noAttrs = {};
function makeAttrs(id, selected) {
  let result = {
    "aria-autocomplete": "list",
    "aria-haspopup": "listbox",
    "aria-controls": id
  };
  if (selected > -1)
    result["aria-activedescendant"] = id + "-" + selected;
  return result;
}
var none = [];
function getUpdateType(tr, conf) {
  if (tr.isUserEvent("input.complete")) {
    let completion = tr.annotation(pickedCompletion);
    if (completion && conf.activateOnCompletion(completion))
      return 4 | 8;
  }
  let typing = tr.isUserEvent("input.type");
  return typing && conf.activateOnTyping ? 4 | 1 : typing ? 1 : tr.isUserEvent("delete.backward") ? 2 : tr.selection ? 8 : tr.docChanged ? 16 : 0;
}
var ActiveSource = class _ActiveSource {
  constructor(source, state, explicit = false) {
    this.source = source;
    this.state = state;
    this.explicit = explicit;
  }
  hasResult() {
    return false;
  }
  get isPending() {
    return this.state == 1;
  }
  update(tr, conf) {
    let type = getUpdateType(tr, conf), value = this;
    if (type & 8 || type & 16 && this.touches(tr))
      value = new _ActiveSource(
        value.source,
        0
        /* State.Inactive */
      );
    if (type & 4 && value.state == 0)
      value = new _ActiveSource(
        this.source,
        1
        /* State.Pending */
      );
    value = value.updateFor(tr, type);
    for (let effect of tr.effects) {
      if (effect.is(startCompletionEffect))
        value = new _ActiveSource(value.source, 1, effect.value);
      else if (effect.is(closeCompletionEffect))
        value = new _ActiveSource(
          value.source,
          0
          /* State.Inactive */
        );
      else if (effect.is(setActiveEffect)) {
        for (let active of effect.value)
          if (active.source == value.source)
            value = active;
      }
    }
    return value;
  }
  updateFor(tr, type) {
    return this.map(tr.changes);
  }
  map(changes) {
    return this;
  }
  touches(tr) {
    return tr.changes.touchesRange(cur(tr.state));
  }
};
var ActiveResult = class _ActiveResult extends ActiveSource {
  constructor(source, explicit, limit, result, from, to) {
    super(source, 3, explicit);
    this.limit = limit;
    this.result = result;
    this.from = from;
    this.to = to;
  }
  hasResult() {
    return true;
  }
  updateFor(tr, type) {
    var _a;
    if (!(type & 3))
      return this.map(tr.changes);
    let result = this.result;
    if (result.map && !tr.changes.empty)
      result = result.map(result, tr.changes);
    let from = tr.changes.mapPos(this.from), to = tr.changes.mapPos(this.to, 1);
    let pos = cur(tr.state);
    if (pos > to || !result || type & 2 && (cur(tr.startState) == this.from || pos < this.limit))
      return new ActiveSource(
        this.source,
        type & 4 ? 1 : 0
        /* State.Inactive */
      );
    let limit = tr.changes.mapPos(this.limit);
    if (checkValid(result.validFor, tr.state, from, to))
      return new _ActiveResult(this.source, this.explicit, limit, result, from, to);
    if (result.update && (result = result.update(result, from, to, new CompletionContext(tr.state, pos, false))))
      return new _ActiveResult(this.source, this.explicit, limit, result, result.from, (_a = result.to) !== null && _a !== void 0 ? _a : cur(tr.state));
    return new ActiveSource(this.source, 1, this.explicit);
  }
  map(mapping) {
    if (mapping.empty)
      return this;
    let result = this.result.map ? this.result.map(this.result, mapping) : this.result;
    if (!result)
      return new ActiveSource(
        this.source,
        0
        /* State.Inactive */
      );
    return new _ActiveResult(this.source, this.explicit, mapping.mapPos(this.limit), this.result, mapping.mapPos(this.from), mapping.mapPos(this.to, 1));
  }
  touches(tr) {
    return tr.changes.touchesRange(this.from, this.to);
  }
};
function checkValid(validFor, state, from, to) {
  if (!validFor)
    return false;
  let text = state.sliceDoc(from, to);
  return typeof validFor == "function" ? validFor(text, from, to, state) : ensureAnchor(validFor, true).test(text);
}
var setActiveEffect = /* @__PURE__ */ import_state.StateEffect.define({
  map(sources, mapping) {
    return sources.map((s) => s.map(mapping));
  }
});
var setSelectedEffect = /* @__PURE__ */ import_state.StateEffect.define();
var completionState = /* @__PURE__ */ import_state.StateField.define({
  create() {
    return CompletionState.start();
  },
  update(value, tr) {
    return value.update(tr);
  },
  provide: (f) => [
    import_view.showTooltip.from(f, (val) => val.tooltip),
    import_view.EditorView.contentAttributes.from(f, (state) => state.attrs)
  ]
});
function applyCompletion(view, option) {
  const apply = option.completion.apply || option.completion.label;
  let result = view.state.field(completionState).active.find((a) => a.source == option.source);
  if (!(result instanceof ActiveResult))
    return false;
  if (typeof apply == "string")
    view.dispatch({
      ...insertCompletionText(view.state, apply, result.from, result.to),
      annotations: pickedCompletion.of(option.completion)
    });
  else
    apply(view, option.completion, result.from, result.to);
  return true;
}
var createTooltip = /* @__PURE__ */ completionTooltip(completionState, applyCompletion);
function moveCompletionSelection(forward, by = "option") {
  return (view) => {
    let cState = view.state.field(completionState, false);
    if (!cState || !cState.open || cState.open.disabled || Date.now() - cState.open.timestamp < view.state.facet(completionConfig).interactionDelay)
      return false;
    let step = 1, tooltip;
    if (by == "page" && (tooltip = (0, import_view.getTooltip)(view, cState.open.tooltip)))
      step = Math.max(2, Math.floor(tooltip.dom.offsetHeight / tooltip.dom.querySelector("li").offsetHeight) - 1);
    let { length } = cState.open.options;
    let selected = cState.open.selected > -1 ? cState.open.selected + step * (forward ? 1 : -1) : forward ? 0 : length - 1;
    if (selected < 0)
      selected = by == "page" ? 0 : length - 1;
    else if (selected >= length)
      selected = by == "page" ? length - 1 : 0;
    view.dispatch({ effects: setSelectedEffect.of(selected) });
    return true;
  };
}
var acceptCompletion = (view) => {
  let cState = view.state.field(completionState, false);
  if (view.state.readOnly || !cState || !cState.open || cState.open.selected < 0 || cState.open.disabled || Date.now() - cState.open.timestamp < view.state.facet(completionConfig).interactionDelay)
    return false;
  return applyCompletion(view, cState.open.options[cState.open.selected]);
};
var startCompletion = (view) => {
  let cState = view.state.field(completionState, false);
  if (!cState)
    return false;
  view.dispatch({ effects: startCompletionEffect.of(true) });
  return true;
};
var closeCompletion = (view) => {
  let cState = view.state.field(completionState, false);
  if (!cState || !cState.active.some(
    (a) => a.state != 0
    /* State.Inactive */
  ))
    return false;
  view.dispatch({ effects: closeCompletionEffect.of(null) });
  return true;
};
var RunningQuery = class {
  constructor(active, context) {
    this.active = active;
    this.context = context;
    this.time = Date.now();
    this.updates = [];
    this.done = void 0;
  }
};
var MaxUpdateCount = 50;
var MinAbortTime = 1e3;
var completionPlugin = /* @__PURE__ */ import_view.ViewPlugin.fromClass(class {
  constructor(view) {
    this.view = view;
    this.debounceUpdate = -1;
    this.running = [];
    this.debounceAccept = -1;
    this.pendingStart = false;
    this.composing = 0;
    for (let active of view.state.field(completionState).active)
      if (active.isPending)
        this.startQuery(active);
  }
  update(update) {
    let cState = update.state.field(completionState);
    let conf = update.state.facet(completionConfig);
    if (!update.selectionSet && !update.docChanged && update.startState.field(completionState) == cState)
      return;
    let doesReset = update.transactions.some((tr) => {
      let type = getUpdateType(tr, conf);
      return type & 8 || (tr.selection || tr.docChanged) && !(type & 3);
    });
    for (let i = 0; i < this.running.length; i++) {
      let query = this.running[i];
      if (doesReset || query.context.abortOnDocChange && update.docChanged || query.updates.length + update.transactions.length > MaxUpdateCount && Date.now() - query.time > MinAbortTime) {
        for (let handler of query.context.abortListeners) {
          try {
            handler();
          } catch (e) {
            (0, import_view.logException)(this.view.state, e);
          }
        }
        query.context.abortListeners = null;
        this.running.splice(i--, 1);
      } else {
        query.updates.push(...update.transactions);
      }
    }
    if (this.debounceUpdate > -1)
      clearTimeout(this.debounceUpdate);
    if (update.transactions.some((tr) => tr.effects.some((e) => e.is(startCompletionEffect))))
      this.pendingStart = true;
    let delay = this.pendingStart ? 50 : conf.activateOnTypingDelay;
    this.debounceUpdate = cState.active.some((a) => a.isPending && !this.running.some((q) => q.active.source == a.source)) ? setTimeout(() => this.startUpdate(), delay) : -1;
    if (this.composing != 0)
      for (let tr of update.transactions) {
        if (tr.isUserEvent("input.type"))
          this.composing = 2;
        else if (this.composing == 2 && tr.selection)
          this.composing = 3;
      }
  }
  startUpdate() {
    this.debounceUpdate = -1;
    this.pendingStart = false;
    let { state } = this.view, cState = state.field(completionState);
    for (let active of cState.active) {
      if (active.isPending && !this.running.some((r) => r.active.source == active.source))
        this.startQuery(active);
    }
    if (this.running.length && cState.open && cState.open.disabled)
      this.debounceAccept = setTimeout(() => this.accept(), this.view.state.facet(completionConfig).updateSyncTime);
  }
  startQuery(active) {
    let { state } = this.view, pos = cur(state);
    let context = new CompletionContext(state, pos, active.explicit, this.view);
    let pending = new RunningQuery(active, context);
    this.running.push(pending);
    Promise.resolve(active.source(context)).then((result) => {
      if (!pending.context.aborted) {
        pending.done = result || null;
        this.scheduleAccept();
      }
    }, (err) => {
      this.view.dispatch({ effects: closeCompletionEffect.of(null) });
      (0, import_view.logException)(this.view.state, err);
    });
  }
  scheduleAccept() {
    if (this.running.every((q) => q.done !== void 0))
      this.accept();
    else if (this.debounceAccept < 0)
      this.debounceAccept = setTimeout(() => this.accept(), this.view.state.facet(completionConfig).updateSyncTime);
  }
  // For each finished query in this.running, try to create a result
  // or, if appropriate, restart the query.
  accept() {
    var _a;
    if (this.debounceAccept > -1)
      clearTimeout(this.debounceAccept);
    this.debounceAccept = -1;
    let updated = [];
    let conf = this.view.state.facet(completionConfig), cState = this.view.state.field(completionState);
    for (let i = 0; i < this.running.length; i++) {
      let query = this.running[i];
      if (query.done === void 0)
        continue;
      this.running.splice(i--, 1);
      if (query.done) {
        let pos = cur(query.updates.length ? query.updates[0].startState : this.view.state);
        let limit = Math.min(pos, query.done.from + (query.active.explicit ? 0 : 1));
        let active = new ActiveResult(query.active.source, query.active.explicit, limit, query.done, query.done.from, (_a = query.done.to) !== null && _a !== void 0 ? _a : pos);
        for (let tr of query.updates)
          active = active.update(tr, conf);
        if (active.hasResult()) {
          updated.push(active);
          continue;
        }
      }
      let current = cState.active.find((a) => a.source == query.active.source);
      if (current && current.isPending) {
        if (query.done == null) {
          let active = new ActiveSource(
            query.active.source,
            0
            /* State.Inactive */
          );
          for (let tr of query.updates)
            active = active.update(tr, conf);
          if (!active.isPending)
            updated.push(active);
        } else {
          this.startQuery(current);
        }
      }
    }
    if (updated.length || cState.open && cState.open.disabled)
      this.view.dispatch({ effects: setActiveEffect.of(updated) });
  }
}, {
  eventHandlers: {
    blur(event) {
      let state = this.view.state.field(completionState, false);
      if (state && state.tooltip && this.view.state.facet(completionConfig).closeOnBlur) {
        let dialog = state.open && (0, import_view.getTooltip)(this.view, state.open.tooltip);
        if (!dialog || !dialog.dom.contains(event.relatedTarget))
          setTimeout(() => this.view.dispatch({ effects: closeCompletionEffect.of(null) }), 10);
      }
    },
    compositionstart() {
      this.composing = 1;
    },
    compositionend() {
      if (this.composing == 3) {
        setTimeout(() => this.view.dispatch({ effects: startCompletionEffect.of(false) }), 20);
      }
      this.composing = 0;
    }
  }
});
var windows = typeof navigator == "object" && /* @__PURE__ */ /Win/.test(navigator.platform);
var commitCharacters = /* @__PURE__ */ import_state.Prec.highest(/* @__PURE__ */ import_view.EditorView.domEventHandlers({
  keydown(event, view) {
    let field = view.state.field(completionState, false);
    if (!field || !field.open || field.open.disabled || field.open.selected < 0 || event.key.length > 1 || event.ctrlKey && !(windows && event.altKey) || event.metaKey)
      return false;
    let option = field.open.options[field.open.selected];
    let result = field.active.find((a) => a.source == option.source);
    let commitChars = option.completion.commitCharacters || result.result.commitCharacters;
    if (commitChars && commitChars.indexOf(event.key) > -1)
      applyCompletion(view, option);
    return false;
  }
}));
var baseTheme = /* @__PURE__ */ import_view.EditorView.baseTheme({
  ".cm-tooltip.cm-tooltip-autocomplete": {
    "& > ul": {
      fontFamily: "monospace",
      whiteSpace: "nowrap",
      overflow: "hidden auto",
      maxWidth_fallback: "700px",
      maxWidth: "min(700px, 95vw)",
      minWidth: "250px",
      maxHeight: "10em",
      height: "100%",
      listStyle: "none",
      margin: 0,
      padding: 0,
      "& > li, & > completion-section": {
        padding: "1px 3px",
        lineHeight: 1.2
      },
      "& > li": {
        overflowX: "hidden",
        textOverflow: "ellipsis",
        cursor: "pointer"
      },
      "& > completion-section": {
        display: "list-item",
        borderBottom: "1px solid silver",
        paddingLeft: "0.5em",
        opacity: 0.7
      }
    }
  },
  "&light .cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "#17c",
    color: "white"
  },
  "&light .cm-tooltip-autocomplete-disabled ul li[aria-selected]": {
    background: "#777"
  },
  "&dark .cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "#347",
    color: "white"
  },
  "&dark .cm-tooltip-autocomplete-disabled ul li[aria-selected]": {
    background: "#444"
  },
  ".cm-completionListIncompleteTop:before, .cm-completionListIncompleteBottom:after": {
    content: '"\xB7\xB7\xB7"',
    opacity: 0.5,
    display: "block",
    textAlign: "center"
  },
  ".cm-tooltip.cm-completionInfo": {
    position: "absolute",
    padding: "3px 9px",
    width: "max-content",
    maxWidth: `${400}px`,
    boxSizing: "border-box",
    whiteSpace: "pre-line"
  },
  ".cm-completionInfo.cm-completionInfo-left": { right: "100%" },
  ".cm-completionInfo.cm-completionInfo-right": { left: "100%" },
  ".cm-completionInfo.cm-completionInfo-left-narrow": { right: `${30}px` },
  ".cm-completionInfo.cm-completionInfo-right-narrow": { left: `${30}px` },
  "&light .cm-snippetField": { backgroundColor: "#00000022" },
  "&dark .cm-snippetField": { backgroundColor: "#ffffff22" },
  ".cm-snippetFieldPosition": {
    verticalAlign: "text-top",
    width: 0,
    height: "1.15em",
    display: "inline-block",
    margin: "0 -0.7px -.7em",
    borderLeft: "1.4px dotted #888"
  },
  ".cm-completionMatchedText": {
    textDecoration: "underline"
  },
  ".cm-completionDetail": {
    marginLeft: "0.5em",
    fontStyle: "italic"
  },
  ".cm-completionIcon": {
    fontSize: "90%",
    width: ".8em",
    display: "inline-block",
    textAlign: "center",
    paddingRight: ".6em",
    opacity: "0.6",
    boxSizing: "content-box"
  },
  ".cm-completionIcon-function, .cm-completionIcon-method": {
    "&:after": { content: "'\u0192'" }
  },
  ".cm-completionIcon-class": {
    "&:after": { content: "'\u25CB'" }
  },
  ".cm-completionIcon-interface": {
    "&:after": { content: "'\u25CC'" }
  },
  ".cm-completionIcon-variable": {
    "&:after": { content: "'\u{1D465}'" }
  },
  ".cm-completionIcon-constant": {
    "&:after": { content: "'\u{1D436}'" }
  },
  ".cm-completionIcon-type": {
    "&:after": { content: "'\u{1D461}'" }
  },
  ".cm-completionIcon-enum": {
    "&:after": { content: "'\u222A'" }
  },
  ".cm-completionIcon-property": {
    "&:after": { content: "'\u25A1'" }
  },
  ".cm-completionIcon-keyword": {
    "&:after": { content: "'\u{1F511}\uFE0E'" }
    // Disable emoji rendering
  },
  ".cm-completionIcon-namespace": {
    "&:after": { content: "'\u25A2'" }
  },
  ".cm-completionIcon-text": {
    "&:after": { content: "'abc'", fontSize: "50%", verticalAlign: "middle" }
  }
});
var closedBracket = /* @__PURE__ */ new class extends import_state.RangeValue {
}();
closedBracket.startSide = 1;
closedBracket.endSide = -1;
var android = typeof navigator == "object" && /* @__PURE__ */ /Android\b/.test(navigator.userAgent);
function autocompletion(config = {}) {
  return [
    commitCharacters,
    completionState,
    completionConfig.of(config),
    completionPlugin,
    completionKeymapExt,
    baseTheme
  ];
}
var completionKeymap = [
  { key: "Ctrl-Space", run: startCompletion },
  { mac: "Alt-`", run: startCompletion },
  { mac: "Alt-i", run: startCompletion },
  { key: "Escape", run: closeCompletion },
  { key: "ArrowDown", run: /* @__PURE__ */ moveCompletionSelection(true) },
  { key: "ArrowUp", run: /* @__PURE__ */ moveCompletionSelection(false) },
  { key: "PageDown", run: /* @__PURE__ */ moveCompletionSelection(true, "page") },
  { key: "PageUp", run: /* @__PURE__ */ moveCompletionSelection(false, "page") },
  { key: "Enter", run: acceptCompletion }
];
var completionKeymapExt = /* @__PURE__ */ import_state.Prec.highest(/* @__PURE__ */ import_view.keymap.computeN([completionConfig], (state) => state.facet(completionConfig).defaultKeymap ? [completionKeymap] : []));
function completionStatus(state) {
  let cState = state.field(completionState, false);
  return cState && cState.active.some((a) => a.isPending) ? "pending" : cState && cState.active.some(
    (a) => a.state != 0
    /* State.Inactive */
  ) ? "active" : null;
}

// src/modules/extensions/local-content-suggest/services/LocalContentCompletion.ts
var import_state2 = require("@codemirror/state");
var import_view2 = require("@codemirror/view");
var TOKEN_CHAR_RE = /[A-Za-z0-9_\-\u4E00-\u9FFF]/;
var TOKEN_VALID_RE = /[A-Za-z0-9_\-\u4E00-\u9FFF]*/;
var ASCII_TOKEN_EXTRACT_RE = /[A-Za-z0-9_\-]{2,64}/g;
var CJK_RUN_EXTRACT_RE = /[\u4E00-\u9FFF]{2,}/g;
function isTokenChar(char) {
  return TOKEN_CHAR_RE.test(char);
}
function extractPrefix(docText, pos) {
  let start = pos;
  let scanned = 0;
  while (start > 0 && scanned < LOCAL_CONTENT_SUGGEST_CONSTANTS.MAX_TOKEN_LENGTH) {
    const ch = docText[start - 1];
    if (!isTokenChar(ch)) {
      break;
    }
    start--;
    scanned++;
  }
  return docText.slice(start, pos);
}
function inc(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}
function addCjkPhrases(words, docText) {
  const runs = docText.match(CJK_RUN_EXTRACT_RE) ?? [];
  for (const run of runs) {
    const maxLen = Math.min(LOCAL_CONTENT_SUGGEST_CONSTANTS.MAX_CJK_PHRASE_LENGTH, run.length);
    for (let len = 2; len <= maxLen; len++) {
      for (let i = 0; i + len <= run.length; i++) {
        inc(words, run.slice(i, i + len));
      }
    }
  }
}
function buildIndex(docText) {
  const words = /* @__PURE__ */ new Map();
  const lines = /* @__PURE__ */ new Map();
  const wordMatches = docText.match(ASCII_TOKEN_EXTRACT_RE) ?? [];
  for (const token of wordMatches) {
    if (token.length > LOCAL_CONTENT_SUGGEST_CONSTANTS.MAX_TOKEN_LENGTH) continue;
    inc(words, token);
  }
  addCjkPhrases(words, docText);
  const rawLines = docText.split(/\r?\n/);
  for (const raw of rawLines) {
    const line = raw.trim();
    if (line.length < LOCAL_CONTENT_SUGGEST_CONSTANTS.MIN_LINE_PREFIX) continue;
    if (line.length > LOCAL_CONTENT_SUGGEST_CONSTANTS.MAX_LINE_LENGTH) continue;
    inc(lines, line);
  }
  return { docText, words, lines };
}
function sortSuggestions(a, b) {
  if (a.kind !== b.kind) {
    return a.kind === "word" ? -1 : 1;
  }
  if (a.count !== b.count) {
    return b.count - a.count;
  }
  if (a.value.length !== b.value.length) {
    return a.value.length - b.value.length;
  }
  return a.value.localeCompare(b.value, "zh-Hans-CN");
}
function buildCompletionOptions(entries) {
  return entries.map((entry) => ({
    label: entry.value,
    type: "text",
    detail: entry.kind === "word" ? `\u6587\u6863\u5185\u8BCD\u6C47\uFF08\u51FA\u73B0 ${entry.count} \u6B21\uFF09` : `\u6587\u6863\u5185\u884C\u7247\u6BB5\uFF08\u51FA\u73B0 ${entry.count} \u6B21\uFF09`,
    boost: entry.kind === "word" ? 2 : 0
  }));
}
function acceptWhenCompletionActive(view) {
  const status = completionStatus(view.state);
  if (status !== "active" && status !== "pending") {
    return false;
  }
  return acceptCompletion(view) || true;
}
function createCompletionAcceptCaptureExtension() {
  return import_view2.ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.keydownHandler = (event) => {
        if (event.key !== "Enter" && event.key !== "Tab") {
          return;
        }
        const status = completionStatus(this.view.state);
        if (status !== "active" && status !== "pending") {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        acceptWhenCompletionActive(this.view);
      };
      this.view.dom.addEventListener("keydown", this.keydownHandler, true);
    }
    keydownHandler;
    destroy() {
      this.view.dom.removeEventListener("keydown", this.keydownHandler, true);
    }
  });
}
function createLocalContentCompletionSource() {
  let cache = null;
  return (context) => {
    const docText = context.state.doc.toString();
    const prefix = extractPrefix(docText, context.pos);
    if (!context.explicit && prefix.length < LOCAL_CONTENT_SUGGEST_CONSTANTS.MIN_WORD_PREFIX) {
      return null;
    }
    if (!cache || cache.docText !== docText) {
      cache = buildIndex(docText);
    }
    const entries = [];
    const seen = /* @__PURE__ */ new Set();
    if (prefix.length >= LOCAL_CONTENT_SUGGEST_CONSTANTS.MIN_WORD_PREFIX) {
      for (const [word, count] of cache.words) {
        if (word === prefix) continue;
        if (!word.startsWith(prefix)) continue;
        if (seen.has(word)) continue;
        entries.push({ value: word, count, kind: "word" });
        seen.add(word);
        if (entries.filter((e) => e.kind === "word").length >= LOCAL_CONTENT_SUGGEST_CONSTANTS.MAX_WORD_SUGGESTIONS) {
          break;
        }
      }
    }
    if (prefix.length >= LOCAL_CONTENT_SUGGEST_CONSTANTS.MIN_LINE_PREFIX) {
      let lineCount = 0;
      for (const [line, count] of cache.lines) {
        if (line === prefix) continue;
        if (!line.startsWith(prefix)) continue;
        if (seen.has(line)) continue;
        entries.push({ value: line, count, kind: "line" });
        seen.add(line);
        lineCount++;
        if (lineCount >= LOCAL_CONTENT_SUGGEST_CONSTANTS.MAX_LINE_SUGGESTIONS) {
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
      validFor: TOKEN_VALID_RE
    };
  };
}
function createLocalContentSuggestExtensions() {
  const source = createLocalContentCompletionSource();
  return [
    autocompletion({
      override: [source],
      activateOnTyping: true,
      maxRenderedOptions: 12,
      defaultKeymap: true,
      closeOnBlur: true,
      selectOnOpen: true
    }),
    createCompletionAcceptCaptureExtension(),
    // 高优先级处理补全接受，避免被宿主 Enter/Tab 行为提前吞掉
    import_state2.Prec.highest(import_view2.keymap.of([
      {
        key: "Enter",
        run: (view) => acceptWhenCompletionActive(view),
        preventDefault: true
      },
      {
        key: "Tab",
        run: (view) => acceptWhenCompletionActive(view),
        preventDefault: true
      }
    ])),
    import_view2.keymap.of([
      {
        key: "Ctrl-Space",
        run: (view) => {
          startCompletion(view);
          return true;
        }
      }
    ])
  ];
}

// src/modules/extensions/local-content-suggest/index.ts
var LocalContentSuggestPlugin = class {
  id = LOCAL_CONTENT_SUGGEST_CONSTANTS.PLUGIN_ID;
  name = LOCAL_CONTENT_SUGGEST_CONSTANTS.PLUGIN_NAME;
  version = LOCAL_CONTENT_SUGGEST_CONSTANTS.VERSION;
  description = LOCAL_CONTENT_SUGGEST_CONSTANTS.DESCRIPTION;
  disposables = [];
  activate(context) {
    const extensions = createLocalContentSuggestExtensions();
    for (const ext of extensions) {
      this.disposables.push(context.registerEditorExtension(ext));
    }
    context.logger.info(`${LOCAL_CONTENT_SUGGEST_CONSTANTS.PLUGIN_NAME} \u5DF2\u6FC0\u6D3B`);
  }
  deactivate() {
    for (const dispose of this.disposables.splice(0)) {
      try {
        dispose();
      } catch {
      }
    }
  }
};
