/**
 * Color utility functions for the Dynamic Theme Changer extension
 */

/**
 * Normalizes a color string to a valid hex format
 */
export function normalizeColor(color: string): string {
    if (!color) return '#000000';
    
    // Clean input
    color = color.trim().replace(/['"]/g, '');
    
    // Convert RGB to hex
    const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        return `#${Number(r).toString(16).padStart(2, '0')}${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`;
    }
    
    // Convert HSL to hex
    const hslMatch = color.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i);
    if (hslMatch) {
        const [, h, s, l] = hslMatch;
        return hslToHex(Number(h), Number(s) / 100, Number(l) / 100);
    }
    
    // Add # prefix if missing
    if (!color.startsWith('#')) {
        color = '#' + color;
    }
    
    // Expand shorthand hex (#rgb -> #rrggbb)
    if (color.length === 4 && /^#[0-9a-fA-F]{3}$/i.test(color)) {
        const [, r, g, b] = color;
        color = `#${r}${r}${g}${g}${b}${b}`;
    }
    
    // Validate and fix hex length
    if (/^#[0-9a-f]{1,5}$/i.test(color)) {
        color = color.padEnd(7, '0');
    } else if (/^#[0-9a-f]{7,}$/i.test(color)) {
        color = color.substring(0, 7);
    }
    
    // Extract hex part if embedded in string
    const hexMatch = color.match(/#[0-9a-f]{6}/i);
    if (hexMatch) {
        color = hexMatch[0];
    }
    
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : '#000000';
}

function hslToHex(h: number, s: number, l: number): string {
    h /= 360;
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    
    let r: number, g: number, b: number;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
}

/**
 * Determines if a color represents a dark theme
 */
export function isDarkTheme(backgroundColor: string): boolean {
    const hex = normalizeColor(backgroundColor);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
}

/**
 * Gets a contrasting color (black or white) for the given background color
 */
export function getContrastColor(backgroundColor: string): string {
    return isDarkTheme(backgroundColor) ? '#ffffff' : '#000000';
}

/**
 * Adjusts the brightness of a color by a multiplier
 */
export function adjustColor(color: string, multiplier: number): string {
    const hex = normalizeColor(color);
    const r = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * multiplier)));
    const g = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * multiplier)));
    const b = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * multiplier)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
