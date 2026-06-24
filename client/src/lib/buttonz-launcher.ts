import { apiRequest } from "@/lib/queryClient";

function buildButtonzLaunchUrl(buttonzUrl: string, handoffToken: string) {
  const url = new URL(buttonzUrl);
  url.searchParams.set("from", "gfs");
  url.searchParams.set("handoff", handoffToken);
  url.searchParams.set("gfsOrigin", window.location.origin);
  return url.toString();
}

export async function launchButtonz(buttonzUrl: string) {
  const openedTab = window.open("about:blank", "_blank");
  if (openedTab) {
    openedTab.opener = null;
  }

  try {
    const response = await apiRequest("POST", "/api/auth/buttonz-handoff", {});
    const { token } = await response.json() as { token?: string };

    if (!token) {
      throw new Error("Buttonz handoff token was not returned");
    }

    const launchUrl = buildButtonzLaunchUrl(buttonzUrl, token);
    if (openedTab) {
      openedTab.location.href = launchUrl;
      return;
    }

    window.open(launchUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    openedTab?.close();
    throw error;
  }
}
