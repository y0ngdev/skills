# Better Stack Style Guide

## Table of Contents

- [Voice and Tone](#voice-and-tone)
- [Article Structure](#article-structure)
- [Content Patterns](#content-patterns)
- [Formatting Conventions](#formatting-conventions)
- [Example Sections](#example-sections)

## Voice and Tone

- **Developer-to-developer**: Write as a fellow practitioner, not an instructor. Assume the reader is a working developer who knows fundamentals.
- **Clear and efficient**: Get to the point. Developers scanning for solutions shouldn't wade through backstory.
- **Pragmatic**: Focus on what works in production, not theoretical ideals. Acknowledge trade-offs directly.
- **Modern and current**: Reference latest stable versions. Note when something changed recently.
- **Lightly opinionated**: Recommend best practices when they exist. "We recommend X because Y" is encouraged.
- **Friendly but not chatty**: Warm without being verbose. Skip filler phrases ("In this article, we will explore...").

## Article Structure

### Guide/tutorial format

1. **Title**: Clear and specific. "Node.js Logging: A Complete Guide" or "How to Set Up Prometheus Monitoring"
2. **Introduction** (1-2 paragraphs): What this covers and why it matters. Jump in quickly. No lengthy motivation.
3. **Prerequisites** (when applicable): Brief, bulleted. Only what's genuinely required.
4. **Core sections**: H2 headers organized by concept or task. Mix explanation with code.
5. **Complete code examples**: Show full, runnable code — not just snippets. Include the imports, the setup, the whole picture.
6. **Comparison tables**: For "X vs Y" decisions, include comparison tables with clear criteria.
7. **Conclusion**: 2-3 sentences. Recap what was covered, link to related resources.

### "Best practices" / "Complete guide" format

1. **Introduction**: Frame the problem space briefly.
2. **Organized sections**: Group by theme (e.g., "Structured Logging," "Log Levels," "Log Rotation").
3. **Each section**: Explanation (why) then implementation (how) with code.
4. **Summary table or checklist**: End with a consolidation of key points.

### Section length

- Sections run 200-600 words each.
- Total article length: 1,500-4,000 words.
- Aim for scannable. A developer should be able to find what they need in 30 seconds.

## Content Patterns

- **Code-first approach**: Lead with a working code example, then explain it. Don't make readers wait through paragraphs of theory before seeing code.
- **Full runnable examples**: Include complete files, not just fragments. Show imports, initialization, and cleanup.
- **Output shown**: After code blocks, show what running the code produces.
- **Comparison tables**: Use Markdown tables to compare tools, libraries, approaches. Include columns for key decision criteria.
- **Version awareness**: Specify versions. "This guide uses Node.js 20 and Winston 3.11."
- **Production-ready code**: Examples should be close to production quality — include error handling, environment variables, proper shutdown.
- **Visual aids**: Use diagrams for architecture, flow charts for processes. ASCII diagrams are acceptable.
- **Internal linking**: Link to related Better Stack guides and docs frequently.
- **"Why this matters" blocks**: Briefly explain the practical impact of each recommendation.

## Formatting Conventions

- **Title**: Descriptive. "[Technology] [Topic]: [Qualifier]" pattern. "Python Logging: Best Practices and Complete Guide"
- **Headers**: H2 for major sections, H3 for subsections within. Headers are noun phrases or questions ("Structured logging" or "What is structured logging?").
- **Code blocks**: Fenced with language identifier. Use comments inside code to annotate key lines.
- **Inline code**: For function names, config keys, file names, commands.
- **Bold**: For important terms, key takeaways within paragraphs.
- **Tables**: For comparisons, feature matrices, configuration options.
- **Numbered lists**: For sequential steps.
- **Bulleted lists**: For features, considerations, non-ordered items.
- **Images**: Screenshots, architecture diagrams, dashboard examples. Add captions.
- **Admonitions**: Use note/tip/warning blocks sparingly for critical information.

## Example Sections

**Code-first pattern:**
> ## Setting Up Structured Logging
> 
> ```javascript
> const winston = require('winston');
> 
> const logger = winston.createLogger({
>   level: 'info',
>   format: winston.format.combine(
>     winston.format.timestamp(),
>     winston.format.json()
>   ),
>   transports: [
>     new winston.transports.Console(),
>     new winston.transports.File({ filename: 'app.log' })
>   ]
> });
> 
> logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
> ```
> 
> This produces structured JSON output:
> 
> ```json
> {"level":"info","message":"User logged in","userId":"123","ip":"192.168.1.1","timestamp":"2024-01-15T10:30:00.000Z"}
> ```
> 
> Structured logging makes your logs queryable. Instead of parsing strings like `"User 123 logged in from 192.168.1.1"`, you can filter directly on `userId` or `ip` in your log management tool.

**Comparison table pattern:**
> ## Choosing a Logging Library
> 
> | Feature | Winston | Pino | Bunyan |
> |---|---|---|---|
> | Performance | Moderate | Fastest | Moderate |
> | JSON by default | No | Yes | Yes |
> | Log rotation | Plugin | Plugin | Built-in |
> | Active maintenance | Yes | Yes | Limited |
> | Learning curve | Low | Low | Medium |
> 
> **Our recommendation:** Use Pino for new projects where performance matters. Use Winston when you need extensive transport options or are already familiar with it.
