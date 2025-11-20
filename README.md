# 📝 NoteFlow

> A modern, real-time collaborative note-taking application built with Next.js, Convex, and Clerk.

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Convex](https://img.shields.io/badge/Convex-1.29-orange?style=flat-square)](https://convex.dev/)
[![Clerk](https://img.shields.io/badge/Clerk-6.35-purple?style=flat-square)](https://clerk.com/)

---

## ✨ Features

### 🎨 Rich Text Editing
- **BlockNote Editor** - Powerful block-based editor with markdown support
- **Real-time Collaboration** - Multiple users can edit simultaneously
- **Auto-save** - Never lose your work with automatic saving
- **Syntax Highlighting** - Code blocks with syntax highlighting

### 📂 Document Management
- **Hierarchical Organization** - Organize notes in nested folders
- **Multiple Tabs** - Work on multiple documents simultaneously (Notion-style)
- **Quick Search** - Find documents instantly
- **Document Templates** - Start with pre-built templates

### 🖼️ Media Support
- **Cover Images** - Beautiful cover images for your documents
- **Image Upload** - Powered by Cloudinary CDN
- **Emoji Support** - Add emojis to documents and icons

### 💬 Collaboration Features
- **Comments System** - Add comments to specific sections
- **Bi-directional Highlighting** - Click comments to highlight text and vice versa
- **User Presence** - See who's viewing/editing documents
- **Share & Permissions** - Control who can view and edit

### 🌐 Internationalization
- **Multi-language Support** - Built with next-intl
- **Vietnamese & English** - Currently supported languages
- **Easy to Extend** - Add more languages easily

### ⚙️ Advanced Settings
- **Theme Customization** - Light/dark mode with custom themes
- **Storage Analytics** - Track Cloudinary usage
- **Data Export/Import** - Backup and restore your data
- **Keyboard Shortcuts** - Productivity-focused shortcuts

---

## 🚀 Tech Stack

### Frontend
- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - Latest React with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[BlockNote](https://www.blocknotejs.org/)** - Block-based rich text editor
- **[Radix UI](https://www.radix-ui.com/)** - Headless UI components
- **[Mantine](https://mantine.dev/)** - React components library

### Backend & Services
- **[Convex](https://convex.dev/)** - Real-time database and backend
- **[Clerk](https://clerk.com/)** - Authentication and user management
- **[Cloudinary](https://cloudinary.com/)** - Image hosting and optimization

### Developer Tools
- **[next-intl](https://next-intl-docs.vercel.app/)** - Internationalization
- **[next-themes](https://github.com/pacocoursey/next-themes)** - Theme management
- **[lucide-react](https://lucide.dev/)** - Beautiful icons
- **[usehooks-ts](https://usehooks-ts.com/)** - Custom React hooks

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **npm** or **yarn** package manager
- **Git** for version control

---

## 🛠️ Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/bihv/NoteFlow
cd NoteFlow
```

### 2️⃣ Install Dependencies

```bash
npm install
# or
yarn install
```

### 3️⃣ Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then fill in the required values in `.env.local`:

```bash
# Convex Database
CONVEX_DEPLOYMENT=your_convex_deployment
NEXT_PUBLIC_CONVEX_URL=your_convex_url

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Cloudinary CDN
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> [!IMPORTANT]
> See the [Setup Guides](#-setup-guides) section for detailed instructions on obtaining these keys.

### 4️⃣ Initialize Convex

```bash
npx convex dev --once
```

This will:
- Create your Convex development deployment
- Auto-populate `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` in `.env.local`
- Generate TypeScript types

### 5️⃣ Run Development Server

Open **two terminals**:

**Terminal 1 - Convex (database):**
```bash
npx convex dev
```

**Terminal 2 - Next.js (frontend):**
```bash
npm run dev
```

### 6️⃣ Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000) 🎉

---

## 📚 Setup Guides

Detailed setup instructions for each service:

| Service | Purpose | Documentation |
|---------|---------|---------------|
| 🗄️ **Convex** | Real-time database | [document/convex.md](./document/convex.md) |
| 🔐 **Clerk** | Authentication | [document/clerk.md](./document/clerk.md) |
| ☁️ **Cloudinary** | Image hosting | [document/cloudinary.md](./document/cloudinary.md) |

---

## 🏗️ Project Structure

```
NoteFlow/
├── convex/                 # Convex backend functions
│   ├── _generated/        # Auto-generated types
│   ├── documents.ts       # Document queries/mutations
│   └── schema.ts          # Database schema
├── document/              # Setup documentation
│   ├── clerk.md
│   ├── cloudinary.md
│   └── convex.md
├── public/                # Static assets
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   ├── comments/    # Comment system
│   │   ├── editor/      # BlockNote editor
│   │   ├── navigation/  # Sidebar navigation
│   │   ├── settings/    # Settings page
│   │   └── ui/          # Shared UI components
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom hooks
│   ├── i18n/            # Internationalization
│   ├── lib/             # Utility functions
│   └── messages/        # Translation files
├── .env.example         # Environment template
├── .env.local          # Your environment (gitignored)
├── package.json
└── README.md
```

---

## 🎯 Available Scripts

```bash
# Development
npm run dev          # Start development server
npx convex dev       # Start Convex dev server (in separate terminal)

# Build
npm run build        # Build for production
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint

# Database
npx convex dev --once       # Initialize Convex once
npx convex dev --clear-cache # Clear cache and restart
npx convex deploy            # Deploy to production
```

---

## 🌟 Key Features in Detail

### Tab System (Notion-style)
- Open multiple documents simultaneously
- Tabs persist across page reloads
- Smooth transitions with no flickering
- Configurable max tabs limit in settings

### Comment System
- Add comments to specific text selections
- Two-way highlighting (comment ↔ text)
- Independent scrolling for sidebar
- Collapsible comment panel

### Settings & Customization
- **Appearance**: Light/dark themes
- **Storage**: Cloudinary usage statistics
- **Export/Import**: Backup your data
- **Privacy**: Control visibility settings
- **Performance**: Optimize editor performance
- **Keyboard Shortcuts**: Comprehensive shortcuts
- **Language**: Switch between languages

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy Convex to production:
   ```bash
   npx convex deploy
   ```
5. Update Vercel with production Convex URLs

### Other Platforms

NoteFlow can be deployed to:
- **Netlify**
- **Railway**
- **DigitalOcean App Platform**

> [!NOTE]
> Always use separate Convex deployments for development and production.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Use TypeScript for type safety
- Follow ESLint configuration
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation when needed

---

## 📝 License

This project is licensed under the **MIT License**.

---

## 🙏 Acknowledgments

- [BlockNote](https://www.blocknotejs.org/) - Amazing block editor
- [Convex](https://convex.dev/) - Real-time backend platform
- [Clerk](https://clerk.com/) - User authentication
- [Cloudinary](https://cloudinary.com/) - Media management
- [Vercel](https://vercel.com/) - Hosting platform

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/bihv/NoteFlow/issues)
- **Email**: hobi2908@gmail.com
- **Author**: Bi Ho

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Offline mode with sync
- [ ] AI-powered suggestions
- [ ] Version history
- [ ] Team workspaces
- [ ] API for integrations
- [ ] More plugins and extensions

---

<div align="center">

**Made with ❤️ by Bi Ho**

⭐ Star this repo if you find it helpful!

</div>
