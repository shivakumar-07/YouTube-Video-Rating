#!/usr/bin/env python3
"""
YouTube Comment Sentiment Analysis Model Training Script
Fine-tunes a pre-trained model on YouTube comment data for better accuracy
"""

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification, 
    TrainingArguments, 
    Trainer,
    EarlyStoppingCallback
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import pandas as pd
import numpy as np
import json
import logging
from typing import List, Dict, Tuple
import os
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YouTubeCommentDataset(Dataset):
    """Custom dataset for YouTube comments"""
    
    def __init__(self, texts: List[str], labels: List[int], tokenizer, max_length: int = 128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }

def load_training_data(file_path: str) -> Tuple[List[str], List[int]]:
    """Load training data from JSON file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    texts = []
    labels = []
    
    for item in data:
        text = item['text']
        sentiment = item['sentiment']
        
        # Map sentiment to label
        if sentiment == 'positive':
            label = 2
        elif sentiment == 'negative':
            label = 0
        else:  # neutral
            label = 1
        
        texts.append(text)
        labels.append(label)
    
    return texts, labels

def compute_metrics(pred):
    """Compute metrics for evaluation"""
    labels = pred.label_ids
    preds = pred.predictions.argmax(-1)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average='weighted')
    acc = accuracy_score(labels, preds)
    return {
        'accuracy': acc,
        'f1': f1,
        'precision': precision,
        'recall': recall
    }

def train_model(
    model_name: str = "cardiffnlp/twitter-roberta-base-sentiment",
    training_data_path: str = "training_data.json",
    output_dir: str = "fine_tuned_model",
    num_epochs: int = 3,
    batch_size: int = 16,
    learning_rate: float = 2e-5,
    max_length: int = 128,
    validation_split: float = 0.2
):
    """Train and fine-tune the sentiment analysis model"""
    
    logger.info(f"Starting model training with {model_name}")
    
    # Load tokenizer and model
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=3  # negative, neutral, positive
    )
    
    # Load training data
    logger.info(f"Loading training data from {training_data_path}")
    texts, labels = load_training_data(training_data_path)
    
    # Split data
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels, test_size=validation_split, random_state=42, stratify=labels
    )
    
    logger.info(f"Training samples: {len(train_texts)}")
    logger.info(f"Validation samples: {len(val_texts)}")
    
    # Create datasets
    train_dataset = YouTubeCommentDataset(train_texts, train_labels, tokenizer, max_length)
    val_dataset = YouTubeCommentDataset(val_texts, val_labels, tokenizer, max_length)
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=num_epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        warmup_steps=500,
        weight_decay=0.01,
        logging_dir=f"{output_dir}/logs",
        logging_steps=100,
        evaluation_strategy="steps",
        eval_steps=500,
        save_steps=1000,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
        save_total_limit=3,
        dataloader_num_workers=4,
        fp16=torch.cuda.is_available(),  # Use mixed precision if GPU available
        gradient_accumulation_steps=4,
        learning_rate=learning_rate,
        report_to=None,  # Disable wandb/tensorboard
    )
    
    # Initialize trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
    )
    
    # Train the model
    logger.info("Starting training...")
    trainer.train()
    
    # Evaluate the model
    logger.info("Evaluating model...")
    eval_results = trainer.evaluate()
    logger.info(f"Evaluation results: {eval_results}")
    
    # Save the model and tokenizer
    logger.info(f"Saving model to {output_dir}")
    trainer.save_model()
    tokenizer.save_pretrained(output_dir)
    
    # Save training metadata
    metadata = {
        "model_name": model_name,
        "training_date": datetime.now().isoformat(),
        "num_epochs": num_epochs,
        "batch_size": batch_size,
        "learning_rate": learning_rate,
        "max_length": max_length,
        "training_samples": len(train_texts),
        "validation_samples": len(val_texts),
        "final_metrics": eval_results
    }
    
    with open(f"{output_dir}/training_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info("Training completed successfully!")
    return output_dir

def create_sample_training_data():
    """Create sample training data for testing"""
    sample_data = [
        {"text": "This video is amazing! I love it!", "sentiment": "positive"},
        {"text": "Great content, very helpful", "sentiment": "positive"},
        {"text": "Thanks for sharing this information", "sentiment": "positive"},
        {"text": "This is okay, nothing special", "sentiment": "neutral"},
        {"text": "I don't really care about this", "sentiment": "neutral"},
        {"text": "It's fine, I guess", "sentiment": "neutral"},
        {"text": "This is terrible, waste of time", "sentiment": "negative"},
        {"text": "I hate this video", "sentiment": "negative"},
        {"text": "This is the worst content ever", "sentiment": "negative"},
        {"text": "Subscribe to my channel!", "sentiment": "negative"},  # Spam
        {"text": "Check out my videos too!", "sentiment": "negative"},  # Spam
    ]
    
    with open("sample_training_data.json", 'w') as f:
        json.dump(sample_data, f, indent=2)
    
    logger.info("Sample training data created: sample_training_data.json")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train YouTube comment sentiment analysis model")
    parser.add_argument("--data", default="training_data.json", help="Path to training data JSON file")
    parser.add_argument("--output", default="fine_tuned_model", help="Output directory for model")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=2e-5, help="Learning rate")
    parser.add_argument("--create-sample", action="store_true", help="Create sample training data")
    
    args = parser.parse_args()
    
    if args.create_sample:
        create_sample_training_data()
    else:
        if not os.path.exists(args.data):
            logger.error(f"Training data file {args.data} not found!")
            logger.info("Use --create-sample to create sample data")
            exit(1)
        
        train_model(
            training_data_path=args.data,
            output_dir=args.output,
            num_epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.lr
        ) 