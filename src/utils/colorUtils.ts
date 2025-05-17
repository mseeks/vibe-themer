/**
 * Color utility functions for the Dynamic Theme Changer extension
 */

/**
 * Cleans and validates a color string input
 * @param color The input color string
 * @returns Cleaned color string with # prefix
 */
function cleanColorInput(color: string): string {
    if (!color) {
        console.log('-> Empty color, using default black');
        return '#000000'; // Default to black for undefined/null
    }
    
    // Remove any whitespace and quotes
    color = color.trim().replace(/['"]/g, '');
    console.log(`-> After trimming and removing quotes: "${color}"`);
    
    // Add # if it's missing
    if (!color.startsWith('#')) {
        color = '#' + color;
        console.log(`-> Added # prefix: "${color}"`);
    }
    
    return color.toLowerCase();
}

/**
 * Expands shorthand hex codes (#rgb -> #rrggbb)
 * @param color The hex color string
 * @returns Expanded hex color string if shorthand, or original
 */
function expandShorthandHex(color: string): string {
    if (color.length === 4 && /^#[0-9a-fA-F]{3}$/.test(color)) {
        const r = color[1];
        const g = color[2];
        const b = color[3];
        color = `#${r}${r}${g}${g}${b}${b}`;
        console.log(`-> Expanded shorthand hex: "${color}"`);
    }
    return color;
}

/**
 * Converts RGB format to hex
 * @param color The color string that might be in RGB format
 * @returns Hex color string if RGB was detected, or original
 */
function convertRgbToHex(color: string): string {
    const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
        const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
        const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
        color = `#${r}${g}${b}`;
        console.log(`-> Converted RGB to hex: "${color}"`);
    }
    return color;
}

/**
 * Converts RGBA format to hex (removing alpha)
 * @param color The color string that might be in RGBA format
 * @returns Hex color string if RGBA was detected, or original
 */
function convertRgbaToHex(color: string): string {
    const rgbaMatch = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d\.]+\s*\)/i);
    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
        const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
        const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
        color = `#${r}${g}${b}`;
        console.log(`-> Converted RGBA to hex (alpha removed): "${color}"`);
    }
    return color;
}

/**
 * Converts HSL format to hex
 * @param color The color string that might be in HSL format
 * @returns Hex color string if HSL was detected, or original
 */
function convertHslToHex(color: string): string {
    const hslMatch = color.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)/i);
    if (hslMatch) {
        // Basic HSL to RGB conversion, not perfect but a fallback
        const h = parseInt(hslMatch[1]) / 360;
        const s = parseInt(hslMatch[2]) / 100;
        const l = parseInt(hslMatch[3]) / 100;
        
        // Convert HSL to RGB using algorithm
        let r, g, b;
        if (s === 0) {
            r = g = b = Math.round(l * 255);
        } else {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
            g = Math.round(hue2rgb(p, q, h) * 255);
            b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
        }
        
        color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        console.log(`-> Converted HSL to hex: "${color}"`);
    }
    return color;
}

/**
 * Extracts a valid hex part from a string
 * @param color The color string that might contain a hex code
 * @returns The extracted hex part if found, or original
 */
