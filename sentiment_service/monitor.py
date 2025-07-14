#!/usr/bin/env python3
"""
Performance Monitoring Script for Sentiment Analysis Service
Tracks metrics, performance, and system health
"""

import time
import psutil
import requests
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import sqlite3
import threading
from collections import deque
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PerformanceMonitor:
    def __init__(self, service_url: str = "http://localhost:8000", db_path: str = "performance.db"):
        self.service_url = service_url
        self.db_path = db_path
        self.metrics_history = deque(maxlen=1000)  # Keep last 1000 metrics
        self.setup_database()
    
    def setup_database(self):
        """Initialize SQLite database for metrics storage"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                cpu_percent REAL,
                memory_percent REAL,
                memory_used_mb REAL,
                gpu_memory_used_mb REAL,
                gpu_memory_total_mb REAL,
                requests_per_minute REAL,
                avg_response_time REAL,
                cache_hit_rate REAL,
                error_rate REAL,
                active_connections INTEGER
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sentiment_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                batch_size INTEGER,
                processing_time REAL,
                cached BOOLEAN,
                success BOOLEAN,
                error_message TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def get_system_metrics(self) -> Dict:
        """Get current system performance metrics"""
        try:
            # CPU and Memory
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            # GPU metrics (if available)
            gpu_memory_used = 0
            gpu_memory_total = 0
            try:
                import pynvml
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                gpu_memory_used = info.used / 1024 / 1024  # MB
                gpu_memory_total = info.total / 1024 / 1024  # MB
            except:
                pass  # GPU monitoring not available
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_used_mb': memory.used / 1024 / 1024,
                'gpu_memory_used_mb': gpu_memory_used,
                'gpu_memory_total_mb': gpu_memory_total,
                'timestamp': datetime.now()
            }
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {}
    
    def get_service_metrics(self) -> Dict:
        """Get sentiment service performance metrics"""
        try:
            # Health check
            health_response = requests.get(f"{self.service_url}/sentiment/status", timeout=5)
            health_data = health_response.json() if health_response.ok else {}
            
            # Cache stats
            cache_response = requests.get(f"{self.service_url}/sentiment/cache/stats", timeout=5)
            cache_data = cache_response.json() if cache_response.ok else {}
            
            # Calculate cache hit rate
            cache_hit_rate = 0
            if cache_data.get('cache_available'):
                hits = cache_data.get('keyspace_hits', 0)
                misses = cache_data.get('keyspace_misses', 0)
                total = hits + misses
                cache_hit_rate = (hits / total * 100) if total > 0 else 0
            
            return {
                'status': health_data.get('status', 'unknown'),
                'model_loaded': health_data.get('model_loaded', False),
                'cache_available': health_data.get('cache_available', False),
                'device': health_data.get('device', 'unknown'),
                'cache_hit_rate': cache_hit_rate,
                'timestamp': datetime.now()
            }
        except Exception as e:
            logger.error(f"Error getting service metrics: {e}")
            return {}
    
    def test_sentiment_performance(self, batch_size: int = 10) -> Dict:
        """Test sentiment analysis performance with sample data"""
        test_texts = [
            "This video is amazing!",
            "I love this content",
            "Great tutorial, very helpful",
            "This is okay",
            "Not bad, but could be better",
            "I don't like this",
            "This is terrible",
            "Waste of time",
            "Subscribe to my channel!",
            "Check out my videos too!"
        ] * (batch_size // 10 + 1)
        test_texts = test_texts[:batch_size]
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{self.service_url}/sentiment",
                json={"texts": test_texts, "use_cache": False},
                timeout=30
            )
            processing_time = time.time() - start_time
            
            success = response.ok
            error_message = None if success else response.text
            
            # Store request metrics
            self.store_request_metrics(batch_size, processing_time, False, success, error_message)
            
            return {
                'batch_size': batch_size,
                'processing_time': processing_time,
                'success': success,
                'error_message': error_message,
                'response_time_ms': processing_time * 1000
            }
        except Exception as e:
            logger.error(f"Error testing sentiment performance: {e}")
            return {
                'batch_size': batch_size,
                'processing_time': 0,
                'success': False,
                'error_message': str(e),
                'response_time_ms': 0
            }
    
    def store_metrics(self, metrics: Dict):
        """Store metrics in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO performance_metrics 
                (cpu_percent, memory_percent, memory_used_mb, gpu_memory_used_mb, 
                 gpu_memory_total_mb, requests_per_minute, avg_response_time, 
                 cache_hit_rate, error_rate, active_connections)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                metrics.get('cpu_percent', 0),
                metrics.get('memory_percent', 0),
                metrics.get('memory_used_mb', 0),
                metrics.get('gpu_memory_used_mb', 0),
                metrics.get('gpu_memory_total_mb', 0),
                metrics.get('requests_per_minute', 0),
                metrics.get('avg_response_time', 0),
                metrics.get('cache_hit_rate', 0),
                metrics.get('error_rate', 0),
                metrics.get('active_connections', 0)
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error storing metrics: {e}")
    
    def store_request_metrics(self, batch_size: int, processing_time: float, 
                            cached: bool, success: bool, error_message: Optional[str]):
        """Store individual request metrics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO sentiment_requests 
                (batch_size, processing_time, cached, success, error_message)
                VALUES (?, ?, ?, ?, ?)
            ''', (batch_size, processing_time, cached, success, error_message))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error storing request metrics: {e}")
    
    def get_performance_summary(self, hours: int = 24) -> Dict:
        """Get performance summary for the last N hours"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get metrics from last N hours
            since = datetime.now() - timedelta(hours=hours)
            
            cursor.execute('''
                SELECT 
                    AVG(cpu_percent) as avg_cpu,
                    AVG(memory_percent) as avg_memory,
                    AVG(avg_response_time) as avg_response_time,
                    AVG(cache_hit_rate) as avg_cache_hit_rate,
                    COUNT(*) as total_measurements
                FROM performance_metrics 
                WHERE timestamp > ?
            ''', (since,))
            
            perf_metrics = cursor.fetchone()
            
            # Get request statistics
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_requests,
                    AVG(processing_time) as avg_processing_time,
                    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests,
                    SUM(CASE WHEN cached THEN 1 ELSE 0 END) as cached_requests
                FROM sentiment_requests 
                WHERE timestamp > ?
            ''', (since,))
            
            req_metrics = cursor.fetchone()
            
            conn.close()
            
            return {
                'period_hours': hours,
                'avg_cpu_percent': perf_metrics[0] or 0,
                'avg_memory_percent': perf_metrics[1] or 0,
                'avg_response_time_ms': (perf_metrics[2] or 0) * 1000,
                'avg_cache_hit_rate': perf_metrics[3] or 0,
                'total_measurements': perf_metrics[4] or 0,
                'total_requests': req_metrics[0] or 0,
                'avg_processing_time_ms': (req_metrics[1] or 0) * 1000,
                'success_rate': (req_metrics[2] / req_metrics[0] * 100) if req_metrics[0] > 0 else 0,
                'cache_usage_rate': (req_metrics[3] / req_metrics[0] * 100) if req_metrics[0] > 0 else 0
            }
        except Exception as e:
            logger.error(f"Error getting performance summary: {e}")
            return {}
    
    def monitor_continuously(self, interval: int = 60):
        """Continuously monitor performance"""
        logger.info(f"Starting continuous monitoring (interval: {interval}s)")
        
        while True:
            try:
                # Collect metrics
                system_metrics = self.get_system_metrics()
                service_metrics = self.get_service_metrics()
                
                # Combine metrics
                combined_metrics = {**system_metrics, **service_metrics}
                
                # Store in database
                self.store_metrics(combined_metrics)
                
                # Store in memory for quick access
                self.metrics_history.append(combined_metrics)
                
                # Log current status
                logger.info(f"CPU: {combined_metrics.get('cpu_percent', 0):.1f}%, "
                          f"Memory: {combined_metrics.get('memory_percent', 0):.1f}%, "
                          f"Cache Hit Rate: {combined_metrics.get('cache_hit_rate', 0):.1f}%")
                
                time.sleep(interval)
                
            except KeyboardInterrupt:
                logger.info("Monitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(interval)

def main():
    parser = argparse.ArgumentParser(description="Performance Monitor for Sentiment Analysis Service")
    parser.add_argument("--service-url", default="http://localhost:8000", help="Service URL")
    parser.add_argument("--db-path", default="performance.db", help="Database path")
    parser.add_argument("--interval", type=int, default=60, help="Monitoring interval in seconds")
    parser.add_argument("--test", action="store_true", help="Run performance test")
    parser.add_argument("--summary", type=int, help="Show performance summary for last N hours")
    
    args = parser.parse_args()
    
    monitor = PerformanceMonitor(args.service_url, args.db_path)
    
    if args.test:
        logger.info("Running performance test...")
        result = monitor.test_sentiment_performance(50)
        logger.info(f"Test result: {json.dumps(result, indent=2)}")
    
    elif args.summary:
        logger.info(f"Performance summary for last {args.summary} hours:")
        summary = monitor.get_performance_summary(args.summary)
        logger.info(json.dumps(summary, indent=2))
    
    else:
        monitor.monitor_continuously(args.interval)

if __name__ == "__main__":
    main() 