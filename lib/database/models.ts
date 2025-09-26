import mongoose, { Schema, Document } from 'mongoose'
import { UserAuth, UserProfile, Post, PostLike, Comment, CommentLike, Follow, ActivityLog, Notification } from './schemas'
import { connectToAuthDB, connectToProfilesDB, connectToActivitiesDB } from './mongodb'

// ==================== AUTH DATABASE MODELS ====================

interface IUserAuth extends Omit<UserAuth, '_id'>, Document {}

const userAuthSchema = new Schema<IUserAuth>({
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String }, // Only for manual sign-up
  
  providers: {
    google: {
      id: String,
      email: String,
      verified: { type: Boolean, default: false }
    },
    github: {
      id: String,
      username: String,
      email: String
    }
  },
  
  isEmailVerified: { type: Boolean, default: false },
  isProfileComplete: { type: Boolean, default: false },
  accountStatus: { 
    type: String, 
    enum: ['active', 'suspended', 'pending'], 
    default: 'pending' 
  },
  
  lastLoginAt: Date,
}, {
  timestamps: true,
  collection: 'users_auth'
})

// Indexes for performance
userAuthSchema.index({ email: 1 }, { unique: true })
userAuthSchema.index({ username: 1 }, { unique: true })
userAuthSchema.index({ 'providers.google.id': 1 })
userAuthSchema.index({ 'providers.github.id': 1 })

// ==================== PROFILES DATABASE MODELS ====================

interface IUserProfile extends Omit<UserProfile, '_id'>, Document {}

const userProfileSchema = new Schema<IUserProfile>({
  userId: { type: String, required: true, unique: true }, // Reference to UserAuth._id
  
  // Basic Information
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  email: { type: String, required: true, lowercase: true },
  
  // Personal Details
  dateOfBirth: Date,
  gender: { 
    type: String, 
    enum: ['male', 'female', 'other', 'prefer-not-to-say'] 
  },
  phoneNumber: String,
  
  // Profile Customization
  avatar: String,
  bio: String,
  website: String,
  
  // Privacy Settings
  isPrivate: { type: Boolean, default: false },
  showEmail: { type: Boolean, default: false },
  showPhoneNumber: { type: Boolean, default: false },
  showDateOfBirth: { type: Boolean, default: false },
  
  // Social Stats
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  postsCount: { type: Number, default: 0 },
  
  // Required Fields Completion Status
  requiredFieldsComplete: {
    name: { type: Boolean, default: false },
    username: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    dateOfBirth: { type: Boolean, default: false },
    gender: { type: Boolean, default: false },
    phoneNumber: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  collection: 'user_profiles'
})

// Indexes
userProfileSchema.index({ userId: 1 }, { unique: true })
userProfileSchema.index({ username: 1 }, { unique: true })
userProfileSchema.index({ email: 1 })

// ==================== ACTIVITIES DATABASE MODELS ====================

interface IPost extends Omit<Post, '_id'>, Document {}
interface IPostLike extends Omit<PostLike, '_id'>, Document {}
interface IComment extends Omit<Comment, '_id'>, Document {}
interface ICommentLike extends Omit<CommentLike, '_id'>, Document {}
interface IFollow extends Omit<Follow, '_id'>, Document {}
interface IActivityLog extends Omit<ActivityLog, '_id'>, Document {}
interface INotification extends Omit<Notification, '_id'>, Document {}

const postSchema = new Schema<IPost>({
  userId: { type: String, required: true },
  username: { type: String, required: true }, // Store username for easy display
  
  content: { type: String, required: true, maxlength: 2000 },
  images: [String],
  hashtags: [String],
  mentions: [String],
  
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  
  isPublic: { type: Boolean, default: true },
  allowComments: { type: Boolean, default: true },
  isPinned: { type: Boolean, default: false },
  
  editedAt: Date,
}, {
  timestamps: true,
  collection: 'posts'
})

const postLikeSchema = new Schema<IPostLike>({
  postId: { type: String, required: true },
  userId: { type: String, required: true },
}, {
  timestamps: true,
  collection: 'post_likes'
})

const commentSchema = new Schema<IComment>({
  postId: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true }, // Store username for easy display
  parentCommentId: String,
  
  content: { type: String, required: true, maxlength: 1000 },
  likesCount: { type: Number, default: 0 },
  repliesCount: { type: Number, default: 0 },
  
  editedAt: Date,
}, {
  timestamps: true,
  collection: 'comments'
})

