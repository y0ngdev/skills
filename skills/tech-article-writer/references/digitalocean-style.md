# DigitalOcean Style Guide

## Table of Contents

- [Voice and Tone](#voice-and-tone)
- [Article Structure](#article-structure)
- [Content Patterns](#content-patterns)
- [Formatting Conventions](#formatting-conventions)
- [Example Sections](#example-sections)

## Voice and Tone

- **Educational and inclusive**: Write for a broad range of skill levels. Assume intelligence but not prior knowledge of the specific topic.
- **Second-person instructional**: Address the reader as "you" throughout. "You will configure Nginx" not "The user configures Nginx."
- **Neutral and objective**: Avoid opinion or hype. Present information factually. Let the reader draw conclusions.
- **Patient and thorough**: Explain every step. Never skip actions with "obviously" or "simply." What's obvious to the writer often isn't to the reader.
- **Encouraging**: Acknowledge difficulty without being patronizing. "This step involves several configuration changes" not "This is the hard part."
- **Professional but approachable**: Avoid jargon without definition. Use full terms before abbreviations.

## Article Structure

### Tutorial format (most common)

1. **Title**: Action-oriented. "How to Install and Configure Redis on Ubuntu 22.04"
2. **Introduction** (2-3 paragraphs): What the technology is, why it's useful, what the reader will accomplish. End with a clear list of what the tutorial covers.
3. **Prerequisites**: Bulleted list of what the reader needs before starting (server specs, OS version, prior tutorials to complete, accounts needed).
4. **Step sections**: Numbered steps as H2 headers. "Step 1 — Installing Redis." Each step has one clear objective.
5. **Verification substeps**: After each major action, show how to verify it worked.
6. **Conclusion**: Summarize what was accomplished. Suggest next steps with links to related tutorials.

### Conceptual article format

1. **Introduction**: Frame the concept and its relevance.
2. **Sections by subtopic**: Each H2 covers one aspect of the concept.
3. **Practical examples**: Intersperse theory with concrete code or config examples.
4. **Conclusion**: Summarize and link to hands-on tutorials.

### Section length

- Steps run 100-400 words each.
- Total article length: 1,500-4,000 words.
- Completeness and correctness over brevity.

## Content Patterns

- **Every command is shown**: Never say "install the package." Show the exact command: `sudo apt install redis-server`.
- **Expected output**: After key commands, show what the reader should see. Use output blocks.
- **One action per step**: Each step header does one thing. "Step 3 — Configuring the Firewall" not "Step 3 — Configuring the Firewall and Installing SSL."
- **File paths are absolute**: Always show full paths. `/etc/nginx/sites-available/default` not just `default`.
- **Highlight changes in config files**: When editing files, show the full relevant section with changes called out.
- **Environment-specific**: Specify exact OS versions, software versions, and hardware requirements.
- **Warnings and notes**: Use admonition blocks for important warnings, version-specific notes, or security considerations.
- **No assumptions**: If a user needs to open a file, specify the editor command. If they need to restart a service, give the exact command.

## Formatting Conventions

- **Title**: "How to [Verb] [Thing] on [Platform]" format for tutorials.
- **Step headers**: "Step N — [Gerund Phrase]" format. "Step 1 — Installing Dependencies"
- **Code blocks**: Use fenced code blocks with language identifiers. Use separate blocks for commands vs. output.
- **Inline code**: Use backticks for file paths, commands, package names, config values.
- **Bold**: For UI elements ("Click **Save**"), key terms on first use.
- **Notes/Warnings**: Use styled callout blocks:
  ```
  **Note:** Additional context that's helpful but not critical.
  **Warning:** Information that could cause data loss or security issues.
  ```
- **Variable placeholders**: Use `your_value` with italics or angle brackets. Explain each variable.
- **File editing**: Show how to open the file, show the content to add/modify with clear markers, then show how to save.
- **Links**: Link prerequisites to other DO tutorials. Use descriptive link text.

## Example Sections

**Prerequisites example:**
> ## Prerequisites
> 
> To follow this tutorial, you will need:
> 
> - One Ubuntu 22.04 server with a non-root user with `sudo` privileges and a firewall configured. You can set this up by following our [Initial Server Setup with Ubuntu 22.04](link) tutorial.
> - Redis installed on your server. Follow Steps 1-3 of our [How to Install Redis on Ubuntu 22.04](link) tutorial.
> - A domain name pointed at your server. You can purchase one from Namecheap or get one for free from Freenom.

**Step example:**
> ## Step 1 — Installing Nginx
> 
> Update your package index and install Nginx:
> 
> ```
> sudo apt update
> sudo apt install nginx
> ```
> 
> Verify the installation by checking the service status:
> 
> ```
> sudo systemctl status nginx
> ```
> 
> You should see output indicating the service is active:
> 
> ```
> Output
> ● nginx.service - A high performance web server
>    Active: active (running) since ...
> ```
> 
> With Nginx installed and running, you can move on to configuring the firewall.