function extractHexPart(color: string): string {
    const hexMatch = color.match(/#[0-9a-f]{3,6}/i);
    if (hexMatch && hexMatch[0] !== color) {
        color = hexMatch[0];
        console.log(`-> Extracted hex part from string: "${color}"`);
    }
    return color;
}

/**
 * Validates and fixes hex length (padding or truncating)
 * @param color The hex color string to validate
 * @returns A valid 6-digit hex color or original if valid
 */
function validateHexLength(color: string): string {
    // Return as is if it passes the hex validation
    if (/^#[0-9a-f]{6}$/i.test(color)) {
        console.log(`-> Valid 6-digit hex color: "${color}"`);
        return color.toLowerCase();
    }
    
    // Handle truncated hex (less than 6 digits)
    if (/^#[0-9a-f]{1,5}$/i.test(color)) {
        // Pad with zeros if needed
        color = color.padEnd(7, '0');
        console.log(`-> Padded hex to 6 digits: "${color}"`);
        return color.toLowerCase();
    }
    
    // Handle extended hex (more than 6 digits) by truncating
    if (/^#[0-9a-f]{7,}$/i.test(color)) {
        color = color.substring(0, 7);
        console.log(`-> Truncated hex to 6 digits: "${color}"`);
        return color.toLowerCase();
    }
    
    return color;
}

/**
 * Generates a fallback color from a string
 * @param color The original color string
 * @returns A generated hex color
 */
function generateFallbackColor(color: string): string {
    console.warn(`Could not normalize color: "${color}", using fallback algorithm`);
    
    // Generate a deterministic color based on the input string
    let hash = 0;
    for (let i = 0; i < color.length; i++) {
        hash = color.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert hash to a valid hex color
    let fallbackColor = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        fallbackColor += value.toString(16).padStart(2, '0');
    }
    
    console.log(`-> Generated fallback color: "${fallbackColor}"`);
    return fallbackColor;
}

/**
 * Normalizes a color string to a valid hex color
 * Handles various formats and edge cases
 * @param color The color string to normalize
 * @returns A normalized hex color string
 */
export function normalizeHexColor(color: string): string {
    console.log(`Normalizing color: "${color}"`);
    
    // Clean and validate input
    color = cleanColorInput(color);
    
    // Convert various formats to hex
    color = expandShorthandHex(color);
    color = convertRgbToHex(color);
    color = convertRgbaToHex(color);
    color = convertHslToHex(color);
    
    // Extract hex part if mixed with other text
    color = extractHexPart(color);
    
    // Validate and fix hex length
    color = validateHexLength(color);
    
    // Check if we have a valid hex color
    if (/^#[0-9a-f]{6}$/i.test(color)) {
        return color;
    }
    
    // If all else fails, use the fallback algorithm
    return generateFallbackColor(color);
}

/**
 * Determines a contrasting color (black or white) for text
 * @param hexcolor The hex color to determine a contrast for
 * @param opacity Optional opacity value for the contrast color
 * @returns A contrasting color as hex or rgba string
 */
export function getContrastColor(hexcolor: string, opacity: number = 1): string {
    hexcolor = hexcolor.replace("#", "");
    const r = parseInt(hexcolor.substring(0, 2), 16);
    const g = parseInt(hexcolor.substring(2, 4), 16);
    const b = parseInt(hexcolor.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    // If opacity is provided and less than 1, return rgba
    if (opacity < 1) {
        return (yiq >= 128) ? 
            `rgba(0, 0, 0, ${opacity})` : 
            `rgba(255, 255, 255, ${opacity})`;
    }
    
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

/**
 * Adjusts a color's brightness or darkness
 * @param hexcolor The hex color to adjust
 * @param factor The factor to adjust by (> 1 brightens, < 1 darkens)
 * @returns The adjusted hex color
 */
export function adjustColor(hexcolor: string, factor: number): string {
    // If the factor is 1 or undefined, return the original color
    if (factor === 1) {
        return hexcolor;
    }
    
    // Remove the # if it exists
    hexcolor = hexcolor.replace("#", "");
    
    // Parse the hex color
    let r = parseInt(hexcolor.substring(0, 2), 16);
    let g = parseInt(hexcolor.substring(2, 4), 16);
    let b = parseInt(hexcolor.substring(4, 6), 16);
    
    if (factor > 1) {
        // Brighten
        r = Math.min(255, Math.round(r * factor));
        g = Math.min(255, Math.round(g * factor));
        b = Math.min(255, Math.round(b * factor));
    } else {
        // Darken
        r = Math.round(r * factor);
        g = Math.round(g * factor);
        b = Math.round(b * factor);
    }
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Determines if a background color is dark or light
 * @param backgroundColor The hex color to check
 * @returns True if the background is dark, false otherwise
 */
export function isDarkTheme(backgroundColor: string): boolean {
    backgroundColor = backgroundColor.replace("#", "");
    const r = parseInt(backgroundColor.substring(0, 2), 16);
    const g = parseInt(backgroundColor.substring(2, 4), 16);
    const b = parseInt(backgroundColor.substring(4, 6), 16);
    
    // Calculate perceived brightness using the formula (0.299*R + 0.587*G + 0.114*B)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // If brightness is less than 128, consider it a dark background
    return brightness < 128;
}
