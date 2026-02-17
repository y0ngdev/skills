---
name: tech-article-writer
description: Research, write, and review technical articles in the style of leading engineering publications (The Pragmatic Engineer, DigitalOcean, Better Stack). Use this skill when a user wants to write a technical blog post, tutorial, guide, deep-dive, or engineering article. Also use when the user asks to review or improve an existing technical article, match a specific publication's writing style, or create technical content that follows industry-standard formats.
---

# Tech Article Writer

Write technical articles following the conventions of top engineering publications. Supports three styles: The Pragmatic Engineer (opinionated long-form analysis), DigitalOcean (step-by-step tutorials), and Better Stack (developer-focused guides with code-first examples).

## Workflow

Article creation involves five phases:

1. **Research** — Understand the topic and gather material
2. **Style selection** — Choose and load the target publication style
3. **Outline** — Structure the article to match the style
4. **Draft** — Write the full article
5. **Review** — Evaluate against the review checklist

Follow these phases in order. Phases may loop (e.g., review sends back to draft).

## Phase 1: Research

Gather context before writing. Ask the user:

1. What topic should the article cover?
2. Who is the target audience? (junior devs, senior engineers, engineering managers, etc.)
3. What style? (Pragmatic Engineer / DigitalOcean / Better Stack)
4. Any specific points, data, or examples to include?
5. Desired length? (Default: 2,000-3,000 words)

If the user provides reference material (docs, links, code, prior articles), read and synthesize it. Identify:

- **Core concepts** the reader must understand
- **Key arguments or steps** the article must convey
- **Supporting evidence**: data, examples, comparisons, code samples
- **Gaps** where additional research or user input is needed

## Phase 2: Style Selection

Based on the user's choice (or infer from context), load the matching style guide:

| Style                  | Best for                                                                      | Load                                                                  |
| ---------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Pragmatic Engineer** | Opinion pieces, industry analysis, career advice, engineering culture         | [pragmatic-engineer-style.md](references/pragmatic-engineer-style.md) |
| **DigitalOcean**       | Step-by-step tutorials, server setup, tool installation, how-to guides        | [digitalocean-style.md](references/digitalocean-style.md)             |
| **Better Stack**       | Developer guides, best practices, tool comparisons, "complete guide" articles | [betterstack-style.md](references/betterstack-style.md)               |

**Selection heuristics** (when user doesn't specify):

- Tutorial with specific commands/setup steps → DigitalOcean
- Analysis of industry trends, company practices, or career topics → Pragmatic Engineer
- Best practices guide, tool comparison, or "how to do X well" → Better Stack
- If genuinely ambiguous, ask the user

Read the selected style guide reference file before proceeding to outline.

## Phase 3: Outline

Create a structured outline that matches the selected style's article structure. The outline must include:

- **Title** following the style's title convention
- **All section headers** at the correct heading level
- **2-3 bullet points per section** describing the content
- **Planned code examples, tables, or data** noted where they'll appear

Present the outline to the user for feedback before drafting. Revise until approved.

### Style-specific outline rules

**Pragmatic Engineer**: Start with a hook (news event, surprising data, or personal experience). Include at least one cross-company comparison section. End with takeaways.

**DigitalOcean**: Start with Introduction + Prerequisites. Every content section is "Step N — [Gerund Phrase]". End with Conclusion + next steps.

**Better Stack**: Lead sections with code examples. Include at least one comparison table. Group by concept, not sequence.

## Phase 4: Draft

Write the full article following the approved outline and loaded style guide. Key rules:

- **Match the voice**: Each style has a distinct voice. Reread the style guide's "Voice and Tone" section and follow it precisely.
- **Show, don't tell**: Prefer code examples, specific data, and named examples over abstract descriptions.
- **One idea per section**: Each section has a single clear purpose.
- **Transitions**: Connect sections with bridge sentences.
- **Paragraph length**: 2-4 sentences. Break walls of text.
- **Code quality**: All code examples must be complete, runnable, and include imports. Add inline comments for non-obvious lines.

Present the draft to the user. Expect revision requests — this is normal.

## Phase 5: Review

Load [review-checklist.md](references/review-checklist.md) and evaluate the article against all applicable checks. Run through:

1. **Content Quality** checks
2. **Technical Accuracy** checks
3. **Structure and Flow** checks
4. **Style Compliance** checks (for the selected style)
5. **Readability** checks
6. **Final Checks**

Present a summary of findings to the user. For each issue found, describe the problem and provide a suggested fix. Then apply approved fixes.

## Iteration

After the initial article is complete, the user may request:

- **Style change**: Load the new style guide and adapt the article
- **Section expansion**: Add depth to a specific section
- **Tone adjustment**: Shift formality, add/remove opinion, change audience level
- **Technical updates**: Update code examples, versions, or commands
- **Full rewrite**: Start from Phase 3 with the same research
