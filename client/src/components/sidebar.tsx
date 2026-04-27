import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { useCurrentUser } from "@/hooks/use-current-user";
import gameforgeIcon from "@assets/image_1762389418995.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SidebarProps {
  activeSection: string;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ activeSection, collapsed, onToggle }: SidebarProps) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Get real authenticated user data
  const userQuery = useCurrentUser();
  const user = userQuery.data;
  const displayName = user?.displayName || "User";
  const displayRole = user?.jobTitle || user?.role;
  const fallbackInitials = displayName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const buttonzUrl = import.meta.env.VITE_BUTTONZ_URL || "http://localhost:5001";

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      queryClient.clear();
      toast({
        title: "Logged out successfully",
        description: "See you soon!",
      });
      setLocation("/login");
      window.location.reload();
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const openExternalProduct = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Map navigation IDs to routes
  const getRouteForSection = (sectionId: string) => {
    switch (sectionId) {
      case 'dashboard': return '/dashboard';
      case 'projects': return '/projects';
      case 'game-engines': return '/game-engines';
      case 'asset-store': return '/asset-store';
      case 'distribution': return '/distribution';
      case 'analytics': return '/analytics';
      case 'community': return '/community';
      case 'calendar': return '/calendar';
      case 'store': return '/store';
      case 'library': return '/library';
      default: return '/dashboard';
    }
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-card border-r border-border flex flex-col z-40 transition-all duration-300 ${
      collapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Logo Section */}
      <div className="relative h-20 flex items-center border-b border-border px-6">
        <button
          onClick={onToggle}
          className={`absolute top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-accent transition-colors ${
            collapsed ? 'left-1/2 -translate-x-1/2' : 'right-2'
          }`}
          data-testid="button-sidebar-toggle"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        {!collapsed && (
          <Link href="/dashboard" className="flex-1">
            <div className="flex items-center cursor-pointer space-x-3">
              <img 
                src={gameforgeIcon} 
                alt="GameForge Logo" 
                className="w-10 h-10 rounded-lg" 
                data-testid="logo-icon"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground" data-testid="text-app-name">GameForge</h1>
                <p className="text-sm text-muted-foreground" data-testid="text-app-subtitle">Studio Platform</p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 sidebar-scrollbar overflow-y-auto">
        <ul className="space-y-2">
          {NAVIGATION_ITEMS
            .filter(item => !item.roles || item.roles.includes((user?.role || 'developer') as 'developer' | 'regular'))
            .map((item) => (
            <li key={item.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {item.external ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openExternalProduct(buttonzUrl)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openExternalProduct(buttonzUrl);
                        }
                      }}
                      className={`nav-item w-full flex items-center rounded-lg transition-all duration-200 cursor-pointer ${
                        collapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-4 py-3'
                      } ${
                        activeSection === item.id
                          ? 'active text-primary-foreground'
                          : 'hover:bg-accent text-foreground'
                      }`}
                      data-testid={`button-nav-${item.id}`}
                    >
                      <item.icon className={collapsed ? "w-7 h-7" : "w-6 h-6"} />
                      {!collapsed && <span className="font-medium">{item.label}</span>}
                    </div>
                  ) : (
                    <Link href={getRouteForSection(item.id)}>
                      <div
                        className={`nav-item w-full flex items-center rounded-lg transition-all duration-200 cursor-pointer ${
                          collapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-4 py-3'
                        } ${
                          activeSection === item.id
                            ? 'active text-primary-foreground'
                            : 'hover:bg-accent text-foreground'
                        }`}
                        data-testid={`button-nav-${item.id}`}
                      >
                        <item.icon className={collapsed ? "w-7 h-7" : "w-6 h-6"} />
                        {!collapsed && <span className="font-medium">{item.label}</span>}
                      </div>
                    </Link>
                  )}
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </nav>

      {/* Profile Section */}
      <div className={`border-t border-border relative ${collapsed ? 'p-2' : 'p-4'}`}>
        <button
          className={`w-full flex items-center rounded-lg hover:bg-accent transition-all duration-200 ${
            collapsed ? 'justify-center p-2' : 'space-x-3 p-3'
          }`}
          onClick={(e) => {
            e.preventDefault();
            if (!collapsed) {
              setProfileDropdownOpen(!profileDropdownOpen);
            }
          }}
          data-testid="button-profile-trigger"
          title={collapsed ? displayName : undefined}
        >
          <Avatar
            className={`border-2 border-border flex-shrink-0 ${
              collapsed ? 'w-8 h-8' : 'w-10 h-10'
            }`}
            data-testid="img-profile-avatar"
          >
            <AvatarImage src={user?.avatar || undefined} alt={displayName} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {fallbackInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 text-left">
              <div className="font-medium text-foreground" data-testid="text-user-name">{displayName}</div>
              {/* Only show role for developers */}
              {user && user.role !== "regular" && displayRole && (
                <div className="text-sm text-muted-foreground" data-testid="text-user-role">{displayRole}</div>
              )}
            </div>
          )}
          {!collapsed && (
            <i className={`fas fa-chevron-up text-muted-foreground transform transition-transform duration-200 ${
              profileDropdownOpen ? 'rotate-180' : ''
            }`} />
          )}
        </button>
        
        {/* Profile Dropdown - Only show when sidebar is not collapsed */}
        {profileDropdownOpen && !collapsed && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-popover border border-border rounded-lg shadow-lg z-50" data-testid="dropdown-profile">
            <div className="p-2">
              <button 
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-accent transition-colors duration-200"
                data-testid="button-view-profile"
                onClick={() => {
                  setLocation('/profile');
                  setProfileDropdownOpen(false);
                }}
              >
                <i className="fas fa-user w-4"></i>
                <span>View Profile</span>
              </button>
              <button 
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-accent transition-colors duration-200"
                data-testid="button-settings"
                onClick={() => {
                  setLocation('/settings');
                  setProfileDropdownOpen(false);
                }}
              >
                <i className="fas fa-cog w-4"></i>
                <span>Settings</span>
              </button>
              <hr className="my-2 border-border" />
              <button 
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors duration-200"
                data-testid="button-logout"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  setLogoutDialogOpen(true);
                }}
              >
                <i className="fas fa-sign-out-alt w-4"></i>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-border/50 bg-card/95 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-foreground">
              Are you sure you want to log out?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" data-testid="button-cancel-logout">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              data-testid="button-confirm-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
