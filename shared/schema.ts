import { pgTable, text, serial, integer, real, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const videos = pgTable("videos", {
  id: text("id").primaryKey(), // YouTube video ID
  title: text("title").notNull(),
  description: text("description"),
  channelId: text("channel_id").notNull(),
  channelTitle: text("channel_title").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  duration: text("duration").notNull(),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  thumbnailUrl: text("thumbnail_url"),
  analyzed: boolean("analyzed").default(false),
  trustScore: real("trust_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey(), // YouTube comment ID
  videoId: text("video_id").notNull().references(() => videos.id),
  authorDisplayName: text("author_display_name").notNull(),
  authorProfileImageUrl: text("author_profile_image_url"),
  authorChannelId: text("author_channel_id"),
  textOriginal: text("text_original").notNull(),
  likeCount: integer("like_count").notNull().default(0),
  publishedAt: timestamp("published_at").notNull(),
  isVerified: boolean("is_verified").default(false),
  sentiment: text("sentiment"), // 'positive', 'negative', 'neutral'
  sentimentScore: real("sentiment_score"),
  trustScore: real("trust_score"),
  isSuspicious: boolean("is_suspicious").default(false),
  isSpam: boolean("is_spam").default(false),
  isBotLike: boolean("is_bot_like").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analysisResults = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  videoId: text("video_id").notNull().references(() => videos.id),
  totalComments: integer("total_comments").notNull(),
  positiveCount: integer("positive_count").notNull().default(0),
  negativeCount: integer("negative_count").notNull().default(0),
  neutralCount: integer("neutral_count").notNull().default(0),
  suspiciousCount: integer("suspicious_count").notNull().default(0),
  spamCount: integer("spam_count").notNull().default(0),
  botLikeCount: integer("bot_like_count").notNull().default(0),
  verifiedCount: integer("verified_count").notNull().default(0),
  overallTrustScore: real("overall_trust_score").notNull(),
  qualityIndicators: json("quality_indicators"), // JSON array of indicator objects
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  createdAt: true,
  analyzed: true,
  trustScore: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  createdAt: true,
  sentiment: true,
  sentimentScore: true,
  trustScore: true,
  isSuspicious: true,
  isSpam: true,
  isBotLike: true,
});

export const insertAnalysisSchema = createInsertSchema(analysisResults).omit({
  id: true,
  createdAt: true,
});

export type Video = typeof videos.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type AnalysisResult = typeof analysisResults.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export const searchVideoSchema = z.object({
  q: z.string().min(1, "Search query is required"),
  maxResults: z.number().min(1).max(50).default(10),
  order: z.enum(["relevance", "date", "rating", "viewCount"]).default("relevance"),
  publishedAfter: z.string().optional(),
  videoDuration: z.enum(["any", "short", "medium", "long"]).default("any"),
});

export type SearchVideoParams = z.infer<typeof searchVideoSchema>;
