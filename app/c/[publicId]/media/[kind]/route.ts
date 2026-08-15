import {
  getPublicChampionshipOrganizerMediaUrl,
  type PublicChampionshipOrganizerMediaKind,
} from "@/lib/data/public-championship";

type PublicChampionshipMediaRouteProps = {
  params: Promise<{ publicId: string; kind: string }>;
};

const allowedKinds = new Set<PublicChampionshipOrganizerMediaKind>([
  "logo",
  "cover",
]);
const allowedContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: PublicChampionshipMediaRouteProps,
) {
  const { publicId, kind } = await params;
  if (!allowedKinds.has(kind as PublicChampionshipOrganizerMediaKind)) {
    return unavailable();
  }

  const signedUrl = await getPublicChampionshipOrganizerMediaUrl(
    publicId,
    kind as PublicChampionshipOrganizerMediaKind,
  );
  if (!signedUrl) return unavailable();

  try {
    const media = await fetch(signedUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    const contentType = media.headers.get("content-type")?.split(";", 1)[0];
    if (!media.ok || !contentType || !allowedContentTypes.has(contentType)) {
      return unavailable();
    }

    return new Response(media.body, {
      status: 200,
      headers: {
        ...privateHeaders,
        "Content-Type": contentType,
      },
    });
  } catch {
    return unavailable();
  }
}

function unavailable() {
  return new Response(null, { status: 404, headers: privateHeaders });
}
