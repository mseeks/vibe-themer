/**
 * Color utility functions for the Dynamic Theme Changer extension
 */

/**
 * Normalizes a color string to a valid hex color
 * Handles various formats and edge cases
 * @param color The color string to normalize
 * @returns A normalized hex color string
 */
export function normalizeHexColor(color: string): string {
    console.log(`Normalizing color: "${color}"`);
    
    // Handle undefined/null/empty cases
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
    
    // Handle shorthand hex codes (#fff -> #ffffff)
    if (color.length === 4 && /^#[0-9a-fA-F]{3}$/.test(color)) {
        const r = color[1];
        const g = color[2];
        const b = color[3];
        color = `#${r}${r}${g}${g}${b}${b}`;
        console.log(`-> Expanded shorthand hex: "${color}"`);
    }
    
    // Ensure lowercase
    color = color.toLowerCase();
    
    // Handle RGB format
    const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
        const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
        const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
        color = `#${r}${g}${b}`;
        console.log(`-> Converted RGB to hex: "${color}"`);
    }
    
    // Handle RGBA format by removing alpha
    const rgbaMatch = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d\.]+\s*\)/i);
    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
        const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
        const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
        color = `#${r}${g}${b}`;
        console.log(`-> Converted RGBA to hex (alpha removed): "${color}"`);
    }
    
    // Handle HSL format with simple conversion
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
    
    // Extract just the hex part if there's any extra text
    const hexMatch = color.match(/#[0-9a-f]{3,6}/i);
    if (hexMatch && hexMatch[0] !== color) {
        color = hexMatch[0];
        console.log(`-> Extracted hex part from string: "${color}"`);
    }
    
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
    
    // If all else fails, use a default color based on the original string
    // This creates a somewhat consistent color from the invalid input
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
