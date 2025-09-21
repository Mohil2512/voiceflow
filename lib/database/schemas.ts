// Database Schemas for Voiceflow App
// We'll use 3 separate MongoDB databases for better organization

// ==================== DATABASE 1: USER CREDENTIALS & AUTH ====================
export interface UserAuth {
  _id?: string;
  email: string;
  username: string; // unique
  password?: string; // only for manual sign-up
  
  // OAuth Provider Info
  providers: {
    google?: {
      id: string;
      email: string;
      verified: boolean;
    };
    github?: {
      id: string;
      username: string;
      email: string;
    };
  };
  
  // Account Status
  isEmailVerified: boolean;
  isProfileComplete: boolean;
  accountStatus: 'active' | 'suspended' | 'pending';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// ==================== DATABASE 2: USER PROFILES & PERSONAL INFO ====================
export interface UserProfile {
  _id?: string;
  userId: string; // Reference to UserAuth._id
  
  // Basic Information
  name: string;
  username: string; // synced with UserAuth
  email: string; // synced with UserAuth
  
  // Personal Details
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  phoneNumber?: string;
  
  // Profile Customization
  avatar?: string; // URL to profile image
  bio?: string;
  website?: string;
  location?: string;
  
  // Privacy Settings
  isPrivate: boolean;
  showEmail: boolean;
  showPhoneNumber: boolean;
  showDateOfBirth: boolean;
  
  // Social Stats (calculated fields)
  followersCount: number;
  followingCount: number;
  postsCount: number;
  
  // Required Fields Completion Status
  requiredFieldsComplete: {
    name: boolean;
    username: boolean;
    email: boolean;
    dateOfBirth: boolean;
    gender: boolean;
    phoneNumber: boolean;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ==================== DATABASE 3: USER ACTIVITIES & SOCIAL DATA ====================

// Posts Collection
export interface Post {
  _id?: string;
  userId: string; // Reference to UserAuth._id
  
  // Post Content
  content: string;
  images?: string[]; // Array of image URLs
  hashtags?: string[];
  mentions?: string[]; // Array of usernames mentioned
  
  // Engagement
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  
  // Post Settings
  isPublic: boolean;
  allowComments: boolean;
  isPinned: boolean;
  
  // Location & Context
  location?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
}

// Post Likes Collection
export interface PostLike {
  _id?: string;
  postId: string; // Reference to Post._id
  userId: string; // Reference to UserAuth._id
  createdAt: Date;
}

// Comments Collection
export interface Comment {
  _id?: string;
  postId: string; // Reference to Post._id
  userId: string; // Reference to UserAuth._id
  parentCommentId?: string; // For nested comments
  
  content: string;
  likesCount: number;
  repliesCount: number;
  
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
}

// Comment Likes Collection
export interface CommentLike {
  _id?: string;
  commentId: string; // Reference to Comment._id
  userId: string; // Reference to UserAuth._id
  createdAt: Date;
}

// Follows Collection
export interface Follow {
  _id?: string;
  followerId: string; // Reference to UserAuth._id (who follows)
  followingId: string; // Reference to UserAuth._id (being followed)
  createdAt: Date;
}

// User Activity Log
export interface ActivityLog {
  _id?: string;
  userId: string; // Reference to UserAuth._id
  
  activityType: 
    | 'post_created'
    | 'post_liked'
    | 'post_commented'
    | 'post_shared'
    | 'user_followed'
    | 'user_unfollowed'
    | 'profile_updated'
    | 'login'
    | 'logout';
    
  targetId?: string; // ID of the target object (post, user, etc.)
  metadata?: Record<string, any>; // Additional activity data
  
  createdAt: Date;
}

// Notifications Collection
export interface Notification {
  _id?: string;
  userId: string; // Reference to UserAuth._id (receiver)
  fromUserId?: string; // Reference to UserAuth._id (sender)
  
  type: 
    | 'like'
    | 'comment'
    | 'follow'
    | 'mention'
    | 'system';
    
  title: string;
  message: string;
  targetId?: string; // Reference to related object
  
  isRead: boolean;
  isActionable: boolean; // Can user take action on this notification
  
  createdAt: Date;
}

// ==================== VALIDATION SCHEMAS ====================

export const REQUIRED_FIELDS = {
  MANUAL_SIGNUP: ['name', 'username', 'email', 'password', 'dateOfBirth', 'gender', 'phoneNumber'],
  OAUTH_COMPLETION: ['dateOfBirth', 'gender', 'phoneNumber'], // Fields to ask after OAuth if missing
  PROFILE_BASIC: ['name', 'username', 'email']
} as const;

export const VALIDATION_RULES = {
  username: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
    reserved: ['admin', 'api', 'www', 'app', 'voiceflow', 'support']
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false
  },
  phoneNumber: {
    pattern: /^\+?[\d\s-()]+$/,
    minLength: 10
  }
} as const;