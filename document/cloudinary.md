# ☁️ Cloudinary Setup Guide

Complete guide to setting up Cloudinary for image uploads in NoteFlow.

---

## 📋 Overview

Cloudinary is a cloud-based media management platform that provides fast and reliable image hosting, automatic optimization, and global CDN delivery for your NoteFlow application.

---

## 🚀 Step 1: Create Cloudinary Account

1. **Sign Up for Free**
   - Navigate to [https://cloudinary.com](https://cloudinary.com)
   - Click **"Sign Up"** (free tier available)
   - Create an account using email or Google

> [!NOTE]
> The free tier includes 25GB storage and 25GB bandwidth per month, which is perfect for getting started.

---

## 🔑 Step 2: Get Your Credentials

1. **Access Dashboard**
   - Sign in to your Cloudinary account
   - Go to your **Dashboard** (home page)

2. **Locate Credentials**
   - You'll see three important values:
     - **Cloud Name**
     - **API Key**
     - **API Secret**

> [!TIP]
> Keep this page open - you'll need these values for the next step.

---

## ⚙️ Step 3: Add Environment Variables

Add the following to your `.env.local` file:

```bash
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Example Configuration

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dz1a2b3c4
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

> [!IMPORTANT]
> Replace the example values with your actual credentials from the Cloudinary dashboard. Never commit these values to version control!

---

## 🔄 Step 4: Restart Development Server

After adding the environment variables:

```bash
# Stop current server (Ctrl+C or Cmd+C)
npm run dev
```

---

## ✅ Step 5: Test Upload

1. Open [http://localhost:3000](http://localhost:3000)
2. Navigate to any document
3. Hover over the title area
4. Click **"Add cover"**
5. Select an image file
6. Watch it upload to Cloudinary! 🎉

---

## 🔧 How It Works

Here's the complete upload flow:

1. 📤 User selects image via file picker
2. 🚀 Image is sent to `/api/upload` endpoint
3. ☁️ Server uploads to Cloudinary using their API
4. 🔗 Cloudinary returns a secure URL
5. 💾 URL is saved to document in Convex
6. 🖼️ Cover image displays from Cloudinary CDN

---

## ✨ Benefits of Cloudinary

| Feature | Description |
|---------|-------------|
| ⚡ **Fast CDN** | Images load quickly worldwide from edge locations |
| 🗜️ **Auto Optimization** | Images are compressed automatically without quality loss |
| 🎁 **Free Tier** | 25GB storage & 25GB bandwidth/month |
| 🎨 **Transformations** | Resize, crop, format on-the-fly via URL parameters |
| 🔒 **Secure** | HTTPS URLs by default with optional signed URLs |

---

## 🎯 Optional: Enable Transformations

In your Cloudinary dashboard, you can configure advanced optimizations:

### Automatic Format Optimization
- Serve **WebP** to supported browsers
- Fallback to **JPEG/PNG** for older browsers

### Quality Optimization
- Auto-adjust image quality based on content
- Balance file size and visual quality

### Responsive Breakpoints
- Generate multiple image sizes automatically
- Serve appropriate size based on device

> [!TIP]
> These transformations happen automatically with no code changes required!

---

## 🚀 Production Deployment

When deploying to Vercel, Netlify, or other hosting platforms:

### Add Environment Variables

1. Go to your hosting platform's dashboard
2. Navigate to **Environment Variables** or **Settings**
3. Add all three Cloudinary variables:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

4. **Deploy** - it should work automatically! ✅

> [!WARNING]
> Make sure to add all three variables. Missing any will cause uploads to fail in production.

---

## 🐛 Troubleshooting

### ❌ Upload Fails

**Possible Causes**:
- Environment variables not set correctly
- Invalid API credentials
- Network connectivity issues

**Solution**:
- ✓ Verify all variables are set in `.env.local`
- ✓ Double-check credentials in Cloudinary dashboard
- ✓ Check browser console for detailed error messages
- ✓ Ensure you've restarted the development server

### ❌ Images Don't Display

**Possible Causes**:
- Missing `NEXT_PUBLIC_` prefix on Cloud Name
- Incorrect image URL
- CORS issues

**Solution**:
- ✓ Ensure variable name is `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- ✓ Check Cloudinary dashboard → Media Library for uploaded files
- ✓ Verify the returned URL is valid and accessible
- ✓ Check browser Network tab for failed requests

### ❌ Slow Upload Speed

**Possible Causes**:
- Large file size
- Network congestion
- Region mismatch

**Solution**:
- ✓ Compress images before upload if very large (>5MB)
- ✓ Check your internet connection
- ✓ Consider enabling Cloudinary transformations for automatic compression

---

## 📚 Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Next.js Integration Guide](https://cloudinary.com/documentation/next_integration)
- [Image Transformations](https://cloudinary.com/documentation/image_transformations)
- [Upload API Reference](https://cloudinary.com/documentation/upload_images)

---

## 💡 Best Practices

> [!TIP]
> **Image Upload Tips**
> - Limit file size to under 10MB for better user experience
> - Use descriptive filenames for better organization
> - Consider adding upload progress indicators
> - Implement error handling with user-friendly messages

> [!TIP]
> **Security Tips**
> - Never expose your `CLOUDINARY_API_SECRET` in client-side code
> - Use signed uploads for production applications
> - Implement rate limiting on your upload endpoint
> - Validate file types before uploading

---

> [!NOTE]
> For additional help, visit the [Cloudinary Community Forums](https://community.cloudinary.com/) or check the official documentation.
