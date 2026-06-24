import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Gamepad2,
  Library,
  Sparkles,
  Star,
  Store,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ButtonzSidebarIcon } from "@/components/icons/buttonz-sidebar-icon";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { launchButtonz } from "@/lib/buttonz-launcher";
import type { GameLibrary, Project } from "@shared/schema";

interface GamerHomePageProps {
  sidebarCollapsed?: boolean;
}

const featuredEvents = [
  {
    title: "Weekend Community Playtest",
    date: "This Saturday",
    description: "Jump into new live builds and share feedback with creators.",
    type: "Playtest",
    time: "7:00 PM",
    location: "Buttonz Community Chat",
    host: "GameForge Community Team",
  },
  {
    title: "Indie Discovery Night",
    date: "Next Tuesday",
    description: "Find hidden gems from GameForge developers and studios.",
    type: "Showcase",
    time: "8:30 PM",
    location: "GameForge Community",
    host: "Store Curation Team",
  },
  {
    title: "Buttonz Game Chat",
    date: "All week",
    description: "Meet other gamers and talk about what you are playing.",
    type: "Community",
    time: "Open chat",
    location: "Buttonz",
    host: "Buttonz Moderators",
  },
];

const focusCards = [
  {
    eyebrow: "Today’s focus",
    title: "Play, discover, connect",
    description: "Your Gamer homepage gathers the parts of GameForge built for players.",
    icon: Gamepad2,
  },
  {
    eyebrow: "Featured discovery",
    title: "Browse newly live games",
    description: "Check out recent live projects and add something fresh to your library.",
    icon: Store,
  },
  {
    eyebrow: "Community buzz",
    title: "See what players are discussing",
    description: "Catch up on recent posts, playtests, and recommendations from the community.",
    icon: Users,
  },
  {
    eyebrow: "Upcoming event",
    title: "Join the next play session",
    description: "Open the Calendar to find events, showcases, and gamer meetups.",
    icon: Calendar,
  },
  {
    eyebrow: "Buttonz spotlight",
    title: "Chat with the community",
    description: "Launch Buttonz to coordinate with gamers and creators using your GFS identity.",
    icon: ButtonzSidebarIcon,
  },
];

type CommunityPostPreview = {
  id: string;
  author?: {
    displayName?: string;
    role?: string;
  };
  content: string;
  createdAt: string | Date;
  likesCount?: number;
  repliesCount?: number;
};

const fallbackCommunityPosts: CommunityPostPreview[] = [
  {
    id: "fallback-1",
    author: { displayName: "Alex Rodriguez", role: "Developer" },
    content: "Just pushed a new combat prototype. Looking for feedback from anyone who enjoys action RPGs.",
    createdAt: "2024-01-21T14:30:00Z",
    likesCount: 12,
    repliesCount: 4,
  },
  {
    id: "fallback-2",
    author: { displayName: "Emma Wilson", role: "Producer" },
    content: "What genres should we highlight in the next GameForge community showcase?",
    createdAt: "2024-01-21T12:00:00Z",
    likesCount: 24,
    repliesCount: 8,
  },
  {
    id: "fallback-3",
    author: { displayName: "David Kim", role: "Developer" },
    content: "Beta testing signups are opening soon for a cozy sci-fi exploration game.",
    createdAt: "2024-01-21T10:15:00Z",
    likesCount: 18,
    repliesCount: 6,
  },
];

function getGamePrice(gameName: string): number {
  const hash = gameName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const prices = [9.99, 14.99, 19.99, 24.99, 29.99, 39.99, 49.99];
  return prices[hash % prices.length];
}

