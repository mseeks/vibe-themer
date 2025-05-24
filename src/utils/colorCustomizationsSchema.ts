import { z } from "zod";

// Schema: { colors: [{ selector: string, color: hex string or CSS keyword }, ...] }
export const colorCustomizationsSchema = z.object({
  colors: z.array(
    z.object({
      selector: z.string(),
      color: z.string().regex(/^#[0-9a-f]{3}$|^#[0-9a-f]{6}$|^#[0-9a-f]{8}$|^(transparent|inherit|initial|unset)$/i),
    })
  ),
});
