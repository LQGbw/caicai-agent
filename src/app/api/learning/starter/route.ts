import { reviewedDeepAgentsPlan } from "@/lib/learning/reviewed-course";
export async function GET() { return Response.json(reviewedDeepAgentsPlan(), { headers: { "Cache-Control": "no-store" } }); }
