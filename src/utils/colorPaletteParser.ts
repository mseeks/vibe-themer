// Utility for parsing and normalizing color palette responses from OpenAI
import { normalizeHexColor } from './colorUtils';

export interface ColorPalette {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    foreground?: string;
    [key: string]: string | undefined;
}

export interface NormalizedColorPalette {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
}

/**
 * Parses and normalizes a color palette JSON string or raw response from OpenAI.
 * Applies defaults and attempts to fix common formatting issues.
 * Returns a normalized palette and a list of any invalid colors replaced.
 */
export function parseAndNormalizeColorPalette(
    colorResponse: string,
    defaultColors: NormalizedColorPalette
): { palette: NormalizedColorPalette, replaced: string[] } {
    let colorPalette: ColorPalette = {};
    let replaced: string[] = [];
    try {
        colorPalette = JSON.parse(colorResponse || '{}') as ColorPalette;
    } catch {
        // Try to extract a JSON object if the model included extra text
        const jsonMatch = colorResponse?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                colorPalette = JSON.parse(jsonMatch[0]);
            } catch {
                // Try to fix common JSON issues
                let fixedJson = jsonMatch[0]
                    .replace(/(\{|\,)\s*([a-zA-Z0-9_]+)\s*\:/g, '$1"$2":')
                    .replace(/'/g, '"')
                    .replace(/,\s*(\}|\])/g, '$1')
                    .replace(/\/\/.*$/gm, '');
                try {
                    colorPalette = JSON.parse(fixedJson);
                } catch {
                    // Last resort: manual extraction
                    colorPalette = {};
                    const extract = (key: string) => {
                        const m = colorResponse.match(new RegExp(key + "['\":\s]+([#0-9a-zA-Z]+)"));
                        return m ? m[1] : undefined;
                    };
                    colorPalette.primary = extract('primary');
                    colorPalette.secondary = extract('secondary');
                    colorPalette.accent = extract('accent');
                    colorPalette.background = extract('background');
                    colorPalette.foreground = extract('foreground');
                }
            }
        } else {
            // Try to extract individual color values
            const extract = (key: string) => {
                const m = colorResponse.match(new RegExp(key + "['\":\s]+([#0-9a-zA-Z]+)"));
                return m ? m[1] : undefined;
            };
            colorPalette.primary = extract('primary');
            colorPalette.secondary = extract('secondary');
            colorPalette.accent = extract('accent');
            colorPalette.background = extract('background');
            colorPalette.foreground = extract('foreground');
        }
    }
    // Normalize and apply defaults
    const result: NormalizedColorPalette = {
        primary: normalizeHexColor(colorPalette.primary || defaultColors.primary),
        secondary: normalizeHexColor(colorPalette.secondary || defaultColors.secondary),
        accent: normalizeHexColor(colorPalette.accent || defaultColors.accent),
        background: normalizeHexColor(colorPalette.background || defaultColors.background),
        foreground: normalizeHexColor(colorPalette.foreground || defaultColors.foreground),
    };
    // Validate
    const validHex = /^#[0-9a-f]{6}$/i;
    for (const key of Object.keys(result) as (keyof NormalizedColorPalette)[]) {
        if (!validHex.test(result[key])) {
            replaced.push(`${key}: ${result[key]}`);
            result[key] = defaultColors[key];
        }
        result[key] = result[key].toLowerCase();
    }
    return { palette: result, replaced };
}
