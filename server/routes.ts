import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertUserSchema,
  insertAssetSchema, 
  insertCartItemSchema, 
  insertPurchaseSchema,
  insertChatSchema,
  insertChatMemberSchema,
  insertMessageSchema,
  type User,
  ProjectStatus, 
  GameEngine, 
  Platform,
  AssetCategory 
} from "@shared/schema";
import { z } from "zod";

// Extend the session to include user
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Authentication schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Create a comprehensive update schema for project validation
const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(1000).optional(),
  icon: z.string().min(1).max(10).optional(), // Allow emojis and short strings
  status: z.enum([ProjectStatus.NOT_STARTED, ProjectStatus.IN_PROGRESS, ProjectStatus.LIVE]).optional(),
  engine: z.enum([GameEngine.UNITY, GameEngine.UNREAL, GameEngine.GODOT, GameEngine.HTML5, GameEngine.CUSTOM]).optional(),
  platform: z.enum([Platform.PC, Platform.MOBILE, Platform.CONSOLE, Platform.VR, Platform.WEB]).optional(),
  ownerId: z.string().uuid().optional(),
  teamMembers: z.array(z.string().uuid()).optional(),
  features: z.array(z.string().min(1).max(200)).max(20).optional(),
  screenshots: z.array(z.string().url()).max(10).optional(),
}).strict(); // Reject unknown properties

