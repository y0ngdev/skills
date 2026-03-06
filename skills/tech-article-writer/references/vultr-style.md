# Vultr Docs Style Guide

## Table of Contents

- [Voice and Tone](#voice-and-tone)
- [Articles vs Guides](#articles-vs-guides)
- [Article Structure](#article-structure)
- [Content Patterns](#content-patterns)
- [Formatting Conventions](#formatting-conventions)
- [Language Rules](#language-rules)
- [Forbidden Patterns](#forbidden-patterns)
- [Example Sections](#example-sections)

## Voice and Tone

- **Second-person instructional**: Address the reader as "you," "your," and "yours." Never use first-person singular (I, me, my, mine).
- **"We" means Vultr only**: Use "we/us/our/ours" only when referring to Vultr the company. Never use "we" to mean the reader or author.
- **Gender-neutral third person**: If third-person pronouns are needed, use "they/their/theirs" instead of he, she, his, hers.
- **Active voice**: Write in active voice for direct, engaging prose.
  - Correct: "The system processes the data."
  - Not correct: "The data is processed by the system."
  - Exceptions — use passive voice when the system performs the action ("The database is updated weekly") or to avoid blaming the user ("If the installation fails, wrong information probably was entered in the configuration file").
- **Present tense**: Use present tense to make instructions immediate.
  - Correct: "MySQL prompts you for the password."
  - Not correct: "MySQL will prompt you for the password."
  - Use future tense only when emphasizing actions that occur later.
- **Task-focused language**: Focus on the outcome for the reader, not the learning process.
  - Correct: "At the end of this article, you will have a working Kubernetes cluster."
  - Not correct: "Today, you'll learn how to install Kubernetes."
- **Implied subjects**: Omit "you" in instructional steps when the reader is the clear subject.
  - Correct: "Edit the Apache control file."
  - Not correct: "You need to edit the Apache control file."
  - Use explicit subjects only when clarity is necessary, such as in troubleshooting.
- **Strong action statements**: Avoid weak modifiers like "quite," "very," "extremely." Avoid starting sentences with "There is," "There are," "There were."
  - Correct: "The system sends alerts for failures."
  - Not correct: "There are alerts sent by the system for failures."
- **Factual and neutral**: No promotional hype, advocacy, or subjective claims. Never call a technology "the best," "world-changing," or "much better."
- **Never use "simple" or "easy"**: Words like *simple, simply, easy, easier, easy to use* are subjective and may alienate readers who find the topic difficult.
- **No exclamation points**: Exclamation marks are not used in Vultr documentation.
- **Plain language**: Use the simplest word that conveys the meaning. "Use" not "utilize," "begin" not "commence," "about" not "approximately," "because" not "due to the fact that."
- **Concise sentences**: Keep sentences to 40 words or fewer. Break complex sentences into shorter ones or use lists.
- **No semicolons**: Sentences with semicolons are often too complex. Break them into separate sentences or a list.

## Articles vs Guides

Vultr has two distinct content types. Determine which type before writing, as the rules differ.

### Articles

Articles provide well-researched information on common technologies and tools. They are **cloud-agnostic** and not written in Vultr-specific language.

- **Purpose**: Attract new visitors and improve brand visibility.
- **Audience**: Broader tech community (not just Vultr customers).
- **Scope**: General technologies and tools.
- **Prerequisites phrasing**: Use neutral, general language. Write "An Ubuntu 24.04 machine" not "A Vultr Ubuntu 24.04 instance."
- **Tool neutrality**: All tools and software must be cloud-agnostic, not dependent on any specific cloud provider.
- **Title pattern**: "How to Install [X] on [Y]" (for example, "How to Install SonarQube on Ubuntu 24.04").
- **Topics**: Software installations, containerized deployments, Linux knowledge base, database management, DevOps practices, AI/ML topics.

### Guides

Guides are Vultr-specific documentation resources that demonstrate how to implement Vultr products or services.

- **Purpose**: Assist existing customers with implementing Vultr products.
- **Audience**: Vultr customers and users.
- **Scope**: Vultr-specific implementations.
- **Prerequisites phrasing**: Include links to relevant Vultr product pages. Write "Provision a [Vultr Kubernetes Engine Cluster](link)" not "A Vultr Kubernetes Engine (VKE) cluster."
- **Tool specificity**: Primary focus on Vultr products. Third-party tools may be included but Vultr products are the focus.
- **Topics**: Deploying/configuring Vultr products, combining multiple Vultr products, migrating from another provider to Vultr, integrating third-party tools with Vultr.

## Article Structure

Follow this structure for consistency and clarity:

1. **Title**: Clearly describes the article's topic. For articles, often follows "How to Install [X] on [Y]" format.
2. **Introduction** (`## Introduction`):
   - Paragraph 1: Introduce the tool or topic.
   - Paragraph 2: Summarize the article's coverage.
   - No step number.
3. **Prerequisites** (`## Prerequisites`): Bulleted list of all necessary tools, knowledge, or configurations required. For articles, use provider-agnostic language. For guides, link to Vultr product pages. No step number.
4. **Numbered step sections** (`## 1. Title`, `## 2. Title`, and so on): Each major step gets an H2 with a step number, period, space, then a title in title case. Each step has one clear objective. Each section and subsection includes a summary explaining what the reader will do in that section.
5. **Security section** (when applicable): Explain how to secure the system with HTTPS, firewall, SSH keys, or other appropriate measures.
6. **Conclusion**: Summarize the article's key points and outcomes.
7. **Next Steps** (`### Next Steps`): Link to related tutorials and recommend best practices. No step number.
8. **More Information** (`### More Information`): Bullet list of links to official documentation, GitHub projects, and references. No step number.

### Heading rules

- **H2** (`##`) for all major sections. An H2 nested under the implicit H1 (the title) divides the article into distinct subtopics.
- **H3** (`###`) for subsections within a step. Use when breaking down a subtopic into smaller sections while maintaining logical hierarchy.
- **Title case** for all headings — capitalize major words, avoid capitalizing articles like "a," "an," "the" unless they are the first word. Example: `## Configure the JupyterLab Server`
- **No punctuation at the end** of headings (unless an FAQ question).
- Step headers follow the format: `## 1. Install Python` (number, period, space, title in title case).

### Section length

- Steps run 100-400 words each.
- Total article length: 1,500+ words for full payout (750-1,500 words at 80% payout, fewer than 750 at 50%).
- Go beyond bare installation instructions — include code examples, configuration, testing, and security.

## Content Patterns

- **Every command is shown**: Never say "install the package." Show the exact command.
- **Expected output after key commands**: Show what the reader should see. Use a code block without a language lexer for output.
- **One action per step**: Each H2 step does one thing.
- **Section summaries**: Each section and subsection includes a brief summary explaining what the reader will do in that section.
- **Verification after each step**: After a major action, show how to verify it worked (check a service status, curl an endpoint, view a file).
- **Hello World minimum**: If installing a development environment, always include at least a basic "Hello World" example.
- **Security steps required**: Any server-facing guide must include security steps (firewall, HTTPS, SSH keys, and so on).
- **Prerequisites link appropriately**: For guides, link to Vultr product pages. For articles, use neutral language.
- **No assumptions**: Specify the editor command to open a file. Give the exact restart command for a service. Show full file paths.
- **Meaningful link text**: Never use "click here" or "this page." Describe what the link leads to. Use descriptive anchor text instead of raw URLs.
- **Images with alt text**: All images must include descriptive alt text for accessibility.

## Formatting Conventions

### Code blocks

- **Triple backticks with language lexer** for multiline code blocks and commands. Triple backticks enable syntax highlighting, copy/paste functionality, and automatic formatting.

        ```console
        $ sudo apt update
        ```

- **`$` prompt prefix** for user commands in console blocks. The `$` indicates regular user commands.
- **No language lexer for output blocks**: When showing command output, use triple backticks without a language specification.
- **Inline code**: Use single backticks for file paths, commands, package names, config values, and code references within regular text.
- **Four-space indent** for code blocks inside ordered or unordered lists (to maintain proper rendering). Also use four-space indent for code explanations within list items.

### Lists

- **Asterisks (`*`) for unordered lists**, not hyphens (`-`).
- **`1.` for all ordered list items** — steps are automatically displayed in incremental order upon final publication. Example:

        1. This is step 1
        1. This is step 2

- Use ordered lists for step-by-step instructions where sequence matters.
- Use unordered lists when the sequence of items is not significant.

### Notes and warnings

Use GitHub-style admonitions for important callouts:

- **Regular note** — supplementary information that enhances understanding:

        > [!NOTE]
        > This is a regular note.

- **Warning** — indicates potential problems or helps prevent user errors:

        > [!WARNING]
        > This is a warning.

### Text formatting

- **Bold** for UI elements ("Click **Save**"), key terms on first use, and important warnings.
- **Links**: Use descriptive, inline links with anchor text. Images must include alt text.

        ![JupyterLab Interface](https://example.com/jupyterlab.png)
        [Learn more about JupyterLab](https://example.com/jupyterlab-guide)

- **Oxford comma**: Always use the serial comma.
  - Correct: "The guide covers Linux, Windows, and macOS."
  - Not correct: "The guide covers Linux, Windows and macOS."
- **One space between sentences**: Never double-space after periods.
- **Percentages**: Use numerals with the word: "20 percent" not "twenty percent."
- **Ranges**: Write "from 20 through 30" not "20-30."
- **Negative numbers**: Use an en dash, not a hyphen.
- **Ordinals**: Never write "firstly," "secondly," "thirdly," "lastly." Use ordered lists instead.
- **Parentheses**: Always include a space before opening parenthesis. Never use parenthetical plurals like "file(s)."

### Abbreviations

- Write out abbreviations upon first use, followed by the abbreviation in parentheses.
- Use the abbreviation consistently thereafter.
  - Correct: "Content Delivery Network (CDN) is a system of distributed servers. A CDN speeds up content delivery by caching files closer to the user."
  - Not correct: "A CDN is a system of servers. Content Delivery Network caches files closer to the user."

### Date and time

- Use "a.m." and "p.m." (lowercase with periods and a preceding space): "The server reboots at 11:52 a.m. each Tuesday."
- Avoid redundant phrases: not "3:00 a.m. in the morning."
- Use "midnight" and "noon" instead of "12:00 a.m." or "12:00 p.m."

## Language Rules

### US English required

All British spellings must be replaced with US equivalents:

| British (forbidden) | US (required) |
|---|---|
| colour | color |
| centre | center |
| analyse | analyze |
| behaviour | behavior |
| favourite | favorite |
| organise | organize |
| defence | defense |
| licence | license |
| fulfil | fulfill |
| grey | gray |

This applies to all 80+ British/US spelling pairs.

### Latin abbreviations forbidden

| Forbidden | Use instead |
|---|---|
| e.g. | for example |
| i.e. | that is |
| etc. | and so on |
| et cetera | and so on |

### Mandatory term substitutions

| Avoid | Use instead |
|---|---|
| e-mail / Email | email |
| WiFi / wifi | Wi-Fi |
| kill / terminate / abort (processes) | stop / exit / cancel / end |
| click on | click |
| datacenter / data center | location |
| file name | filename |
| filepath / pathname | path |
| config | configuration |
| k8s | Kubernetes |
| regex | regular expression |
| spin up / spin a | deploy / deploy a |
| sign into | sign in to |
| uncheck / unselect | clear |
| cloud computer | cloud compute instance |
| performant | efficient / high-performance |
| vs. | versus |
| approx. | about |
| webserver | web server |
| mysql | MySQL |
| yaml | YAML |
| vultr | Vultr (always capitalized) |

### Shorthand to avoid

| Shorthand | Write instead |
|---|---|
| distro | distribution |
| info | information |
| repo | repository |

### Simplify complex phrases

| Wordy | Write instead |
|---|---|
| a large number of | many |
| are able to | can |
| at the present time | now |
| based on the fact that | because |
| close proximity | close |
| demonstrate | show |
| despite the fact that | although |
| due to the fact that | because |
| has the ability to | can |
| in lieu of | instead of |
| in order to | to |
| in the event that | if |
| methodology | method |
| numerous | many |
| prior to | before |
| state-of-the-art | latest |
| subsequent to | after |
| utilize / utilization | use |
| whether or not | whether |
| with the exception of | except for |

### Inclusive language

| Avoid | Use instead |
|---|---|
| blacklist | denylist |
| whitelist | allowlist |
| master | primary / main |
| slave | secondary / replica |

### Gender-neutral language

Use "they/their/theirs" instead of gendered pronouns. Avoid gendered job titles (use "firefighter" not "fireman," "chair" not "chairman").

## Forbidden Patterns

These must never appear in Vultr documentation:

- Exclamation points
- Tabs (use four spaces for indentation)
- Hyphens for bullet points (use asterisks)
- British spellings
- Latin abbreviations (for example, i.e., and so on — write them out)
- "Click here" or "this page" as link text
- Oxymorons ("exact estimate," "organized mess")
- Uncomparable modifiers ("very unique," "most perfect," "extremely complete")
- Adverb ordinals ("firstly," "secondly," "lastly")
- "12 a.m." or "12 p.m." (use midnight/noon)
- Redundant time phrases ("7 a.m. in the morning")
- Direct Vultr Object Storage URLs in documentation
- Double spaces between sentences
- Parenthetical plurals ("file(s)")
- Periods in acronyms ("U.R.L.")
- First-person pronouns (I, me, my, mine)
- Images without alt text

## Example Sections

**Introduction example:**

```markdown
## Introduction

LAMP is a popular open-source web development stack consisting of Linux,
Apache, MySQL or MariaDB, and PHP. This guide explains how to install and
configure a LAMP stack on a Debian 12 server.

In this guide, you will:

* Install Apache, MySQL, and PHP
* Configure a virtual host
* Secure the installation with a firewall and HTTPS
```

**Prerequisites example (article — cloud-agnostic):**

```markdown
## Prerequisites

Before you begin, you should:

* An Ubuntu 24.04 machine with at least 4 GB of RAM
* A non-root user with sudo privileges
* A domain name pointed at your server
```

**Prerequisites example (guide — Vultr-specific):**

```markdown
## Prerequisites

Before you begin, you should:

* Provision a [Vultr Ubuntu 24.04 cloud server](https://my.vultr.com/deploy/)
  with at least 4 GB of RAM
* [Update the server](https://docs.vultr.com/update-debian-server-best-practices)
* [Create a non-root user with sudo privileges](https://docs.vultr.com/create-a-sudo-user-on-debian-best-practices)
* [Log in to your server](https://docs.vultr.com/how-to-access-your-vultr-vps)
  as the non-root user
```

**Step with code block and verification:**

```markdown
## 1. Install Apache

Update the package index and install the Apache web server.

    ```console
    $ sudo apt update
    $ sudo apt install apache2 -y
    ```

Verify the installation by checking the service status.

    ```console
    $ sudo systemctl status apache2
    ```

The output confirms the service is active:

    ```
    ● apache2.service - The Apache HTTP Server
       Active: active (running) since ...
    ```

With Apache installed and running, configure the firewall in the next step.
```

**Note and warning examples:**

```markdown
> [!NOTE]
> This command requires at least 2 GB of available disk space.

> [!WARNING]
> Running this command deletes all data in the target directory.
```
