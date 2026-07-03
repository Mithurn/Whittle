import { getYouTubeEmbedUrl } from "@/lib/youtube";
import type { Resource } from "@/types/domain";

export type TabId = "video" | "reading" | "audio" | "master";

// Grouped by what a resource actually resolves to, not the AI's stated
// resource.type — a "podcast" search for an audio-typed resource has been
// observed live landing on a YouTube video page (see search-service.ts), so
// anything that resolves to a real YouTube embed belongs in the Video tab
// regardless of its label, and only genuinely non-video audio stays in Audio.
export function categorizeResources(resources: Resource[]) {
  const video: Resource[] = [];
  const reading: Resource[] = [];
  const audio: Resource[] = [];
  for (const resource of resources) {
    if (getYouTubeEmbedUrl(resource.url)) {
      video.push(resource);
    } else if (resource.type === "reading") {
      reading.push(resource);
    } else {
      audio.push(resource);
    }
  }
  return { video, reading, audio };
}

export function getAvailableTabs(resources: Resource[]): TabId[] {
  const { video, reading, audio } = categorizeResources(resources);
  const tabs: TabId[] = [];
  if (video.length > 0) tabs.push("video");
  if (reading.length > 0) tabs.push("reading");
  if (audio.length > 0) tabs.push("audio");
  tabs.push("master");
  return tabs;
}
