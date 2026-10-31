import { aiEnabled } from "@/lib/ai";
import { json } from "@/lib/http";

export async function GET() {
  return json({ ai: aiEnabled() });
}