// Validation helper function
function validateAndSanitizeInput<T>(schema: z.ZodType<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      throw new Error(`Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication Routes
  
  // User signup
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const validatedData = validateAndSanitizeInput(signupSchema, req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }
      
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);
      
      // Create user
      const { confirmPassword, ...userData } = validatedData;
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      // Set session
      req.session.userId = newUser.id;
      
      // Return user without password
      const { password, ...userResponse } = newUser;
      res.status(201).json({ 
        message: "Account created successfully", 
        user: userResponse 
      });
      
    } catch (error) {
      console.error("Signup error:", error);
      
      if (error instanceof Error && error.message.startsWith('Validation failed:')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  
  // User login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validatedData = validateAndSanitizeInput(loginSchema, req.body);
      
      // Find user by username or email
      let user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        // Try finding by email
        user = await storage.getUserByEmail(validatedData.username);
      }
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Return user without password
      const { password, ...userResponse } = user;
      res.json({ 
        message: "Login successful", 
        user: userResponse 
      });
      
    } catch (error) {
      console.error("Login error:", error);
      
      if (error instanceof Error && error.message.startsWith('Validation failed:')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  // User logout
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ message: "Failed to logout" });
        }
        
        res.clearCookie('connect.sid');
        res.json({ message: "Logout successful" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // Change password
  app.patch("/api/auth/change-password", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      // Get current user
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await storage.updateUser(user.id, { password: hashedPassword });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Development-only auto-login endpoint for testing
  if (process.env.NODE_ENV !== 'production') {
    app.post("/api/auth/dev-login", async (req: Request, res: Response) => {
      try {
        const { username } = req.body;
        
        // Default to alex.rodriguez if no username provided
        const targetUsername = username || 'alex.rodriguez';
        
        // Find user by username
        const user = await storage.getUserByUsername(targetUsername);
        if (!user) {
          return res.status(404).json({ message: "User not found for dev login" });
        }
        
        // Set session without password verification (dev only!)
        req.session.userId = user.id;
        
        // Return user without password
        const { password, ...userResponse } = user;
        res.json({ 
          message: "Development login successful", 
          user: userResponse 
        });
        
      } catch (error) {
        console.error("Dev login error:", error);
        res.status(500).json({ message: "Dev login failed" });
      }
    });
  }

  // Update user profile (only own profile)
  app.patch("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Check if user is trying to update their own profile
      if (req.session.userId !== id) {
        return res.status(403).json({ message: "Can only update your own profile" });
      }
      
      // Define allowed profile fields that can be updated
      const allowedFields = ['bio', 'status', 'location', 'skills', 'currentProject', 'availability', 'displayName', 'avatar', 'banner', 'jobTitle', 'portfolioLink', 'settings'];
      const updates: Partial<User> = {};
      
      // Filter and validate updates
      for (const [key, value] of Object.entries(req.body)) {
        if (allowedFields.includes(key)) {
          // Basic validation for specific fields
          if (key === 'bio' && typeof value === 'string' && value.length <= 500) {
            updates[key] = value;
          } else if (key === 'status' && typeof value === 'string' && value.length <= 100) {
            updates[key] = value;
          } else if (key === 'location' && typeof value === 'string' && value.length <= 100) {
            updates[key] = value;
          } else if (key === 'jobTitle' && (typeof value === 'string' && value.length <= 100 || value === null)) {
            updates[key] = value;
          } else if (key === 'portfolioLink' && (typeof value === 'string' && value.length <= 200 || value === null)) {
            updates[key] = value;
          } else if (key === 'skills' && Array.isArray(value) && value.length <= 20) {
            updates[key] = value.filter(skill => typeof skill === 'string' && skill.length <= 50);
          } else if (key === 'currentProject' && typeof value === 'string' && value.length <= 100) {
            updates[key] = value;
          } else if (key === 'availability' && typeof value === 'string' && ['online', 'away', 'busy', 'offline'].includes(value)) {
            updates[key] = value;
          } else if (key === 'displayName' && typeof value === 'string' && value.length <= 100) {
            updates[key] = value;
          } else if (key === 'avatar' && (typeof value === 'string' || value === null)) {
            updates[key] = value;
          } else if (key === 'banner' && (typeof value === 'string' || value === null)) {
            updates[key] = value;
          } else if (key === 'settings' && typeof value === 'object' && value !== null) {
            updates[key] = value;
          }
        }
      }
      
      // Check if there are any valid updates
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid update fields provided" });
      }
      
      // Update user profile
      const updatedUser = await storage.updateUser(id, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return updated user without password
      const { password, ...userResponse } = updatedUser;
      res.json(userResponse);
      
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  // Get current user with session-based authentication
  app.get("/api/user/current", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated via session
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        // Clear invalid session
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }
      
      // Return user without password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Error getting current user:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Get all projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to get projects" });
    }
  });

  // Get user's projects
  app.get("/api/projects/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const projects = await storage.getProjectsByUserId(userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user projects" });
    }
  });

  // Get specific project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to get project" });
    }
  });

  // Create new project
  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Update project with comprehensive validation
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate project ID format
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: "Invalid project ID format" });
      }
      
      // Validate and sanitize update data
      const validatedUpdates = validateAndSanitizeInput(updateProjectSchema, req.body);
      
      // Additional business logic validation
      if (Object.keys(validatedUpdates).length === 0) {
        return res.status(400).json({ message: "No valid update fields provided" });
      }
      
      const project = await storage.updateProject(id, validatedUpdates);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      
      if (error instanceof Error && error.message.startsWith('Validation failed:')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get the project to check ownership
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if current user is the project owner
      if (req.session.userId !== project.ownerId) {
        return res.status(403).json({ message: "Not authorized to delete this project" });
      }
      
      // Perform deletion
      const deleted = await storage.deleteProject(id);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Get user metrics
  app.get("/api/metrics/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const metrics = await storage.getMetricsByUserId(userId);
      if (!metrics) {
        return res.status(404).json({ message: "Metrics not found" });
      }
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get metrics" });
    }
  });

  // Asset Store Routes
  
  // Get all assets or filter by category
  app.get("/api/assets", async (req, res) => {
    try {
      const { category } = req.query;
      let assets;
      
      if (category && typeof category === 'string') {
        assets = await storage.getAssetsByCategory(category);
      } else {
        assets = await storage.getAllAssets();
      }
      
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  // Get single asset by ID
  app.get("/api/assets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error fetching asset:", error);
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  // Get all asset bundles
  app.get("/api/bundles", async (req, res) => {
    try {
      const bundles = await storage.getAllBundles();
      res.json(bundles);
    } catch (error) {
      console.error("Error fetching bundles:", error);
      res.status(500).json({ message: "Failed to fetch bundles" });
    }
  });

  // Get single bundle by ID
  app.get("/api/bundles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const bundle = await storage.getBundle(id);
      if (!bundle) {
        return res.status(404).json({ message: "Bundle not found" });
      }
      res.json(bundle);
    } catch (error) {
      console.error("Error fetching bundle:", error);
      res.status(500).json({ message: "Failed to fetch bundle" });
    }
  });

  // Get user's cart items
  app.get("/api/cart/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const cartItems = await storage.getCartItems(userId);
      res.json(cartItems);
    } catch (error) {
      console.error("Error fetching cart items:", error);
      res.status(500).json({ message: "Failed to fetch cart items" });
    }
  });

  // Add item to cart
  app.post("/api/cart", async (req, res) => {
    try {
      const validatedCartItem = validateAndSanitizeInput(insertCartItemSchema, req.body);
      const cartItem = await storage.addToCart(validatedCartItem);
      res.status(201).json(cartItem);
    } catch (error) {
      console.error("Error adding to cart:", error);
      
      if (error instanceof Error && error.message.startsWith('Validation failed:')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to add item to cart" });
    }
  });

  // Remove item from cart
  app.delete("/api/cart/:userId/:itemId", async (req, res) => {
    try {
      const { userId, itemId } = req.params;
      const removed = await storage.removeFromCart(userId, itemId);
      if (!removed) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ message: "Failed to remove item from cart" });
    }
  });

  // Clear user's cart
  app.delete("/api/cart/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.clearCart(userId);
      res.json({ message: "Cart cleared" });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Create purchase (simplified checkout)
  app.post("/api/purchases", async (req, res) => {
    try {
      const validatedPurchase = validateAndSanitizeInput(insertPurchaseSchema, req.body);
      const purchase = await storage.createPurchase(validatedPurchase);
      
      // In a real implementation, this would:
      // 1. Process payment with payment provider
      // 2. Clear cart items after successful purchase
      // 3. Send confirmation email
      // 4. Grant access to purchased assets
      
      res.status(201).json(purchase);
    } catch (error) {
      console.error("Error creating purchase:", error);
      
      if (error instanceof Error && error.message.startsWith('Validation failed:')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  // Get user's purchase history
  app.get("/api/purchases/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const purchases = await storage.getPurchasesByUserId(userId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // ===== GAME LIBRARY API ENDPOINTS =====

  // Get user's game library
  app.get("/api/library", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const library = await storage.getGameLibraryByUserId(req.session.userId);
      res.json(library);
    } catch (error) {
      console.error("Error fetching library:", error);
      res.status(500).json({ message: "Failed to fetch library" });
    }
  });

  // Add game to user's library (purchase)
  app.post("/api/library", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { game_id, game_name, game_icon, game_description } = req.body;

      // Validate required fields
      if (!game_id || !game_name) {
        return res.status(400).json({ message: "Game ID and name are required" });
      }

      // Check if game already in library
      const existingLibrary = await storage.getGameLibraryByUserId(req.session.userId);
      const alreadyOwned = existingLibrary.some((item: any) => item.gameId === game_id);
      
      if (alreadyOwned) {
        return res.status(409).json({ message: "Game already in your library" });
      }

      // Add game to library
        const libraryItem = await storage.addToGameLibrary({
          userId: req.session.userId,
          gameId: game_id,
          gameName: game_name,
          gameIcon: game_icon || "🎮",
          gameDescription: game_description || "",
          lastPlayed: null,
          playTime: 0,
          favorite: 0,
        });

      res.status(201).json(libraryItem);
    } catch (error) {
      console.error("Error adding game to library:", error);
      res.status(500).json({ message: "Failed to add game to library" });
    }
  });

  // ===== BUTTONZ CHAT API ENDPOINTS =====

  // Get all chats
  app.get("/api/chats", async (req, res) => {
    try {
      const chats = await storage.getAllChats();
      res.json(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  // Get single chat
  app.get("/api/chats/:chatId", async (req, res) => {
    try {
      const { chatId } = req.params;
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      res.json(chat);
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });

  // Get user's chats (chats they're members of)
  app.get("/api/users/:userId/chats", async (req, res) => {
    try {
      const { userId } = req.params;
      const chats = await storage.getUserChats(userId);
      res.json(chats);
    } catch (error) {
      console.error("Error fetching user chats:", error);
      res.status(500).json({ message: "Failed to fetch user chats" });
    }
  });

  // Create new chat
  app.post("/api/chats", async (req, res) => {
    try {
      const validatedChat = validateAndSanitizeInput(insertChatSchema, req.body);
      const chat = await storage.createChat(validatedChat);
      
      // Auto-add the creator as a member with admin role
      await storage.addChatMember({
        chatId: chat.id,
        userId: chat.createdBy,
        role: "admin"
      });
      
      res.status(201).json(chat);
    } catch (error) {
      console.error("Error creating chat:", error);
      
      if (error instanceof Error && error.message.startsWith('Validation failed:')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  // Update chat
  app.patch("/api/chats/:chatId", async (req, res) => {
    try {
      const { chatId } = req.params;
      const updates = req.body;
      
      const updatedChat = await storage.updateChat(chatId, updates);
      if (!updatedChat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      res.json(updatedChat);
    } catch (error) {
      console.error("Error updating chat:", error);
      res.status(500).json({ message: "Failed to update chat" });
    }
  });

  // Delete chat
  app.delete("/api/chats/:chatId", async (req, res) => {
    try {
      const { chatId } = req.params;
      const deleted = await storage.deleteChat(chatId);
      if (!deleted) {
        return res.status(404).json({ message: "Chat not found" });
      }
      res.json({ message: "Chat deleted successfully" });
    } catch (error) {
      console.error("Error deleting chat:", error);
      res.status(500).json({ message: "Failed to delete chat" });
    }
  });

  // Get chat members
  app.get("/api/chats/:chatId/members", async (req, res) => {
    try {
      const { chatId } = req.params;
      const members = await storage.getChatMembers(chatId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching chat members:", error);
      res.status(500).json({ message: "Failed to fetch chat members" });
    }
  });

  // Add member to chat
  app.post("/api/chats/:chatId/members", async (req, res) => {
    try {
      const { chatId } = req.params;
      const memberData = { ...req.body, chatId };
      
      const validatedMember = validateAndSanitizeInput(insertChatMemberSchema, memberData);
      const member = await storage.addChatMember(validatedMember);
      
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding chat member:", error);
      
      if (error instanceof Error && error.message.startsWith('Validation failed:')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to add chat member" });
    }
  });

  // Remove member from chat
  app.delete("/api/chats/:chatId/members/:userId", async (req, res) => {
    try {
      const { chatId, userId } = req.params;
      const removed = await storage.removeChatMember(chatId, userId);
      if (!removed) {
        return res.status(404).json({ message: "Chat member not found" });
      }
      res.json({ message: "Member removed from chat" });
    } catch (error) {
      console.error("Error removing chat member:", error);
      res.status(500).json({ message: "Failed to remove chat member" });
    }
  });

  // Get messages in a chat
  app.get("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;
      const { limit, offset } = req.query;
      
      const parsedLimit = limit ? parseInt(limit as string) : undefined;
      const parsedOffset = offset ? parseInt(offset as string) : undefined;
      
      const messages = await storage.getMessages(chatId, parsedLimit, parsedOffset);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send message to chat
  app.post("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;
      const messageData = { ...req.body, chatId };
      
      const validatedMessage = validateAndSanitizeInput(insertMessageSchema, messageData);
      const message = await storage.createMessage(validatedMessage);
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      
      if (error instanceof Error && error.message.startsWith('Validation failed:')) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Update message
  app.patch("/api/messages/:messageId", async (req, res) => {
    try {
      const { messageId } = req.params;
      const { content } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Content is required" });
      }
      
      const updatedMessage = await storage.updateMessage(messageId, content);
      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  // Delete message
  app.delete("/api/messages/:messageId", async (req, res) => {
    try {
      const { messageId } = req.params;
      const deleted = await storage.deleteMessage(messageId);
      if (!deleted) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