const commentLikeSchema = new Schema<ICommentLike>({
  commentId: { type: String, required: true },
  userId: { type: String, required: true },
}, {
  timestamps: true,
  collection: 'comment_likes'
})

const followSchema = new Schema<IFollow>({
  followerId: { type: String, required: true },
  followingId: { type: String, required: true },
}, {
  timestamps: true,
  collection: 'follows'
})

const activityLogSchema = new Schema<IActivityLog>({
  userId: { type: String, required: true },
  activityType: { 
    type: String, 
    required: true,
    enum: [
      'post_created', 'post_liked', 'post_commented', 'post_shared',
      'user_followed', 'user_unfollowed', 'profile_updated',
      'login', 'logout'
    ]
  },
  targetId: String,
  metadata: Schema.Types.Mixed,
}, {
  timestamps: true,
  collection: 'activity_logs'
})

const notificationSchema = new Schema<INotification>({
  userId: { type: String, required: true },
  fromUserId: String,
  
  type: { 
    type: String, 
    required: true,
    enum: ['like', 'comment', 'follow', 'mention', 'system']
  },
  
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetId: String,
  
  isRead: { type: Boolean, default: false },
  isActionable: { type: Boolean, default: false },
}, {
  timestamps: true,
  collection: 'notifications'
})

// Indexes for activities database
postSchema.index({ userId: 1, createdAt: -1 })
postSchema.index({ hashtags: 1 })
postSchema.index({ mentions: 1 })

postLikeSchema.index({ postId: 1, userId: 1 }, { unique: true })
postLikeSchema.index({ userId: 1 })

commentSchema.index({ postId: 1, createdAt: -1 })
commentSchema.index({ userId: 1 })
commentSchema.index({ parentCommentId: 1 })

commentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true })

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true })
followSchema.index({ followingId: 1 })

activityLogSchema.index({ userId: 1, createdAt: -1 })
activityLogSchema.index({ activityType: 1 })

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })

// ==================== MODEL CREATION FUNCTIONS ====================

let authConnection: mongoose.Connection
let profilesConnection: mongoose.Connection
let activitiesConnection: mongoose.Connection

export const getAuthModels = async () => {
  if (!authConnection) {
    authConnection = await connectToAuthDB()
  }
  
  return {
    UserAuth: authConnection.models.UserAuth || authConnection.model<IUserAuth>('UserAuth', userAuthSchema)
  }
}

export const getProfileModels = async () => {
  if (!profilesConnection) {
    profilesConnection = await connectToProfilesDB()
  }
  
  return {
    UserProfile: profilesConnection.models.UserProfile || profilesConnection.model<IUserProfile>('UserProfile', userProfileSchema)
  }
}

export const getActivityModels = async () => {
  if (!activitiesConnection) {
    activitiesConnection = await connectToActivitiesDB()
  }
  
  return {
    Post: activitiesConnection.models.Post || activitiesConnection.model<IPost>('Post', postSchema),
    PostLike: activitiesConnection.models.PostLike || activitiesConnection.model<IPostLike>('PostLike', postLikeSchema),
    Comment: activitiesConnection.models.Comment || activitiesConnection.model<IComment>('Comment', commentSchema),
    CommentLike: activitiesConnection.models.CommentLike || activitiesConnection.model<ICommentLike>('CommentLike', commentLikeSchema),
    Follow: activitiesConnection.models.Follow || activitiesConnection.model<IFollow>('Follow', followSchema),
    ActivityLog: activitiesConnection.models.ActivityLog || activitiesConnection.model<IActivityLog>('ActivityLog', activityLogSchema),
    Notification: activitiesConnection.models.Notification || activitiesConnection.model<INotification>('Notification', notificationSchema)
  }
}

// Type exports for use in API routes
export type { IUserAuth, IUserProfile, IPost, IPostLike, IComment, ICommentLike, IFollow, IActivityLog, INotification }