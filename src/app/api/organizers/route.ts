import { NextResponse } from "next/server";
import { organizerProfileService } from "@/services/workspace/organizer-profile.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pagination = parsePaginationFromUrl(url);

  const result = await organizerProfileService.search(
    {
      q: url.searchParams.get("q") ?? undefined,
      city: url.searchParams.get("city") ?? undefined,
      region: url.searchParams.get("region") ?? undefined,
      specialty: url.searchParams.get("specialty") ?? undefined,
      verified: url.searchParams.get("verified") === "true",
    },
    pagination
  );

  return NextResponse.json({ success: true, data: result });
}
