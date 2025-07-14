from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline
import torch
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi import status
import time
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
import json
import hashlib
from typing import List, Dict, Optional
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for optimization
def get_optimal_model():
    device = 0 if torch.cuda.is_available() else -1
    if device == 0:  # GPU - use larger model
        return "cardiffnlp/twitter-roberta-base-sentiment"
    else:  # CPU - use smaller, faster model for ultra-fast processing
        return "distilbert-base-uncased-finetuned-sst-2-english"  # Much faster on CPU

model_name = get_optimal_model()
sentiment_tokenizer = None
sentiment_model = None
sentiment_pipeline = None
executor = ThreadPoolExecutor(max_workers=4)  # Increased for better concurrency

# Optimized configuration based on device
def get_optimal_config():
    device = 0 if torch.cuda.is_available() else -1
    if device == 0:  # GPU
        return {
            'batch_size': 100,  # Reduced for faster processing
            'max_concurrent_batches': 6,  # Increased concurrency
            'device': 'cuda'
        }
    else:  # CPU
        return {
            'batch_size': 25,  # Ultra-fast small batches
            'max_concurrent_batches': 4,  # More concurrent for CPU
            'device': 'cpu'
        }

config = get_optimal_config()
BATCH_SIZE = config['batch_size']
MAX_CONCURRENT_BATCHES = config['max_concurrent_batches']

CACHE = {}  # Simple in-memory cache
CACHE_TTL = 3600 * 24 * 7  # 7 days for longer caching

# Different label maps for different models
def get_label_map():
    if "distilbert" in model_name:
        return {
            'NEGATIVE': 'negative',
            'POSITIVE': 'positive'
        }
    else:
        return {
    'LABEL_0': 'negative',
    'LABEL_1': 'neutral',
    'LABEL_2': 'positive',
}

label_map = get_label_map()

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await initialize_services()
    yield
    # Shutdown
    pass

app = FastAPI(title="Optimized Sentiment Analysis Service", lifespan=lifespan)

class TextsRequest(BaseModel):
    texts: List[str]

def generate_cache_key(texts: List[str]) -> str:
    """Generate a cache key for a batch of texts"""
    text_hash = hashlib.md5(json.dumps(texts, sort_keys=True).encode()).hexdigest()
    return f"sentiment:{text_hash}"

def get_cached_results(cache_key: str) -> Optional[List[Dict]]:
    """Get cached results"""
    if cache_key in CACHE:
        timestamp, results = CACHE[cache_key]
        if time.time() - timestamp < CACHE_TTL:
            return results
        else:
            del CACHE[cache_key]
    return None

def cache_results(cache_key: str, results: List[Dict]):
    """Cache results"""
    CACHE[cache_key] = (time.time(), results)

def process_batch_sync(texts: List[str]) -> List[Dict]:
    """Synchronous batch processing with error handling"""
    try:
        start_time = time.time()
        results = sentiment_pipeline(texts)
        processing_time = time.time() - start_time
        
        formatted_results = []
        for r in results:
            label = r["label"]
            score = float(r["score"])
            
            # Handle different model outputs
            if "distilbert" in model_name:
                # Binary model: convert to 3-class with neutral for balanced scores
                if label == "POSITIVE":
                    if score > 0.7:
                        sentiment = "positive"
                    else:
                        sentiment = "neutral"
                else:  # NEGATIVE
                    if score > 0.7:
                        sentiment = "negative"
                    else:
                        sentiment = "neutral"
            else:
                # 3-class model
                sentiment = label_map.get(label, label)
            
            formatted_results.append({
                "label": sentiment,
                "score": score
            })
        
        logger.info(f"Processed batch of {len(texts)} texts in {processing_time:.2f}s")
        return formatted_results
    except Exception as e:
        logger.error(f"Batch processing error: {e}")
        raise

async def process_batch_async(texts: List[str]) -> List[Dict]:
    """Asynchronous batch processing"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, process_batch_sync, texts)

def split_into_batches(texts: List[str], batch_size: int = BATCH_SIZE) -> List[List[str]]:
    """Split texts into optimal batches"""
    return [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]

# Initialize models and services
async def initialize_services():
    global sentiment_tokenizer, sentiment_model, sentiment_pipeline
    
    logger.info("Initializing sentiment analysis models...")
    
    # Load model with optimization
    device = 0 if torch.cuda.is_available() else -1
    logger.info(f"Using device: {'CUDA' if device == 0 else 'CPU'}")
    
    # Load model with memory optimization
    sentiment_tokenizer = AutoTokenizer.from_pretrained(model_name)
    sentiment_model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        torch_dtype=torch.float16 if device == 0 else torch.float32,  # Use half precision on GPU
        low_cpu_mem_usage=True
    )
    
    if device == 0:
        sentiment_model = sentiment_model.cuda()
        sentiment_model.eval()  # Set to evaluation mode
    
    sentiment_pipeline = pipeline(
        "sentiment-analysis", 
        model=sentiment_model, 
        tokenizer=sentiment_tokenizer, 
        return_all_scores=False, 
        device=device,
        batch_size=BATCH_SIZE
    )
    
    logger.info(f"Models loaded successfully with config: {config}")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await initialize_services()
    yield
    # Shutdown
    pass

app = FastAPI(title="Optimized Sentiment Analysis Service", lifespan=lifespan)

@app.post("/sentiment")
async def analyze_sentiment(req: TextsRequest):
    start_time = time.time()
    
    # Check cache first
    cache_key = generate_cache_key(req.texts)
    cached_results = get_cached_results(cache_key)
    if cached_results:
        logger.info(f"Cache hit for {len(req.texts)} texts")
        return {
            "results": cached_results,
            "cached": True,
            "processing_time": time.time() - start_time
        }
    
    # Split into batches for optimal processing
    batches = split_into_batches(req.texts, BATCH_SIZE)
    logger.info(f"Processing {len(req.texts)} texts in {len(batches)} batches")
    
    # For CPU, process sequentially to avoid memory issues
    if config['device'] == 'cpu':
        all_results = []
        for batch in batches:
            batch_result = process_batch_sync(batch)
            all_results.extend(batch_result)
    else:
        # For GPU, process concurrently
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_BATCHES)
        
        async def process_batch_with_semaphore(batch: List[str]):
            async with semaphore:
                return await process_batch_async(batch)
        
        # Process all batches concurrently
        batch_tasks = [process_batch_with_semaphore(batch) for batch in batches]
        batch_results = await asyncio.gather(*batch_tasks)
        
        # Combine results
        all_results = []
        for batch_result in batch_results:
            all_results.extend(batch_result)
    
    processing_time = time.time() - start_time
    
    # Cache results
    cache_results(cache_key, all_results)
    
    return {
        "results": all_results,
        "cached": False,
        "processing_time": processing_time,
        "batch_count": len(batches)
    }

@app.get("/sentiment/status")
async def get_service_status():
    """Get service health and performance metrics"""
    return {
        "status": "healthy",
        "model_loaded": sentiment_model is not None,
        "cache_available": True,
        "device": config['device'],
        "batch_size": BATCH_SIZE,
        "max_concurrent_batches": MAX_CONCURRENT_BATCHES,
        "cache_size": len(CACHE),
        "config": config
    }

@app.get("/sentiment/cache/clear")
async def clear_cache():
    """Clear the cache"""
    global CACHE
    CACHE.clear()
    return {"message": "Cache cleared", "cache_size": 0}

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": str(exc), "type": type(exc).__name__},
    )

@app.get("/")
async def root():
    return {"message": "Sentiment Analysis Service is running", "status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)