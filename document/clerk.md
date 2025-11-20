# 🔐 Clerk Authentication Setup

Complete guide to configuring Clerk for NoteFlow - A modern and secure user authentication system.

---

## 📋 Overview

Clerk provides a full-featured authentication solution for Next.js applications, including sign-in, sign-up, session management, and seamless integration with Convex database.

---

## 🚀 Step 1: Create Clerk Application

1. **Access Clerk Dashboard**
   - Navigate to [https://clerk.com](https://clerk.com)
   - Sign up for a new account or sign in

2. **Create New Application**
   - Click the **"Create application"** button
   - Enter name: `NoteFlow`

3. **Select Authentication Methods**
   - ✅ **Email** (required)
   - ✅ **Google** (recommended)
   - ⚪ **GitHub** (optional)

---

## 🔑 Step 2: Get API Keys

1. After creating the application, navigate to the **"API Keys"** tab
2. Copy these two keys:
   - **Publishable Key**: Starts with `pk_test_...`
   - **Secret Key**: Starts with `sk_test_...`

3. Add to your `.env.local` file:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

> [!TIP]
> The Publishable key is used on the client-side (with `NEXT_PUBLIC_` prefix), while the Secret key is only used on the server-side.

---

## ⚙️ Step 3: Configure JWT Template

> [!IMPORTANT]
> This step is **required** for Clerk to work with Convex!

### Create JWT Template for Convex

1. In **Clerk Dashboard**, navigate to **JWT Templates**
2. Click **"New template"** → select **Convex**
3. Enter template name: `convex`
4. Click **"Apply template"** (keep the default configuration)
5. **Copy the Issuer URL** (format: `https://your-app.clerk.accounts.dev`)

### Why is JWT Template needed?

The JWT Template allows Clerk to generate tokens compatible with Convex, ensuring user authentication works correctly between both services.

---

## 🔗 Step 4: Connect Convex with Clerk

### Option 1: Via Convex Dashboard

1. Navigate to [Convex Dashboard](https://dashboard.convex.dev)
2. Go to your project's **Settings**
3. Select the **"Environment Variables"** tab
4. Add environment variable:
   - **Key**: `CLERK_ISSUER_URL`
   - **Value**: The URL copied from Step 3

### Option 2: Via Command Line

```bash
npx convex env set CLERK_ISSUER_URL https://your-app.clerk.accounts.dev
```

> [!NOTE]
> Replace `https://your-app.clerk.accounts.dev` with your actual Issuer URL.

---

## ✅ Step 5: Verify Setup

### Check `.env.local` file

Your file should contain all these variables:

```bash
# Convex Database
CONVEX_DEPLOYMENT=dev:...
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Test Commands

Open **2 terminals** and run simultaneously:

```bash
# Terminal 1: Convex dev server (watch mode)
npx convex dev
```

```bash
# Terminal 2: Next.js dev server
npm run dev
```

> [!TIP]
> Keep both terminals running during development for automatic hot-reload.

---

## 🐛 Troubleshooting

### ❌ Error: "Not authenticated"

**Root Cause**: JWT template not configured correctly

**Solution**:
- ✓ Verify JWT template has been created in Clerk Dashboard
- ✓ Confirm `CLERK_ISSUER_URL` is set in Convex settings
- ✓ Ensure template name is exactly `convex`

### ❌ TypeScript Error in `convex/documents.ts`

**Root Cause**: Types have not been generated

**Solution**:
```bash
# Generate types once
npx convex dev --once

# Restart VS Code to load new types
# Command Palette (Cmd+Shift+P) → "Reload Window"
```

### ❌ Convex Deployment Not Connecting

**Root Cause**: Incorrect URL or deployment ID

**Solution**:
- ✓ Check `NEXT_PUBLIC_CONVEX_URL` in `.env.local`
- ✓ Verify deployment is **active** in Convex dashboard
- ✓ Try running `npx convex dev` again

---

## 📚 Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Convex + Clerk Integration](https://docs.convex.dev/auth/clerk)
- [Next.js + Clerk Guide](https://clerk.com/docs/quickstarts/nextjs)

---

> [!NOTE]
> If you encounter other issues, check the console logs in your browser and terminal for detailed error messages.