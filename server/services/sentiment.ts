import { type Comment, type InsertAnalysis, type Video } from "@shared/schema";
import fetch from "node-fetch";

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
}

interface SentimentResponse {
  results: Array<{
    label: string;
    score: number;
  }>;
  cached: boolean;
  processing_time: number;
  batch_count?: number;
}

interface QualityIndicator {
  type: 'spam' | 'bot' | 'verified' | 'authentic' | 'engagement';
  label: string;
  icon: string;
  color: string;
}

async function analyzeSentimentsWithHuggingFace(texts: string[]): Promise<{ sentiment: string, score: number }[]> {
  try {
    const sentimentServiceUrl = process.env.SENTIMENT_SERVICE_URL || "http://127.0.0.1:8000";
    const response = await fetch(`${sentimentServiceUrl}/sentiment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
      // Increase timeout to 5 minutes for large batches
      signal: AbortSignal.timeout(300000) // 5 minutes
    });
    
    if (!response.ok) {
      throw new Error(`Sentiment service error: ${response.status} ${response.statusText}`);
    }
    
    const data: SentimentResponse = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error("Sentiment service error: results is not an array. No comments or invalid response.");
    }
    
    // Log performance metrics
    console.log(`Sentiment analysis: ${texts.length} texts processed in ${data.processing_time?.toFixed(2)}s (cached: ${data.cached})`);
    
    return data.results.map((r: any) => ({
    sentiment: r.label === "positive" ? "positive" : r.label === "negative" ? "negative" : "neutral",
    score: r.score,
  }));
  } catch (error) {
    console.error(`Sentiment analysis failed for ${texts.length} texts:`, error);
    
    // Return neutral sentiment for all texts as fallback
    return texts.map(() => ({
      sentiment: "neutral" as const,
      score: 0.5
    }));
  }
}

// Add a simple fallback sentiment analyzer for when the main service fails
function simpleSentimentAnalysis(text: string): { sentiment: string, score: number } {
  const lowerText = text.toLowerCase();
  
  // Simple keyword-based sentiment analysis
  const positiveWords = ['good', 'great', 'amazing', 'awesome', 'love', 'like', 'excellent', 'perfect', 'best', 'wonderful', 'fantastic', 'brilliant'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'worst', 'horrible', 'disappointing', 'waste', 'boring', 'stupid'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) {
    return { sentiment: 'positive', score: 0.8 };
  } else if (negativeCount > positiveCount) {
    return { sentiment: 'negative', score: 0.2 };
  } else {
    return { sentiment: 'neutral', score: 0.5 };
  }
}

// Health check function to verify sentiment service is working
async function checkSentimentServiceHealth(): Promise<boolean> {
  try {
    const sentimentServiceUrl = process.env.SENTIMENT_SERVICE_URL || "http://127.0.0.1:8000";
    const response = await fetch(`${sentimentServiceUrl}/sentiment/status`, {
      method: "GET",
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.status === "healthy" && data.model_loaded === true;
    }
    return false;
  } catch (error) {
    console.error("Sentiment service health check failed:", error);
    return false;
  }
}

export class SentimentService {
  
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
    // Use a regex compatible with ES5 for emoji detection
    const hasEmojis = /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(comment.textOriginal);
    const hasExcessivePunctuation = /[!]{3,}|[?]{3,}|[.]{3,}/.test(comment.textOriginal);
    const hasAllCaps = /^[A-Z\s!?.,]{10,}$/.test(comment.textOriginal);
    
    if (hasAllCaps) score -= 1;
    if (hasExcessivePunctuation) score -= 0.5;
    if (hasEmojis && comment.textOriginal.length < 50) score -= 0.5;
    
    return Math.max(0, Math.min(10, score));
  }

  async analyzeComments(comments: Comment[], video?: Video): Promise<InsertAnalysis> {
    // INTELLIGENT SAMPLING: Analyze more comments with smart strategies
    const ANALYSIS_MODES = {
      FAST: { maxComments: 150, batchSize: 30, strategy: 'top_engagement' },
      BALANCED: { maxComments: 300, batchSize: 50, strategy: 'stratified' },
      COMPREHENSIVE: { maxComments: 500, batchSize: 75, strategy: 'stratified' }
    };
    
    // Choose mode based on comment count and user preference (default to BALANCED)
    let mode = ANALYSIS_MODES.BALANCED;
    if (comments.length < 200) {
      mode = ANALYSIS_MODES.FAST;
    } else if (comments.length > 1000) {
      mode = ANALYSIS_MODES.COMPREHENSIVE;
    }
    
    console.log(`Using ${mode.strategy} analysis mode: ${mode.maxComments} comments, batch size ${mode.batchSize}`);
    
    // Intelligent sampling based on strategy
    let commentsToAnalyze: Comment[];
    
    if (mode.strategy === 'top_engagement') {
      // Sort by engagement (likes + length + verified status)
      commentsToAnalyze = comments
        .sort((a, b) => {
          const aScore = (a.likeCount || 0) + (a.textOriginal.length / 10) + (a.isVerified ? 10 : 0);
          const bScore = (b.likeCount || 0) + (b.textOriginal.length / 10) + (b.isVerified ? 10 : 0);
          return bScore - aScore;
        })
        .slice(0, mode.maxComments);
    } else if (mode.strategy === 'stratified') {
      // Stratified sampling: take top, middle, and random samples
      const topCount = Math.floor(mode.maxComments * 0.4); // 40% top engagement
      const middleCount = Math.floor(mode.maxComments * 0.4); // 40% middle engagement  
      const randomCount = mode.maxComments - topCount - middleCount; // 20% random
      
      // Sort by engagement
      const sortedComments = comments
        .sort((a, b) => {
          const aScore = (a.likeCount || 0) + (a.textOriginal.length / 10) + (a.isVerified ? 10 : 0);
          const bScore = (b.likeCount || 0) + (b.textOriginal.length / 10) + (b.isVerified ? 10 : 0);
          return bScore - aScore;
        });
      
      const topComments = sortedComments.slice(0, topCount);
      const middleComments = sortedComments.slice(
        Math.floor(sortedComments.length * 0.3),
        Math.floor(sortedComments.length * 0.3) + middleCount
      );
      
      // Random sample from remaining comments
      const remainingComments = sortedComments.slice(topCount + middleCount);
      const randomComments = remainingComments
        .sort(() => Math.random() - 0.5)
        .slice(0, randomCount);
      
      commentsToAnalyze = [...topComments, ...middleComments, ...randomComments];
    } else {
      // Fallback to simple top sampling
      commentsToAnalyze = comments.slice(0, mode.maxComments);
    }
    
    const totalComments = commentsToAnalyze.length;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let suspiciousCount = 0;
    let spamCount = 0;
    let botLikeCount = 0;
    let verifiedCount = 0;
    let engagedComments = 0;

    // Check if sentiment service is healthy
    const serviceHealthy = await checkSentimentServiceHealth();
    if (!serviceHealthy) {
      console.log("Sentiment service not healthy, using fallback analysis...");
    }

    // Process with configurable batch size
    const batchSize = mode.batchSize;
    const texts = commentsToAnalyze.map(comment => comment.textOriginal);
    let sentiments: { sentiment: string, score: number }[] = [];
    
    if (serviceHealthy) {
      try {
        // Process batches in parallel for optimal speed
        const batches = [];
    for (let i = 0; i < texts.length; i += batchSize) {
          batches.push(texts.slice(i, i + batchSize));
        }
        
        console.log(`Processing ${batches.length} batches in parallel (${texts.length} total texts)`);
        
        // Process all batches simultaneously
        const batchPromises = batches.map(batch => analyzeSentimentsWithHuggingFace(batch));
        const batchResults = await Promise.all(batchPromises);
        
        // Combine results
        for (const batchResult of batchResults) {
          sentiments = sentiments.concat(batchResult);
        }
        
      } catch (error) {
        console.error("Error in batch processing:", error);
        console.log("Using fallback sentiment analysis...");
        
        // Use fallback sentiment analysis for each comment
        sentiments = texts.map(text => simpleSentimentAnalysis(text));
      }
    } else {
      // Service not healthy, use fallback immediately
      console.log("Using fallback sentiment analysis (service not available)...");
      sentiments = texts.map(text => simpleSentimentAnalysis(text));
    }

    // Ensure we have sentiments for all comments
    while (sentiments.length < commentsToAnalyze.length) {
      sentiments.push({ sentiment: "neutral", score: 0.5 });
    }

    for (let i = 0; i < commentsToAnalyze.length; i++) {
      const comment = commentsToAnalyze[i];
      const sentiment = sentiments[i] || { sentiment: "neutral", score: 0.5 }; // Fallback
      comment.sentiment = sentiment.sentiment;
      comment.sentimentScore = sentiment.score;

      // Detect spam and bot behavior
      comment.isSpam = this.detectSpam(comment);
      comment.isBotLike = this.detectBotBehavior(comment);
      comment.isSuspicious = comment.isSpam || comment.isBotLike;

      // Calculate trust score (legacy, not used for rating)
      comment.trustScore = this.calculateTrustScore(comment);

      // Count categories
      if (comment.sentiment === 'positive') positiveCount++;
      else if (comment.sentiment === 'negative') negativeCount++;
      else neutralCount++;

      if (comment.isSuspicious) suspiciousCount++;
      if (comment.isSpam) spamCount++;
      if (comment.isBotLike) botLikeCount++;
      if (comment.isVerified) verifiedCount++;
      // Engagement: likes > 5 or word count > 15
      const wordCount = comment.textOriginal.split(/\s+/).length;
      if ((comment.likeCount || 0) > 5 || wordCount > 15) engagedComments++;
    }

    // --- REAL-WORLD RATING FORMULA (UPDATED) ---
    const pos = positiveCount;
    const neg = negativeCount;
    const neu = neutralCount;
    const total = pos + neu + neg;
    let baseRating = 0;
    let confidence = 0;
    if (total > 0) {
      // Weighted rating considering engagement and verification
      let weightedPos = 0;
      let weightedNeg = 0;
      let weightedNeu = 0;
      for (let i = 0; i < commentsToAnalyze.length; i++) {
        const comment = commentsToAnalyze[i];
        const weight = 1 + (comment.likeCount || 0) / 10 + (comment.isVerified ? 0.5 : 0);
        if (comment.sentiment === 'positive') weightedPos += weight;
        else if (comment.sentiment === 'negative') weightedNeg += weight;
        else weightedNeu += weight;
      }
      const totalWeight = weightedPos + weightedNeu + weightedNeg;
      // New formula: negative comments reduce score more
      baseRating = ((weightedPos * 1) + (weightedNeu * 0.8) + (weightedNeg * -0.2)) / totalWeight * 5;
      baseRating = Math.max(0, Math.min(5, baseRating));
      baseRating = Math.round(baseRating * 100) / 100;
      // Calculate confidence based on sample size and distribution
      const sampleRatio = total / comments.length;
      const distributionBalance = 1 - Math.abs(pos - neg) / total;
      confidence = Math.min(1, sampleRatio * distributionBalance * (total / 100));
    }
    // --- ENGAGEMENT MODIFIER (UPDATED) ---
    let engagementScore = 1.0;
    if (video) {
      const likeRatio = video.likeCount / Math.max(1, video.viewCount);
      const commentRatio = video.commentCount / Math.max(1, video.viewCount);
      // Like ratio scoring (updated)
      let likeScore = 1.0;
      if (likeRatio >= 0.05) likeScore = 1.25;
      else if (likeRatio >= 0.02) likeScore = 1.15;
      else if (likeRatio >= 0.01) likeScore = 1.05;
      else likeScore = 1.0;
      // Comment ratio scoring (updated)
      let commentScore = 1.0;
      if (commentRatio >= 0.005) commentScore = 1.2;
      else if (commentRatio >= 0.001) commentScore = 1.1;
      else if (commentRatio >= 0.0005) commentScore = 1.02;
      else commentScore = 1.0;
      engagementScore = (likeScore + commentScore) / 2;
    }
    // --- FINAL RATING ---
    let rating = baseRating * engagementScore;
      rating = Math.max(0, Math.min(5, rating));
      rating = Math.round(rating * 100) / 100;
    // --- END REAL-WORLD RATING FORMULA ---

    // Generate quality indicators (unchanged)
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
    // Add video engagement indicator (unchanged)
    if (video) {
      const likeViewRatio = video.likeCount / Math.max(1, video.viewCount);
      if (likeViewRatio > 0.05) {
        qualityIndicators.push({
          type: 'engagement',
          label: 'High Engagement',
          icon: 'fas fa-thumbs-up',
          color: 'success'
        });
      } else if (likeViewRatio < 0.01) {
        qualityIndicators.push({
          type: 'engagement',
          label: 'Low Engagement',
          icon: 'fas fa-thumbs-down',
          color: 'warning'
        });
      }
    }
    // Engagement quality (unchanged)
    let engagementQuality = "Unknown";
    if (video) {
      const likeViewRatio = video.likeCount / Math.max(1, video.viewCount);
      const commentEngagementRatio = totalComments / Math.max(1, video.viewCount / 1000);
      let likeScore = 0;
      let commentScore = 0;
      if (likeViewRatio >= 0.08) likeScore = 3;
      else if (likeViewRatio >= 0.05) likeScore = 2;
      else if (likeViewRatio >= 0.03) likeScore = 1;
      else if (likeViewRatio >= 0.01) likeScore = 0;
      else likeScore = -1;
      if (commentEngagementRatio >= 1.0) commentScore = 3;
      else if (commentEngagementRatio >= 0.5) commentScore = 2;
      else if (commentEngagementRatio >= 0.2) commentScore = 1;
      else if (commentEngagementRatio >= 0.1) commentScore = 0;
      else commentScore = -1;
      const totalEngagementScore = likeScore + commentScore;
      if (totalEngagementScore >= 5) engagementQuality = "Exceptional";
      else if (totalEngagementScore >= 3) engagementQuality = "Excellent";
      else if (totalEngagementScore >= 1) engagementQuality = "Good";
      else if (totalEngagementScore >= -1) engagementQuality = "Fair";
      else if (totalEngagementScore >= -3) engagementQuality = "Poor";
      else engagementQuality = "Very Poor";
    }
    return {
      videoId: commentsToAnalyze[0]?.videoId || '',
      totalComments,
      positiveCount,
      negativeCount,
      neutralCount,
      suspiciousCount,
      spamCount,
      botLikeCount,
      verifiedCount,
      rating, // <-- enhanced weighted rating
      confidence: confidence || 0, // <-- confidence level of the rating (with fallback)
      qualityIndicators,
      engagementQuality,
    };
  }
}

export const sentimentService = new SentimentService();
