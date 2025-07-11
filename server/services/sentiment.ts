import { type Comment, type InsertAnalysis } from "@shared/schema";

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
}

interface QualityIndicator {
  type: 'spam' | 'bot' | 'verified' | 'authentic';
  label: string;
  icon: string;
  color: string;
}

export class SentimentService {
  
  analyzeSentiment(text: string): SentimentResult {
    // Simple sentiment analysis using keyword matching
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'love', 'best', 'fantastic', 'wonderful', 'perfect', 'helpful', 'useful', 'thanks', 'thank you'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'useless', 'waste', 'boring', 'stupid', 'sucks'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    });
    
    const totalScore = positiveScore - negativeScore;
    
    if (totalScore > 0) {
      return { sentiment: 'positive', score: Math.min(1, totalScore / 5) };
    } else if (totalScore < 0) {
      return { sentiment: 'negative', score: Math.max(-1, totalScore / 5) };
    } else {
      return { sentiment: 'neutral', score: 0 };
    }
  }

  detectSpam(comment: Comment): boolean {
    const text = comment.textOriginal.toLowerCase();
    const spamIndicators = [
      'subscribe', 'check out my channel', 'visit my channel', 'follow me',
      'like and subscribe', 'smash the like button', 'click the link',
      'free money', 'make money', 'earn money', 'get rich quick'
    ];
    
    return spamIndicators.some(indicator => text.includes(indicator));
  }

  detectBotBehavior(comment: Comment): boolean {
    const text = comment.textOriginal;
    
    // Check for bot-like patterns
    const botIndicators = [
      text.length < 10, // Very short comments
      /^[A-Z\s!]+$/.test(text), // All caps
      /(.)\1{4,}/.test(text), // Repeated characters
      comment.authorDisplayName.includes('RandomUser') || 
      comment.authorDisplayName.includes('User123') ||
      /^[A-Za-z]+\d+$/.test(comment.authorDisplayName) // Generic username patterns
    ];
    
    return botIndicators.some(indicator => indicator);
  }

  calculateTrustScore(comment: Comment): number {
    let score = 7; // Base score
    
    // Positive factors
    if (comment.isVerified) score += 2;
    if (comment.likeCount > 5) score += 1;
    if (comment.textOriginal.length > 50) score += 1;
    
    // Negative factors
    if (comment.isSpam) score -= 4;
    if (comment.isBotLike) score -= 3;
    if (comment.isSuspicious) score -= 2;
    if (comment.likeCount === 0 && comment.textOriginal.length < 20) score -= 1;
    
    return Math.max(0, Math.min(10, score));
  }

  async analyzeComments(comments: Comment[]): Promise<InsertAnalysis> {
    const totalComments = comments.length;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let suspiciousCount = 0;
    let spamCount = 0;
    let botLikeCount = 0;
    let verifiedCount = 0;
    let totalTrustScore = 0;

    for (const comment of comments) {
      // Analyze sentiment
      const sentiment = this.analyzeSentiment(comment.textOriginal);
      comment.sentiment = sentiment.sentiment;
      comment.sentimentScore = sentiment.score;

      // Detect spam and bot behavior
      comment.isSpam = this.detectSpam(comment);
      comment.isBotLike = this.detectBotBehavior(comment);
      comment.isSuspicious = comment.isSpam || comment.isBotLike;

      // Calculate trust score
      comment.trustScore = this.calculateTrustScore(comment);
      totalTrustScore += comment.trustScore;

      // Count categories
      if (comment.sentiment === 'positive') positiveCount++;
      else if (comment.sentiment === 'negative') negativeCount++;
      else neutralCount++;

      if (comment.isSuspicious) suspiciousCount++;
      if (comment.isSpam) spamCount++;
      if (comment.isBotLike) botLikeCount++;
      if (comment.isVerified) verifiedCount++;
    }

    const overallTrustScore = totalComments > 0 ? totalTrustScore / totalComments : 0;
    
    // Generate quality indicators
    const qualityIndicators: QualityIndicator[] = [];
    
    const spamPercentage = (spamCount / totalComments) * 100;
    const botPercentage = (botLikeCount / totalComments) * 100;
    const verifiedPercentage = (verifiedCount / totalComments) * 100;
    
    if (spamPercentage < 5) {
      qualityIndicators.push({
        type: 'spam',
        label: 'Low Spam',
        icon: 'fas fa-shield-alt',
        color: 'success'
      });
    } else if (spamPercentage > 20) {
      qualityIndicators.push({
        type: 'spam',
        label: 'High Spam',
        icon: 'fas fa-exclamation-triangle',
        color: 'warning'
      });
    }
    
    if (botPercentage < 5) {
      qualityIndicators.push({
        type: 'bot',
        label: `${Math.round(botPercentage)}% Bot Activity`,
        icon: 'fas fa-robot',
        color: 'success'
      });
    } else {
      qualityIndicators.push({
        type: 'bot',
        label: `${Math.round(botPercentage)}% Bot Activity`,
        icon: 'fas fa-robot',
        color: 'danger'
      });
    }
    
    if (verifiedPercentage > 10) {
      qualityIndicators.push({
        type: 'verified',
        label: 'Verified Users',
        icon: 'fas fa-user-check',
        color: 'success'
      });
    }
    
    return {
      videoId: comments[0]?.videoId || '',
      totalComments,
      positiveCount,
      negativeCount,
      neutralCount,
      suspiciousCount,
      spamCount,
      botLikeCount,
      verifiedCount,
      overallTrustScore: Math.round(overallTrustScore * 10) / 10,
      qualityIndicators,
    };
  }
}

export const sentimentService = new SentimentService();