function formatPlaytime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatDate(date: Date | string | null) {
  if (!date) return "Not played yet";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPostDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getRecentCommunityPosts() {
  if (typeof window === "undefined") {
    return fallbackCommunityPosts;
  }

  const savedPosts = window.localStorage.getItem("gameforge-community-posts");
  if (!savedPosts) {
    return fallbackCommunityPosts;
  }

  try {
    const parsed = JSON.parse(savedPosts) as CommunityPostPreview[];
    return parsed
      .filter((post) => post.content)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  } catch {
    return fallbackCommunityPosts;
  }
}

export default function GamerHomePage({ sidebarCollapsed = false }: GamerHomePageProps) {
  const [focusIndex, setFocusIndex] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<typeof featuredEvents[number] | null>(null);
  const userQuery = useCurrentUser();
  const { toast } = useToast();
  const buttonzUrl = import.meta.env.VITE_BUTTONZ_URL || "http://localhost:5175";
  const openButtonz = async () => {
    try {
      await launchButtonz(buttonzUrl);
    } catch {
      toast({
        title: "Could not open Buttonz",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: library = [], isLoading: isLoadingLibrary } = useQuery<GameLibrary[]>({
    queryKey: ["/api/library"],
    enabled: Boolean(userQuery.data?.id),
  });

  const liveGames = useMemo(
    () => projects.filter((game) => game.status === "live"),
    [projects],
  );

  const featuredGames = liveGames.slice(0, 3);
  const continuePlaying = [...library]
    .sort((a, b) => new Date(b.lastPlayed || b.purchasedAt).getTime() - new Date(a.lastPlayed || a.purchasedAt).getTime())
    .slice(0, 3);
  const totalPlaytime = library.reduce((total, item) => total + item.playTime, 0);
  const favoriteCount = library.filter((item) => item.favorite === 1).length;
  const recentCommunityPosts = useMemo(getRecentCommunityPosts, []);
  const focusCard = focusCards[focusIndex];
  const FocusIcon = focusCard.icon;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setFocusIndex((currentIndex) => (currentIndex + 1) % focusCards.length);
    }, 7000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className={`transition-all duration-300 ${sidebarCollapsed ? "ml-20" : "ml-64"}`}>
        <div className="container mx-auto px-6 py-8 space-y-8">
          <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/20 via-card to-background p-8 shadow-2xl shadow-primary/10">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
              <div>
                <h1 className="mb-3 text-4xl font-bold text-foreground">
                  Welcome back, {userQuery.data?.displayName || "Gamer"}
                </h1>
                <p className="max-w-2xl text-muted-foreground">
                  Jump back into your library, discover live games from GameForge creators, and connect with the community.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild className="rounded-xl">
                    <Link href="/store">
                      <Store className="mr-2 h-4 w-4" />
                      Browse Store
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl border-primary/30">
                    <Link href="/library">
                      <Library className="mr-2 h-4 w-4" />
                      Open Library
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-primary/30"
                    onClick={() => void openButtonz()}
                  >
                    <ButtonzSidebarIcon className="mr-2 h-4 w-4" />
                    Launch Buttonz
                  </Button>
                </div>
              </div>

              <Card className="relative border-primary/20 bg-card/70 p-6">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                  <FocusIcon className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">{focusCard.eyebrow}</p>
                <h2 className="mt-1 text-2xl font-bold">{focusCard.title}</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  {focusCard.description}
                </p>
                <div className="mt-5 flex gap-2">
                  {focusCards.map((card, index) => (
                    <button
                      key={card.title}
                      type="button"
                      aria-label={`Show ${card.title}`}
                      onClick={() => setFocusIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === focusIndex ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <Library className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Games owned</p>
              <p className="text-3xl font-bold">{library.length}</p>
            </Card>
            <Card className="p-5">
              <Clock className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Total play time</p>
              <p className="text-3xl font-bold">{formatPlaytime(totalPlaytime)}</p>
            </Card>
            <Card className="p-5">
              <Star className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Favorites</p>
              <p className="text-3xl font-bold">{favoriteCount}</p>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Continue Playing</h2>
                  <p className="text-sm text-muted-foreground">Pick up from your library.</p>
                </div>
                <Button asChild variant="ghost" className="rounded-xl">
                  <Link href="/library">View Library</Link>
                </Button>
              </div>

              {isLoadingLibrary ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              ) : continuePlaying.length > 0 ? (
                <div className="space-y-3">
                  {continuePlaying.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border bg-muted/20 p-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-2xl">
                        {item.gameIcon || "🎮"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{item.gameName}</p>
                        <p className="text-sm text-muted-foreground">
                          Last played {formatDate(item.lastPlayed)} · {formatPlaytime(item.playTime)} played
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="rounded-xl">
                        <Link href={`/game/${item.gameId}`}>Open</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center">
                  <Trophy className="mx-auto mb-3 h-10 w-10 text-primary" />
                  <h3 className="text-lg font-semibold">Start your library</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Browse the Store to find live games from GameForge creators.
                  </p>
                  <Button asChild className="mt-4 rounded-xl">
                    <Link href="/store">Discover Games</Link>
                  </Button>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Buttonz</h2>
                  <p className="text-sm text-muted-foreground">Chat with gamers and creators.</p>
                </div>
                <ButtonzSidebarIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/10 p-5">
                <Sparkles className="mb-3 h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold">Join the conversation</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Buttonz uses your GameForgeStudio account and gives you a dedicated place to coordinate, ask questions, and meet other players.
                </p>
                <Button
                  className="mt-5 w-full rounded-xl"
                  onClick={() => void openButtonz()}
                >
                  Launch Buttonz
                </Button>
              </div>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Featured Live Games</h2>
                  <p className="text-sm text-muted-foreground">Discover what creators have published.</p>
                </div>
                <Button asChild variant="ghost" className="rounded-xl">
                  <Link href="/store">View Store</Link>
                </Button>
              </div>

              {isLoadingProjects ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-48 animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              ) : featuredGames.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {featuredGames.map((game) => (
                    <Link key={game.id} href={`/game/${game.id}`}>
                      <Card className="h-full cursor-pointer overflow-hidden p-5 transition-all hover:-translate-y-1 hover:border-primary">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-3xl">
                          {game.icon}
                        </div>
                        <h3 className="line-clamp-1 font-semibold">{game.name}</h3>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{game.description}</p>
                        <div className="mt-4 flex items-center justify-between">
                          <Badge variant="secondary">{game.platform}</Badge>
                          <span className="font-bold text-primary">${getGamePrice(game.name).toFixed(2)}</span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                  No live games are available yet.
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold">Community Pulse</h2>
                </div>
              </div>
              <div className="space-y-3">
                {recentCommunityPosts.map((post) => (
                  <div key={post.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold">
                        {post.author?.displayName || "GameForge Community"}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatPostDate(post.createdAt)}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
                    <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                      <span>{post.likesCount || 0} likes</span>
                      <span>{post.repliesCount || 0} replies</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" className="mt-5 w-full rounded-xl border-primary/30">
                <Link href="/community">Open Community</Link>
              </Button>
            </Card>
          </section>

          <section>
            <Card className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-primary" />
                  <div>
                    <h2 className="text-2xl font-bold">Upcoming Events</h2>
                    <p className="text-sm text-muted-foreground">Playtests, releases, and community gatherings.</p>
                  </div>
                </div>
                <Button asChild variant="ghost" className="rounded-xl">
                  <Link href="/calendar">View Calendar</Link>
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {featuredEvents.map((event) => (
                  <button
                    key={event.title}
                    type="button"
                    onClick={() => setSelectedEvent(event)}
                    className="rounded-2xl border border-border bg-muted/20 p-5 text-left transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <Badge variant="outline" className="mb-3">{event.date}</Badge>
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
                  </button>
                ))}
              </div>
            </Card>
          </section>
        </div>
      </div>

      <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-xl">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Date</p>
                    <p className="mt-1 font-semibold">{selectedEvent.date}</p>
                  </div>
                  <div className="rounded-2xl border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Time</p>
                    <p className="mt-1 font-semibold">{selectedEvent.time}</p>
                  </div>
                  <div className="rounded-2xl border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                    <p className="mt-1 font-semibold">{selectedEvent.type}</p>
                  </div>
                  <div className="rounded-2xl border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Host</p>
                    <p className="mt-1 font-semibold">{selectedEvent.host}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                  <p className="mt-1 font-semibold">{selectedEvent.location}</p>
                </div>
                <Button asChild className="w-full rounded-xl">
                  <Link href="/calendar">Open Full Calendar</Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
