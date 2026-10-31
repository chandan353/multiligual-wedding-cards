import { aiEnabled } from "@/lib/ai";
import { json } from "@/lib/http";
import { storageInfo } from "@/lib/store";

export async function GET() {
  return json({ ai: aiEnabled(), storage: storageInfo });
}
