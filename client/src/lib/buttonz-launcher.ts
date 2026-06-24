import { apiRequest } from "@/lib/queryClient";

export async function launchButtonz() {
  const openedTab = window.open("about:blank", "_blank");
  if (openedTab) {
    openedTab.opener = null;
  }

  try {
    const response = await apiRequest("POST", "/api/external-apps/buttonz/launch", {});
    const { launchUrl } = await response.json() as { launchUrl?: string };

    if (!launchUrl) {
      throw new Error("Buttonz launch URL was not returned");
    }

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
