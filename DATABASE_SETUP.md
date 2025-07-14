# Database Setup Guide

## 🗄️ PostgreSQL Database Setup

The enhanced comment analysis system requires a PostgreSQL database. Here are the setup options:

### Option 1: Using Docker (Recommended)

If you have Docker installed:

```bash
# Start the PostgreSQL database
docker compose up postgres -d

# Wait for the database to be ready (about 10-15 seconds)
# Then run the migration
cd server
node run-migration.js
```

### Option 2: Local PostgreSQL Installation

If you have PostgreSQL installed locally:

1. Create a database:
```sql
CREATE DATABASE sentiment_analysis;
CREATE USER sentiment_user WITH PASSWORD 'sentiment_password';
GRANT ALL PRIVILEGES ON DATABASE sentiment_analysis TO sentiment_user;
```

2. Set the environment variable:
```bash
export DATABASE_URL="postgresql://sentiment_user:sentiment_password@localhost:5432/sentiment_analysis"
```

3. Run the migration:
```bash
cd server
node run-migration.js
```

### Option 3: Cloud Database (Supabase, Railway, etc.)

1. Create a PostgreSQL database on your preferred cloud provider
2. Get the connection string
3. Set the DATABASE_URL environment variable
4. Run the migration

## 🔧 Migration Details

The migration adds a `confidence` column to the `analysis_results` table:

```sql
ALTER TABLE analysis_results 
ADD COLUMN IF NOT EXISTS confidence REAL NOT NULL DEFAULT 0;
```

This column tracks the confidence level (0-1) of sentiment ratings based on:
- Sample size ratio
- Sentiment distribution balance
- Analysis mode used

## 🚀 Enhanced Analysis Features

Once the database is set up, you'll get:

✅ **Intelligent Sampling**: 150-500 comments analyzed (vs 100 before)  
✅ **Confidence Scoring**: Know how reliable each rating is  
✅ **Weighted Analysis**: High-engagement comments get more weight  
✅ **Adaptive Modes**: Fast/Balanced/Comprehensive based on comment count  

## 📊 Analysis Modes

- **Fast Mode**: 150 comments (videos with <200 comments)
- **Balanced Mode**: 300 comments (default, most videos)  
- **Comprehensive Mode**: 500 comments (videos with >1000 comments)

## 🎯 Sampling Strategies

- **Top Engagement**: Prioritizes high-engagement comments
- **Stratified**: 40% top + 40% middle + 20% random
- **Smart Weighting**: Verified users and high-likes get more weight

The system now provides **much more accurate ratings** by analyzing significantly more comments while maintaining good performance!