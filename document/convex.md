# 🗄️ Convex Database Setup Guide

Complete guide to setting up Convex for NoteFlow - A modern real-time database with built-in TypeScript support.

---

## 📋 Overview

**Convex** is a reactive backend-as-a-service that provides:
- 🔄 Real-time data sync
- 🔒 Built-in authentication integration
- 📝 Automatically generated TypeScript types
- ⚡ Serverless functions and queries
- 🚀 Zero-config deployment

This guide will help you set up Convex and connect it with Clerk authentication for NoteFlow.

---

## 🚀 Step 1: Create Convex Account

1. **Sign Up**
   - Navigate to [https://convex.dev](https://convex.dev)
   - Sign up for a new account or sign in
   - You can use GitHub, Google, or email

2. **Create a Project**
   - Click **"Create a project"**
   - Enter project name: `NoteFlow`
   - Select your preferred region

> [!NOTE]
> Choose the region closest to your users for optimal performance. You can change this later if needed.

---

## ⚙️ Step 2: Initialize Convex Development Deployment

Run the following command in your project terminal:

```bash
npx convex dev --once
```

### What This Command Does

This command will:

1. ✅ Prompt you to sign in to Convex
2. ✅ Create a development deployment
3. ✅ Automatically add environment variables to `.env.local`:
   - `CONVEX_DEPLOYMENT`
   - `NEXT_PUBLIC_CONVEX_URL`
4. ✅ Generate TypeScript type files in `convex/_generated/`

> [!TIP]
> The `--once` flag runs the deployment once without entering watch mode. This is perfect for initial setup!

---

## 📁 Step 3: Verify Setup

### Check Generated Files

After running the command, verify these files exist:

```
convex/
├── _generated/
│   ├── api.d.ts          # API types
│   ├── dataModel.d.ts    # Database schema types
│   └── server.d.ts       # Server-side types
└── convex.json           # Configuration file
```

### Check Environment Variables

Your `.env.local` should now include:

```bash
# Convex Database
CONVEX_DEPLOYMENT=dev:your-deployment-name-12345
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

> [!IMPORTANT]
> These variables are auto-generated. Don't manually edit them unless you know what you're doing!

---

## 🔗 Step 4: Connect with Clerk Authentication

To enable authentication in your Convex database, you need to configure Clerk integration.

### Add Clerk Issuer URL to Convex

Run this command (replace with your actual Clerk issuer URL):

```bash
npx convex env set CLERK_ISSUER_URL https://your-app.clerk.accounts.dev
```

> [!NOTE]
> Get your Clerk Issuer URL from the Clerk Dashboard → JWT Templates → Convex template.
> 
> See [clerk.md](./clerk.md) for detailed Clerk setup instructions.

---

## 🔄 Step 5: Run Development Mode

For ongoing development, use watch mode:

```bash
npx convex dev
```

This will:
- 👁️ Watch for changes in your `convex/` directory
- 🔄 Automatically push schema changes
- 🔨 Regenerate TypeScript types on changes
- 📊 Show logs from your Convex functions

> [!TIP]
> Keep this running in a separate terminal while developing. Combined with `npm run dev`, you'll have full hot-reload!

---

## 📊 Convex Dashboard Features

Access your dashboard at [https://dashboard.convex.dev](https://dashboard.convex.dev)

### Key Features

| Feature | Description |
|---------|-------------|
| 📋 **Data Browser** | View and edit database documents directly |
| 📈 **Logs** | Real-time function execution logs |
| ⚙️ **Settings** | Environment variables and deployment config |
| 📊 **Analytics** | Query performance and usage metrics |
| 🔐 **Auth** | Authentication provider configuration |

---

## 🏗️ Project Structure

Here's how Convex fits into your NoteFlow project:

```
NoteFlow/
├── convex/
│   ├── _generated/          # Auto-generated types (don't edit)
│   ├── documents.ts         # Document queries/mutations
│   ├── schema.ts           # Database schema definition
│   └── convex.json         # Convex configuration
├── src/
│   └── app/                # Next.js pages
└── .env.local              # Environment variables
```

---

## 🛠️ Common Commands

```bash
# Initialize/deploy once
npx convex dev --once

# Run in watch mode (during development)
npx convex dev

# Deploy to production
npx convex deploy

# Set environment variable
npx convex env set KEY value

# View environment variables
npx convex env list

# Clear local cache and reinitialize
npx convex dev --clear-cache
```

---

## 🐛 Troubleshooting

### ❌ "Not authenticated" Error

**Root Cause**: Clerk integration not configured properly

**Solution**:
- ✓ Ensure `CLERK_ISSUER_URL` is set in Convex dashboard
- ✓ Verify JWT template is created in Clerk
- ✓ Check that you're signed in on the frontend
- ✓ See [clerk.md](./clerk.md) for complete setup

### ❌ TypeScript Errors in `convex/` Files

**Root Cause**: Types not generated or out of sync

**Solution**:
```bash
# Regenerate types
npx convex dev --once

# Restart TypeScript server in VS Code
# Command Palette (Cmd+Shift+P) → "TypeScript: Restart TS Server"
```

### ❌ "Deployment not found" Error

**Root Cause**: Incorrect deployment URL or deleted deployment

**Solution**:
- ✓ Check `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` in `.env.local`
- ✓ Verify deployment exists in Convex dashboard
- ✓ Try running `npx convex dev --once` again to re-initialize

### ❌ Changes Not Reflecting

**Root Cause**: Convex dev not running or build cache issue

**Solution**:
```bash
# Stop Convex dev (Ctrl+C)
# Clear cache and restart
npx convex dev --clear-cache
```

---

## 🚀 Production Deployment

### Deploy to Production

```bash
# Deploy your Convex functions to production
npx convex deploy
```

This creates a production deployment and gives you new environment variables:

```bash
CONVEX_DEPLOYMENT=prod:your-production-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-production.convex.cloud
```

### Add to Hosting Platform

1. Go to your hosting platform (Vercel, Netlify, etc.)
2. Add the **production** environment variables
3. Deploy your Next.js app
4. Ensure Clerk production variables are also set

> [!IMPORTANT]
> Use separate Convex deployments for development and production. Never use dev credentials in production!

---

## 📚 Additional Resources

- [Convex Documentation](https://docs.convex.dev)
- [Convex + Next.js Guide](https://docs.convex.dev/quickstart/nextjs)
- [Convex + Clerk Integration](https://docs.convex.dev/auth/clerk)
- [Schema Design Best Practices](https://docs.convex.dev/database/schema)
- [Convex Discord Community](https://convex.dev/community)

---

## 💡 Best Practices

> [!TIP]
> **Development Tips**
> - Keep `npx convex dev` running during development
> - Use the Data Browser in dashboard to inspect data
> - Check function logs in dashboard when debugging
> - Version control your `convex/` directory

> [!TIP]
> **Schema Design**
> - Define schemas in `convex/schema.ts` for type safety
> - Use indexes for frequently queried fields
> - Keep mutations atomic and focused
> - Use Convex's built-in pagination for large datasets

> [!WARNING]
> **Security Considerations**
> - Never commit `.env.local` to version control
> - Use separate deployments for dev and production
> - Implement proper authentication checks in mutations
> - Validate all inputs in your Convex functions

---

## 🔄 Next Steps

After setting up Convex:

1. ✅ Configure Clerk authentication (see [clerk.md](./clerk.md))
2. ✅ Set up Cloudinary for images (see [cloudinary.md](./cloudinary.md))
3. ✅ Start building your database schema
4. ✅ Create queries and mutations for your app

---

> [!NOTE]
> For more help, visit the [Convex Discord](https://convex.dev/community) where the team and community are very responsive!