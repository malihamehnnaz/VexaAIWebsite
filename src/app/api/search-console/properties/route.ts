import { NextResponse } from 'next/server';
import { isAuthorizedForGa4 } from '@/lib/google/auth';
import { getValidAccessToken } from '@/lib/google/store';
import { googleErrorResponse } from '@/lib/google/respond';
import { getAccessibleSites } from '@/lib/google/search-console-property';

// GET /api/search-console/properties — the Search Console properties the
// connected Google account can actually access, so the Marketing Website can
// offer a property selector instead of anything being hard-coded. Handles
// both URL-prefix ("https://example.com/") and domain ("sc-domain:example.com")
// property formats, exactly as Google returns them.
//
// The `siteUrl` value from here is what every other /api/search-console/*
// endpoint accepts as ?property=...

export async function GET(request: Request) {
  if (!await isAuthorizedForGa4(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
  }

  try {
    const { accessToken } = await getValidAccessToken();
    const sites = await getAccessibleSites(accessToken);
    const defaultProperty = process.env.SEARCH_CONSOLE_PROPERTY ?? sites[0]?.siteUrl ?? null;

    return NextResponse.json({
      success: true,
      properties: sites.map(site => ({
        property: site.siteUrl,
        permissionLevel: site.permissionLevel,
        type: site.siteUrl.startsWith('sc-domain:') ? 'domain' : 'url-prefix',
        isDefault: site.siteUrl === defaultProperty,
      })),
      defaultProperty,
    });
  } catch (err) {
    return googleErrorResponse(err);
  }
}
