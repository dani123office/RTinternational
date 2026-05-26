# Vercel Deployment Guide

## Prerequisites
- PostgreSQL database accessible from Vercel (e.g., Neon, Supabase, or cloud-hosted)
- Vercel account linked to the repository
- Environment variables configured

## Setting Up Environment Variables on Vercel

1. Go to **Project Settings** → **Environment Variables**
2. Add the following variables:

### Required Variables:
```
DATABASE_URL=postgresql://user:password@host:port/dbname
```

Replace with your actual PostgreSQL connection string:
- `user`: Database username
- `password`: Database password
- `host`: Database host/domain
- `port`: Usually 5432 for PostgreSQL
- `dbname`: Database name

### Optional but Recommended:
```
COHERE_API_KEY=your_cohere_api_key_here
RT_CORS_ORIGINS=https://rt-international.vercel.app,https://yourdomain.com
VERCEL=true
```

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Fix Vercel deployment issues"
   git push
   ```

2. **Trigger Deployment**
   - Vercel will automatically deploy on push, OR
   - Manually redeploy from Vercel dashboard

3. **Check Deployment Status**
   - Go to Vercel Dashboard → Deployments
   - Look for build and function logs
   - Check for any import or database connection errors

## Common Issues & Solutions

### Error: `FUNCTION_INVOCATION_FAILED`

**Cause 1: Missing DATABASE_URL**
- **Fix**: Add DATABASE_URL environment variable to Vercel project settings

**Cause 2: Database Connection Failed**
- Ensure the database is accessible from Vercel (whitelist Vercel IP)
- Test connection string locally first
- Some databases require SSL connections: Add `?sslmode=require` to URL

**Cause 3: Import Errors**
- Check Vercel build logs for ImportError or ModuleNotFoundError
- Ensure all routers and dependencies are properly installed

### Error: `CORS` Issues
- Update `RT_CORS_ORIGINS` to include your frontend domain
- Ensure frontend URL matches exactly (including protocol and trailing slashes)

### Error: `Timeout` or `Connection Refused`
- Database might be slow or unreachable
- Check database service status
- Verify network connectivity and firewall rules

## Testing Locally Before Deploying

```bash
# 1. Set environment variables locally
export DATABASE_URL=postgresql://...

# 2. Start the development server
cd CallCenterAPI_FastAPI
python -m uvicorn main:app --reload

# 3. Test endpoints
curl http://localhost:8000/docs
```

## Database Setup on Vercel

For first-time setup, run migrations:
```bash
python CallCenterAPI_FastAPI/migration_script.py
```

Or if using the reset script:
```bash
python CallCenterAPI_FastAPI/create_db.py
```

## Monitoring

1. **Vercel Dashboard**: Check deployments and function logs
2. **Application Errors**: Monitor the `/api/` endpoints for 500 errors
3. **Database Connections**: Check connection pool and active connections
4. **Performance**: Monitor cold start time and execution duration

## Troubleshooting Checklist

- [ ] DATABASE_URL is set in Vercel Environment Variables
- [ ] Database is accessible from Vercel (IP whitelist if needed)
- [ ] All required packages in requirements.txt
- [ ] .env file is in `.gitignore` (don't commit secrets)
- [ ] Backend rewrites in vercel.json point to `/api/index.py`
- [ ] CORS origins include the frontend domain
- [ ] Python version requirement matches (`>=3.12,<3.13`)

## Deployment Architecture

```
vercel.json
  ↓
backend-api/api/index.py (handler)
  ↓
CallCenterAPI_FastAPI/main.py (FastAPI app)
  ↓
Database (PostgreSQL)
```

The serverless function imports the FastAPI app and Vercel handles the HTTP requests.
