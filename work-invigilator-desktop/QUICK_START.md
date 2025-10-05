# Quick Start - Backblaze B2 Setup

## ✅ Your Credentials (Already Configured)

```
Key ID: 0057242535e05d00000000001
Key Name: workInvigilatorDesktop
Application Key: K005EdyoXAOL3IEstJchDkKzzM5eE+Y
```

## 📝 Setup Checklist

### Step 1: Create Backblaze Buckets (IMPORTANT)

Go to your Backblaze dashboard and create **TWO private buckets**:

1. **Bucket 1 (Screenshots)**
   - Name: `work-invigilator-screenshots`
   - Files in Bucket: **Private** ✅
   - Region: US West (or your preferred region)

2. **Bucket 2 (Audio Recordings)**
   - Name: `work-invigilator-audio-recordings`
   - Files in Bucket: **Private** ✅
   - Region: US West (same as bucket 1)

⚠️ **Important**: Set both buckets to **Private** to avoid payment charges!

### Step 2: Verify .env File

Your [.env](work-invigilator-desktop/.env) file is already configured with:

```env
BACKBLAZE_ENABLED=true
BACKBLAZE_KEY_ID=0057242535e05d00000000001
BACKBLAZE_APPLICATION_KEY=K005EdyoXAOL3IEstJchDkKzzM5eE+Y
BACKBLAZE_ENDPOINT=s3.us-west-004.backblazeb2.com
BACKBLAZE_REGION=us-west-004
BACKBLAZE_BUCKET_SCREENSHOTS=work-invigilator-screenshots
BACKBLAZE_BUCKET_AUDIO=work-invigilator-audio-recordings
```

✅ All set! Just create the buckets and you're ready to go.

### Step 3: Test the Setup

1. **Start the desktop app**:
   ```bash
   cd work-invigilator-desktop
   npm start
   ```

2. **Check console logs** for these messages:
   ```
   ✅ Backblaze S3 client initialized
   ```

3. **Start a work session** and watch for:
   ```
   ✅ Uploaded to Backblaze (primary)
   ✅ Uploaded to Supabase (backup)
   ✅ Screenshot saved (primary: Backblaze)
   ✅ Chunk X saved (primary: Backblaze)
   ```

4. **Verify in Backblaze Dashboard**:
   - Go to Browse Files
   - Check both buckets for uploaded files
   - Files will be in format: `{userId}/screenshot_*.png` or `{userId}/chunk_*.webm`

## 🔍 Troubleshooting

### Error: "Backblaze not configured"
- Make sure `.env` file exists in `work-invigilator-desktop/` folder
- Restart the desktop app after creating `.env`

### Error: "NoSuchBucket" or "bucket does not exist"
- Create the buckets in Backblaze dashboard
- Make sure bucket names match exactly:
  - `work-invigilator-screenshots`
  - `work-invigilator-audio-recordings`

### Upload fails with "Access Denied"
- Verify your application key has **Read and Write** access
- Check that both buckets are set to **Private** (not Public)

### Files not showing in Backblaze
- Wait a few seconds for upload to complete
- Refresh the Backblaze dashboard
- Check console logs for specific error messages

## 📊 How It Works

```
Screenshot/Audio Capture
         ↓
   Upload to Backblaze (primary) ✅
         ↓
   Upload to Supabase (backup) ✅
         ↓
   Generate Signed URL (1 year validity)
         ↓
   Save both URLs to database
```

**Result**: Dual storage with automatic backup and cost savings!

## 💰 Cost Savings

- **Before**: Supabase only - $0.021/GB/month
- **After**: Backblaze primary - $0.005/GB/month (75% cheaper!)
- **Bonus**: Free egress (first 3x storage amount)

## 🎯 Next Steps

1. ✅ Create the two Backblaze buckets (PRIVATE)
2. ✅ Verify `.env` file is configured
3. ✅ Start the desktop app
4. ✅ Test with a work session
5. ✅ Check Backblaze dashboard for files

Need more details? See [BACKBLAZE_SETUP.md](BACKBLAZE_SETUP.md)
