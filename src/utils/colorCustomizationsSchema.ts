import { z } from "zod";

// Schema: { colors: [{ selector: string, color: hex string }, ...] }
export const colorCustomizationsSchema = z.object({
  colors: z.array(
    z.object({
      selector: z.string(),
      color: z.string().regex(/^#[0-9a-f]{6}$/),
    })
  ),
});
