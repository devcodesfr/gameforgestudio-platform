import type { UserRoleType } from "@shared/schema";

const developerRoutes = [
  "/dashboard",
  "/projects",
  "/game-engines",
  "/asset-store",
  "/asset/",
  "/bundle/",
  "/cart",
  "/distribution",
  "/analytics",
];

const gamerRoutes = [
  "/home",
  "/library",
  "/store",
  "/store/cart",
  "/game/",
];

const sharedRoutes = [
  "/",
  "/community",
  "/calendar",
  "/profile",
  "/settings",
];

function normalizePath(path: string) {
  const [withoutQuery] = path.split("?");
  const [withoutHash] = withoutQuery.split("#");
  return withoutHash || "/";
}

function matchesRoute(path: string, route: string) {
  if (route === "/") {
    return path === "/";
  }

  if (route.endsWith("/")) {
    return path.startsWith(route);
  }

  return path === route;
}

export function getDefaultRouteForRole(role?: UserRoleType | string | null) {
  return role === "regular" ? "/home" : "/dashboard";
}

export function canAccessRoute(path: string, role?: UserRoleType | string | null) {
  const normalizedPath = normalizePath(path);

  if (sharedRoutes.some((route) => matchesRoute(normalizedPath, route))) {
    return true;
  }

  const roleRoutes = role === "regular" ? gamerRoutes : developerRoutes;
  return roleRoutes.some((route) => matchesRoute(normalizedPath, route));
}
