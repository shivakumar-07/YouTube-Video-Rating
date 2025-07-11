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
    // Enhanced sentiment analysis with weighted scoring and context
    const positiveWords = {
      // Strong positive
      'excellent': 3, 'amazing': 3, 'fantastic': 3, 'outstanding': 3, 'brilliant': 3,
      'perfect': 2.5, 'wonderful': 2.5, 'awesome': 2.5, 'incredible': 2.5,
      'great': 2, 'good': 2, 'helpful': 2, 'useful': 2, 'love': 2,
      'nice': 1.5, 'fine': 1.5, 'okay': 1, 'thanks': 1.5, 'thank': 1.5,
      'recommend': 2, 'best': 2.5, 'quality': 1.5, 'works': 1.5, 'easy': 1.5
    };
    
    const negativeWords = {
      // Strong negative
      'terrible': 3, 'awful': 3, 'horrible': 3, 'worst': 3, 'hate': 3,
      'useless': 2.5, 'waste': 2.5, 'disappointing': 2.5, 'pathetic': 2.5,
      'bad': 2, 'poor': 2, 'wrong': 2, 'fail': 2, 'broken': 2,
      'boring': 1.5, 'meh': 1, 'not': 1, 'no': 0.5, 'stupid': 2,
      'sucks': 2, 'shit': 2.5, 'crap': 2, 'garbage': 2.5
    };
    
    const intensifiers = {
      'very': 1.5, 'extremely': 2, 'really': 1.3, 'totally': 1.4,
      'absolutely': 1.8, 'completely': 1.6, 'quite': 1.2, 'so': 1.3
    };
    
    const negations = ['not', 'no', 'never', 'nothing', 'nobody', 'neither', 'none'];
    
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    let positiveScore = 0;
    let negativeScore = 0;
    let totalWords = words.length;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let multiplier = 1;
      let isNegated = false;
      
      // Check for intensifiers in previous word
      if (i > 0 && intensifiers[words[i-1]]) {
        multiplier = intensifiers[words[i-1]];
      }
      
      // Check for negations in previous 2 words
      for (let j = Math.max(0, i-2); j < i; j++) {
        if (negations.includes(words[j])) {
          isNegated = true;
          break;
        }
      }
      
      if (positiveWords[word]) {
        const score = positiveWords[word] * multiplier;
        if (isNegated) {
          negativeScore += score;
        } else {
          positiveScore += score;
        }
      } else if (negativeWords[word]) {
        const score = negativeWords[word] * multiplier;
        if (isNegated) {
          positiveScore += score;
        } else {
          negativeScore += score;
        }
      }
    }
    
    // Normalize scores based on text length
    const lengthFactor = Math.max(1, totalWords / 10);
    positiveScore = positiveScore / lengthFactor;
    negativeScore = negativeScore / lengthFactor;
    
    const netScore = positiveScore - negativeScore;
    const confidence = Math.min(1, (positiveScore + negativeScore) / 3);
    
    if (netScore > 0.5) {
      return { sentiment: 'positive', score: Math.min(1, netScore / 2) };
    } else if (netScore < -0.5) {
      return { sentiment: 'negative', score: Math.max(-1, netScore / 2) };
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
    let score = 5; // Base score
    
    // Positive factors (weighted by importance)
    if (comment.isVerified) score += 3;
    if (comment.likeCount > 20) score += 2;
    else if (comment.likeCount > 5) score += 1;
    if (comment.textOriginal.length > 100) score += 1.5;
    else if (comment.textOriginal.length > 50) score += 1;
    
    // Content quality indicators
    const hasQuestions = /\?/.test(comment.textOriginal);
    const hasSpecificDetails = /\b(minute|hour|day|week|month|year|\d+)\b/.test(comment.textOriginal);
    const hasPersonalExperience = /\b(I|my|me|tried|used|bought|purchased)\b/i.test(comment.textOriginal);
    
    if (hasSpecificDetails) score += 1;
    if (hasPersonalExperience) score += 1;
    if (hasQuestions) score += 0.5;
    
    // Engagement factors
    const likeRatio = comment.likeCount / Math.max(1, comment.textOriginal.length / 10);
    if (likeRatio > 2) score += 1;
    
    // Negative factors (weighted by severity)
    if (comment.isSpam) score -= 5;
    if (comment.isBotLike) score -= 4;
    if (comment.isSuspicious) score -= 3;
    if (comment.likeCount === 0 && comment.textOriginal.length < 20) score -= 2;
    
    // Pattern-based penalties
    const hasEmojis = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu.test(comment.textOriginal);
    const hasExcessivePunctuation = /[!]{3,}|[?]{3,}|[.]{3,}/.test(comment.textOriginal);
    const hasAllCaps = /^[A-Z\s!?.,]{10,}$/.test(comment.textOriginal);
    
    if (hasAllCaps) score -= 1;
    if (hasExcessivePunctuation) score -= 0.5;
    if (hasEmojis && comment.textOriginal.length < 50) score -= 0.5;
    
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
