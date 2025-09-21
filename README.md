# Voiceflow - Social Media Platform

A modern social media platform built with Next.js, featuring OAuth authentication, real-time posting, and user profiles.

## 🌐 Live Demo

**Deployed URL**: https://voicef1ow.vercel.app

## ✨ Features

### 🔐 Authentication System
- **OAuth Integration**: Sign in with Google and GitHub
- **Credentials Authentication**: Email and password login/signup
- **Graceful Error Handling**: Resilient authentication with MongoDB fallback
- **Session Management**: Secure JWT-based sessions with NextAuth.js
- **Profile Completion**: Guided onboarding for new users

### 📱 Core Functionality
- **Social Feed**: View and interact with posts from all users
- **Create Posts**: Rich text posting with real-time updates
- **User Profiles**: Personal profile pages with user information and posts
- **Activity Feed**: Track likes, comments, follows, and interactions
- **Search**: Discover users and content (coming soon)
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### 🛡️ Security & Middleware
- **Route Protection**: Middleware-based authentication guards
- **CSRF Protection**: Built-in security measures
- **Database Resilience**: Graceful handling of MongoDB connection issues
- **Error Boundaries**: Comprehensive error handling throughout the app

### 🎨 Modern UI/UX
- **Dark/Light Theme**: Built-in theme switching
- **Component Library**: Built with Radix UI and shadcn/ui
- **Loading States**: Smooth loading indicators and skeleton screens
- **Toast Notifications**: Real-time feedback for user actions

## 🚀 Technologies Used

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Icons**: Lucide React
- **State Management**: React hooks and context

### Backend & Database
- **Authentication**: NextAuth.js v4
- **Database**: MongoDB Atlas with Mongoose
- **API Routes**: Next.js API routes
- **Validation**: Zod schema validation

### Deployment & DevOps
- **Hosting**: Vercel
- **Version Control**: Git with GitHub
- **Environment**: Node.js 18+
- **Package Manager**: npm

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account
- Google OAuth credentials
- GitHub OAuth credentials (optional)

### Environment Variables
Create a `.env.local` file with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Database
MONGODB_URI=your-mongodb-connection-string

# JWT
JWT_SECRET=your-jwt-secret
```

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Mohil2512/voiceflow.git
cd voiceflow

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
voiceflow/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   └── posts/         # Post management
│   ├── auth/              # Authentication pages
│   ├── activity/          # Activity feed page
│   ├── create/            # Post creation page
│   ├── profile/           # User profile page
│   └── search/            # Search functionality
├── components/            # Reusable components
│   ├── layout/           # Layout components
│   ├── post/             # Post-related components
│   └── ui/               # UI components (shadcn/ui)
├── lib/                  # Utilities and configurations
│   └── database/         # Database schemas and models
├── types/                # TypeScript type definitions
├── middleware.ts         # Next.js middleware for auth
└── vercel.json          # Vercel deployment config
```

## 🔒 Authentication Flow

1. **OAuth Sign-in**: Users can sign in with Google or GitHub
2. **Session Creation**: JWT tokens created with user information
3. **Profile Completion**: New users guided through profile setup
4. **Route Protection**: Middleware ensures authenticated access
5. **Graceful Fallbacks**: System handles database outages gracefully

## 🗃️ Database Schema

### Users Collection
```javascript
{
  email: String,
  name: String,
  username: String,
  avatar: String,
  profileComplete: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Posts Collection
```javascript
{
  content: String,
  author: ObjectId,
  createdAt: Date,
  likes: [ObjectId],
  comments: [Object],
  updatedAt: Date
}
```

## 🚀 Deployment

The application is deployed on Vercel with automatic deployments from the main branch.

### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Developer

**Mohil Pipaliya**
- GitHub: [@Mohil2512](https://github.com/Mohil2512)
- Email: mohilp02512@gmail.com

## 🔗 Links

- **Live App**: https://voicef1ow.vercel.app
- **Repository**: https://github.com/Mohil2512/voiceflow
- **Issues**: https://github.com/Mohil2512/voiceflow/issues

---

*Built with ❤️ using Next.js, MongoDB, and modern web technologies.*
