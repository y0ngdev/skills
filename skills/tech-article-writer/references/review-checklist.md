# Technical Article Review Checklist

## Table of Contents

- [Content Quality](#content-quality)
- [Technical Accuracy](#technical-accuracy)
- [Structure and Flow](#structure-and-flow)
- [Style Compliance](#style-compliance)
- [Readability](#readability)
- [Final Checks](#final-checks)

## Content Quality

- [ ] **Thesis is clear**: The reader knows what the article argues or teaches within the first 3 paragraphs.
- [ ] **Claims are supported**: Every major claim has evidence (data, source, example, or logical argument).
- [ ] **No filler**: Every paragraph advances the article. Remove "In this article, we will..." and similar padding.
- [ ] **Depth is appropriate**: The article goes beyond surface-level treatment. It tells the reader something they couldn't get from a quick search.
- [ ] **Audience is respected**: The article matches the assumed reader's level — doesn't over-explain fundamentals or skip critical context.
- [ ] **Actionable takeaways**: The reader knows what to do differently after reading.

## Technical Accuracy

- [ ] **Code runs**: All code examples have been mentally or actually tested. Imports are included. No undefined variables.
- [ ] **Versions specified**: Tools, libraries, and platforms mention their versions.
- [ ] **Commands are correct**: Shell commands are exact and copy-pasteable. Paths are correct.
- [ ] **Output matches**: Shown output matches what the code/command actually produces.
- [ ] **No deprecated APIs**: All referenced APIs, functions, and methods are current.
- [ ] **Edge cases noted**: Limitations, caveats, and "this won't work if..." are called out.

## Structure and Flow

- [ ] **Logical progression**: Each section builds on the previous. No forward references to undefined concepts.
- [ ] **Headers are descriptive**: A reader scanning only headers gets the article's arc.
- [ ] **Transitions exist**: Sections connect with brief transitional sentences ("With the database configured, you can now set up the API").
- [ ] **One idea per section**: Sections don't try to cover multiple unrelated points.
- [ ] **Conclusion matches intro**: The ending delivers on the promise made in the introduction.

## Style Compliance

Apply the checks that match the target publication style:

### Pragmatic Engineer style
- [ ] First-person perspective used naturally
- [ ] Named companies and specific figures included
- [ ] Cross-company comparisons present
- [ ] Opinionated analysis with supporting evidence
- [ ] Long-form depth (2,000+ words)
- [ ] Industry insider tone maintained

### DigitalOcean style
- [ ] "Step N — Gerund" header format used
- [ ] Prerequisites section complete with links
- [ ] Every command shown explicitly
- [ ] Verification after each major step
- [ ] Second-person ("you") used consistently
- [ ] No assumptions about prior knowledge

### Better Stack style
- [ ] Code-first: examples appear before lengthy explanation
- [ ] Full runnable code (imports, setup, complete files)
- [ ] Comparison tables for tool/approach decisions
- [ ] Version numbers specified
- [ ] Production-ready examples (error handling, env vars)
- [ ] Developer-to-developer tone

### Vultr Docs style
- [ ] Determined content type: **article** (cloud-agnostic) or **guide** (Vultr-specific)
- [ ] No H1 in body — all sections start at H2
- [ ] Step headers use `## N. Title` format (title case)
- [ ] Introduction: paragraph 1 introduces tool, paragraph 2 summarizes coverage
- [ ] Prerequisites section present (neutral language for articles, Vultr links for guides)
- [ ] Fenced code blocks with language lexer (` ```console `, ` ```python `, and so on)
- [ ] `$` prompt prefix for user commands in console blocks
- [ ] Output blocks use fenced code blocks without a language lexer
- [ ] Section summaries: each section/subsection explains what the reader will do
- [ ] Asterisks for bullet points, not hyphens
- [ ] `1.` for all ordered list items (auto-numbered)
- [ ] Oxford comma used consistently
- [ ] Abbreviations: spelled out on first use, then abbreviated
- [ ] No exclamation points anywhere
- [ ] No Latin abbreviations (write out "for example," "that is," "and so on")
- [ ] No "simple/simply/easy" language
- [ ] US English only (no British spellings)
- [ ] Active voice (passive only when system is actor or to avoid blaming user)
- [ ] Task-focused language ("you will have a working X" not "you'll learn how to")
- [ ] Implied subjects in instructions ("Edit the file" not "You need to edit the file")
- [ ] Verification step after each major action
- [ ] Security section included (when server-facing)
- [ ] Conclusion section summarizing key outcomes
- [ ] Meaningful link text (no "click here")
- [ ] Images include alt text
- [ ] "We" used only to refer to Vultr the company
- [ ] Mandatory term substitutions applied (see vultr-style.md)
- [ ] 1,500+ words for full payout

## Readability

- [ ] **Paragraphs are short**: 2-4 sentences maximum.
- [ ] **Sentences are clear**: No convoluted compound sentences. Active voice preferred.
- [ ] **Jargon is defined**: Technical terms are explained on first use or linked to definitions.
- [ ] **Consistent terminology**: The same concept uses the same term throughout.
- [ ] **Scannable**: A reader can skim headers, bold text, and code blocks to get the gist.

## Final Checks

- [ ] **Title is accurate and compelling**: Matches the content. Would you click on it?
- [ ] **Introduction hooks the reader**: The first paragraph gives a reason to keep reading.
- [ ] **Links work**: All referenced resources, tutorials, and documentation links are valid.
- [ ] **Images have captions**: Diagrams and screenshots are labeled.
- [ ] **No orphaned sections**: Every section is referenced or reachable from the table of contents.
- [ ] **Word count is appropriate**: Matches the target style (see individual style guides).
