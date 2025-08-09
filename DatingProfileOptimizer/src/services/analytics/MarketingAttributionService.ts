/**
 * Marketing Attribution Service
 * Handles multi-touch attribution, campaign performance tracking, and ROI analysis
 * Supports both organic and paid acquisition channels
 */

import {
  MarketingAttribution,
  CampaignPerformance,
  ViralCoefficient,
  UserBehaviorEvent,
  DateRange
} from '../../types';

export interface TouchpointData {
  channel: string;
  campaign: string;
  source: string;
  medium: string;
  content?: string;
  term?: string;
  timestamp: string;
  value: number;
  userId?: string;
  sessionId: string;
}

export interface AttributionModel {
  name: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'data_driven';
  weights: (touchpoints: TouchpointData[], conversionTime: string) => number[];
}

export interface ConversionEvent {
  userId: string;
  eventType: string;
  eventValue: number;
  timestamp: string;
  properties: Record<string, any>;
}

export interface ChannelPerformance {
  channel: string;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    cost: number;
    ctr: number;
    cpa: number;
    roas: number;
    conversionRate: number;
  };
  trends: {
    period: string;
    impressions: number;
    conversions: number;
    revenue: number;
  }[];
}

export class MarketingAttributionService {
  private static instance: MarketingAttributionService;
  private touchpointBuffer: Map<string, TouchpointData[]> = new Map();
  private conversionEvents: ConversionEvent[] = [];
  private attributionModels: Map<string, AttributionModel> = new Map();
  private campaignData: Map<string, CampaignPerformance> = new Map();
  private lookbackWindow = 30; // days
  private sessionTimeout = 30; // minutes

  private constructor() {
    this.initializeAttributionModels();
  }

  public static getInstance(): MarketingAttributionService {
    if (!MarketingAttributionService.instance) {
      MarketingAttributionService.instance = new MarketingAttributionService();
    }
    return MarketingAttributionService.instance;
  }

  /**
   * Track a touchpoint in the user's journey
   */
  public async trackTouchpoint(touchpoint: TouchpointData): Promise<void> {
    const userId = touchpoint.userId || touchpoint.sessionId;
    
    // Get existing touchpoints for user
    let userTouchpoints = this.touchpointBuffer.get(userId) || [];
    
    // Clean old touchpoints outside lookback window
    const cutoffTime = new Date(Date.now() - (this.lookbackWindow * 24 * 60 * 60 * 1000));
    userTouchpoints = userTouchpoints.filter(tp => new Date(tp.timestamp) > cutoffTime);
    
    // Add new touchpoint
    userTouchpoints.push(touchpoint);
    this.touchpointBuffer.set(userId, userTouchpoints);

    console.log(`Touchpoint tracked: ${touchpoint.channel}/${touchpoint.source} for user ${userId}`);
  }

  /**
   * Record a conversion event and attribute it across touchpoints
   */
  public async recordConversion(conversion: ConversionEvent): Promise<MarketingAttribution> {
    const userTouchpoints = this.touchpointBuffer.get(conversion.userId) || [];
    
    if (userTouchpoints.length === 0) {
      // No attribution data available - likely organic/direct
      const attribution: MarketingAttribution = {
        userId: conversion.userId,
        conversionEvent: conversion.eventType,
        touchpoints: [{
          channel: 'direct',
          campaign: 'organic',
          source: 'direct',
          medium: 'none',
          timestamp: conversion.timestamp,
          value: conversion.eventValue
        }],
        attributionModel: 'last_touch',
        revenue: conversion.eventValue,
        conversionDate: conversion.timestamp
      };
      
      return attribution;
    }

    // Apply different attribution models
    const attributions = await Promise.all([
      this.applyAttributionModel('first_touch', userTouchpoints, conversion),
      this.applyAttributionModel('last_touch', userTouchpoints, conversion),
      this.applyAttributionModel('linear', userTouchpoints, conversion),
      this.applyAttributionModel('time_decay', userTouchpoints, conversion),
      this.applyAttributionModel('data_driven', userTouchpoints, conversion)
    ]);

    // Use data-driven model as primary, fall back to time_decay
    const primaryAttribution = attributions[4] || attributions[3];
    
    // Store conversion event
    this.conversionEvents.push(conversion);
    
    // Update campaign performance metrics
    await this.updateCampaignMetrics(primaryAttribution);
    
    return primaryAttribution;
  }

  /**
   * Apply specific attribution model
   */
  private async applyAttributionModel(
    modelName: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'data_driven',
    touchpoints: TouchpointData[],
    conversion: ConversionEvent
  ): Promise<MarketingAttribution> {
    const model = this.attributionModels.get(modelName);
    if (!model) {
      throw new Error(`Attribution model ${modelName} not found`);
    }

    const weights = model.weights(touchpoints, conversion.timestamp);
    
    const attributedTouchpoints = touchpoints.map((tp, index) => ({
      ...tp,
      value: conversion.eventValue * weights[index]
    }));

    return {
      userId: conversion.userId,
      conversionEvent: conversion.eventType,
      touchpoints: attributedTouchpoints,
      attributionModel: modelName,
      revenue: conversion.eventValue,
      conversionDate: conversion.timestamp
    };
  }

  /**
   * Get multi-touch attribution report
   */
  public async getAttributionReport(dateRange: DateRange): Promise<any> {
    const conversions = this.getConversionsInRange(dateRange);
    
    const channelAttribution: Record<string, {
      conversions: number;
      revenue: number;
      touchpoints: number;
      firstTouch: number;
      lastTouch: number;
      assisted: number;
    }> = {};

    const campaignAttribution: Record<string, {
      conversions: number;
      revenue: number;
      touchpoints: number;
    }> = {};

    // Process each conversion
    for (const conversion of conversions) {
      const userTouchpoints = this.touchpointBuffer.get(conversion.userId) || [];
      const attribution = await this.applyAttributionModel('data_driven', userTouchpoints, conversion);
      
      // Aggregate by channel
      attribution.touchpoints.forEach((tp, index) => {
        if (!channelAttribution[tp.channel]) {
          channelAttribution[tp.channel] = {
            conversions: 0,
            revenue: 0,
            touchpoints: 0,
            firstTouch: 0,
            lastTouch: 0,
            assisted: 0
          };
        }
        
        const channelData = channelAttribution[tp.channel];
        channelData.revenue += tp.value;
        channelData.touchpoints += 1;
        
        if (index === 0) channelData.firstTouch += 1;
        if (index === attribution.touchpoints.length - 1) channelData.lastTouch += 1;
        if (index > 0 && index < attribution.touchpoints.length - 1) channelData.assisted += 1;
      });

      // Aggregate by campaign
      attribution.touchpoints.forEach(tp => {
        const campaignKey = `${tp.channel}_${tp.campaign}`;
        if (!campaignAttribution[campaignKey]) {
          campaignAttribution[campaignKey] = {
            conversions: 0,
            revenue: 0,
            touchpoints: 0
          };
        }
        
        const campaignData = campaignAttribution[campaignKey];
        campaignData.revenue += tp.value;
        campaignData.touchpoints += 1;
      });
    }

    return {
      dateRange,
      totalConversions: conversions.length,
      totalRevenue: conversions.reduce((sum, c) => sum + c.eventValue, 0),
      channelAttribution,
      campaignAttribution,
      attributionComparison: await this.compareAttributionModels(conversions),
      customerJourney: await this.analyzeCustomerJourneys(conversions),
      crossChannelInsights: await this.analyzeCrossChannelInteractions(conversions)
    };
  }

  /**
   * Get campaign performance metrics
   */
  public async getCampaignPerformance(dateRange: DateRange): Promise<CampaignPerformance[]> {
    const campaigns: CampaignPerformance[] = [];
    
    for (const [campaignId, campaign] of this.campaignData) {
      if (this.isInDateRange(campaign.timeRange, dateRange)) {
        campaigns.push(campaign);
      }
    }

    return campaigns.sort((a, b) => b.metrics.revenue - a.metrics.revenue);
  }

  /**
   * Calculate viral coefficient and network effects
   */
  public async calculateViralMetrics(userId: string, dateRange: DateRange): Promise<ViralCoefficient> {
    const userTouchpoints = this.touchpointBuffer.get(userId) || [];
    const referralTouchpoints = userTouchpoints.filter(tp => 
      tp.source === 'referral' || tp.medium === 'referral' || tp.campaign.includes('referral')
    );

    // Calculate shares generated by this user
    const sharesGenerated = await this.countUserShares(userId, dateRange);
    const clicksGenerated = await this.countReferralClicks(userId, dateRange);
    const conversionsGenerated = await this.countReferralConversions(userId, dateRange);

    const viralCoefficient = sharesGenerated > 0 ? conversionsGenerated / sharesGenerated : 0;

    return {
      userId,
      referralSource: this.determineReferralSource(referralTouchpoints),
      sharesGenerated,
      clicksGenerated,
      conversionsGenerated,
      viralCoefficient,
      networkEffect: await this.calculateNetworkEffect(userId),
      contentShared: await this.getContentShared(userId, dateRange),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Track organic growth metrics
   */
  public async trackOrganicGrowth(dateRange: DateRange): Promise<any> {
    const organicConversions = this.conversionEvents.filter(conv => {
      const userTouchpoints = this.touchpointBuffer.get(conv.userId) || [];
      return userTouchpoints.length === 0 || userTouchpoints.every(tp => 
        tp.source === 'direct' || tp.source === 'organic' || tp.medium === 'organic'
      );
    });

    const socialMediaConversions = this.conversionEvents.filter(conv => {
      const userTouchpoints = this.touchpointBuffer.get(conv.userId) || [];
      return userTouchpoints.some(tp => 
        ['instagram', 'tiktok', 'twitter', 'facebook'].includes(tp.source.toLowerCase())
      );
    });

    const wordOfMouthConversions = this.conversionEvents.filter(conv => {
      const userTouchpoints = this.touchpointBuffer.get(conv.userId) || [];
      return userTouchpoints.some(tp => tp.source === 'referral' || tp.medium === 'referral');
    });

    return {
      dateRange,
      organicMetrics: {
        conversions: organicConversions.length,
        revenue: organicConversions.reduce((sum, c) => sum + c.eventValue, 0),
        growthRate: await this.calculateOrganicGrowthRate(dateRange)
      },
      socialMedia: {
        conversions: socialMediaConversions.length,
        revenue: socialMediaConversions.reduce((sum, c) => sum + c.eventValue, 0),
        platforms: await this.analyzeSocialMediaPlatforms(socialMediaConversions)
      },
      wordOfMouth: {
        conversions: wordOfMouthConversions.length,
        revenue: wordOfMouthConversions.reduce((sum, c) => sum + c.eventValue, 0),
        viralCoefficient: await this.calculateOverallViralCoefficient(dateRange)
      },
      brandMentions: await this.trackBrandMentions(dateRange),
      influencerImpact: await this.analyzeInfluencerImpact(dateRange)
    };
  }

  /**
   * Calculate customer acquisition cost by channel
   */
  public async calculateCAC(channel: string, dateRange: DateRange): Promise<number> {
    const campaign = Array.from(this.campaignData.values()).find(c => 
      c.channel === channel && this.isInDateRange(c.timeRange, dateRange)
    );
    
    if (!campaign || campaign.metrics.conversions === 0) {
      return 0;
    }

    return campaign.metrics.cost / campaign.metrics.conversions;
  }

  /**
   * Calculate return on ad spend (ROAS)
   */
  public async calculateROAS(channel: string, dateRange: DateRange): Promise<number> {
    const campaign = Array.from(this.campaignData.values()).find(c => 
      c.channel === channel && this.isInDateRange(c.timeRange, dateRange)
    );
    
    if (!campaign || campaign.metrics.cost === 0) {
      return 0;
    }

    return campaign.metrics.revenue / campaign.metrics.cost;
  }

  /**
   * Get channel performance comparison
   */
  public async getChannelComparison(dateRange: DateRange): Promise<ChannelPerformance[]> {
    const channelMetrics: Record<string, ChannelPerformance> = {};

    // Aggregate data by channel
    for (const [, campaign] of this.campaignData) {
      if (this.isInDateRange(campaign.timeRange, dateRange)) {
        if (!channelMetrics[campaign.channel]) {
          channelMetrics[campaign.channel] = {
            channel: campaign.channel,
            metrics: {
              impressions: 0,
              clicks: 0,
              conversions: 0,
              revenue: 0,
              cost: 0,
              ctr: 0,
              cpa: 0,
              roas: 0,
              conversionRate: 0
            },
            trends: []
          };
        }

        const channelData = channelMetrics[campaign.channel];
        channelData.metrics.impressions += campaign.metrics.impressions;
        channelData.metrics.clicks += campaign.metrics.clicks;
        channelData.metrics.conversions += campaign.metrics.conversions;
        channelData.metrics.revenue += campaign.metrics.revenue;
        channelData.metrics.cost += campaign.metrics.cost;
      }
    }

    // Calculate derived metrics
    Object.values(channelMetrics).forEach(channel => {
      const metrics = channel.metrics;
      metrics.ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0;
      metrics.cpa = metrics.conversions > 0 ? metrics.cost / metrics.conversions : 0;
      metrics.roas = metrics.cost > 0 ? metrics.revenue / metrics.cost : 0;
      metrics.conversionRate = metrics.clicks > 0 ? metrics.conversions / metrics.clicks : 0;
    });

    return Object.values(channelMetrics).sort((a, b) => b.metrics.revenue - a.metrics.revenue);
  }

  /**
   * Initialize attribution models
   */
  private initializeAttributionModels(): void {
    // First Touch Attribution
    this.attributionModels.set('first_touch', {
      name: 'first_touch',
      weights: (touchpoints) => {
        const weights = new Array(touchpoints.length).fill(0);
        if (touchpoints.length > 0) weights[0] = 1;
        return weights;
      }
    });

    // Last Touch Attribution
    this.attributionModels.set('last_touch', {
      name: 'last_touch',
      weights: (touchpoints) => {
        const weights = new Array(touchpoints.length).fill(0);
        if (touchpoints.length > 0) weights[touchpoints.length - 1] = 1;
        return weights;
      }
    });

    // Linear Attribution
    this.attributionModels.set('linear', {
      name: 'linear',
      weights: (touchpoints) => {
        const weight = touchpoints.length > 0 ? 1 / touchpoints.length : 0;
        return new Array(touchpoints.length).fill(weight);
      }
    });

    // Time Decay Attribution
    this.attributionModels.set('time_decay', {
      name: 'time_decay',
      weights: (touchpoints, conversionTime) => {
        if (touchpoints.length === 0) return [];
        
        const conversionTimestamp = new Date(conversionTime).getTime();
        const halfLife = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        
        const weights = touchpoints.map(tp => {
          const timeDiff = conversionTimestamp - new Date(tp.timestamp).getTime();
          return Math.pow(0.5, timeDiff / halfLife);
        });
        
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        return weights.map(w => w / totalWeight);
      }
    });

    // Data-Driven Attribution (simplified ML-based approach)
    this.attributionModels.set('data_driven', {
      name: 'data_driven',
      weights: (touchpoints, conversionTime) => {
        // Simplified data-driven model - in production, this would use ML algorithms
        // For now, we'll use a hybrid of position and time-based weighting
        
        if (touchpoints.length === 0) return [];
        if (touchpoints.length === 1) return [1];
        
        const conversionTimestamp = new Date(conversionTime).getTime();
        const weights = touchpoints.map((tp, index) => {
          // Position weight (first and last touch get higher weights)
          const positionWeight = index === 0 || index === touchpoints.length - 1 ? 0.4 : 0.2;
          
          // Time decay weight
          const timeDiff = conversionTimestamp - new Date(tp.timestamp).getTime();
          const halfLife = 7 * 24 * 60 * 60 * 1000;
          const timeWeight = Math.pow(0.5, timeDiff / halfLife);
          
          // Channel value weight (paid channels get higher attribution in this model)
          const channelWeight = ['google', 'facebook', 'instagram'].includes(tp.channel.toLowerCase()) ? 1.2 : 1.0;
          
          return positionWeight * timeWeight * channelWeight;
        });
        
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        return weights.map(w => w / totalWeight);
      }
    });
  }

  /**
   * Update campaign performance metrics
   */
  private async updateCampaignMetrics(attribution: MarketingAttribution): Promise<void> {
    for (const touchpoint of attribution.touchpoints) {
      const campaignKey = `${touchpoint.channel}_${touchpoint.campaign}`;
      
      let campaign = this.campaignData.get(campaignKey);
      if (!campaign) {
        campaign = {
          campaignId: campaignKey,
          campaignName: touchpoint.campaign,
          channel: touchpoint.channel as any,
          metrics: {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            cost: 0,
            revenue: 0,
            ctr: 0,
            cpa: 0,
            roas: 0,
            ltv: 0
          },
          demographics: {
            age: {},
            gender: {},
            location: {}
          },
          creativePerformance: [],
          timeRange: {
            start: touchpoint.timestamp,
            end: attribution.conversionDate
          }
        };
      }

      // Update metrics
      campaign.metrics.revenue += touchpoint.value;
      campaign.metrics.conversions += 1;
      
      this.campaignData.set(campaignKey, campaign);
    }
  }

  // Helper methods
  private getConversionsInRange(dateRange: DateRange): ConversionEvent[] {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    return this.conversionEvents.filter(conv => {
      const convDate = new Date(conv.timestamp);
      return convDate >= start && convDate <= end;
    });
  }

  private isInDateRange(range: DateRange, targetRange: DateRange): boolean {
    const rangeStart = new Date(range.start);
    const rangeEnd = new Date(range.end);
    const targetStart = new Date(targetRange.start);
    const targetEnd = new Date(targetRange.end);
    
    return rangeStart <= targetEnd && rangeEnd >= targetStart;
  }

  // Mock implementations for complex calculations
  private async compareAttributionModels(conversions: ConversionEvent[]): Promise<any> {
    return {}; // Implementation would compare different attribution models
  }

  private async analyzeCustomerJourneys(conversions: ConversionEvent[]): Promise<any> {
    return {}; // Implementation would analyze common customer journey patterns
  }

  private async analyzeCrossChannelInteractions(conversions: ConversionEvent[]): Promise<any> {
    return {}; // Implementation would analyze how different channels work together
  }

  private async countUserShares(userId: string, dateRange: DateRange): Promise<number> {
    return 0; // Implementation would count social shares by user
  }

  private async countReferralClicks(userId: string, dateRange: DateRange): Promise<number> {
    return 0; // Implementation would count clicks from user's referrals
  }

  private async countReferralConversions(userId: string, dateRange: DateRange): Promise<number> {
    return 0; // Implementation would count conversions from user's referrals
  }

  private determineReferralSource(touchpoints: TouchpointData[]): 'organic_share' | 'referral_program' | 'social_media' | 'word_of_mouth' {
    return 'organic_share'; // Implementation would determine the primary referral source
  }

  private async calculateNetworkEffect(userId: string): Promise<any> {
    return {}; // Implementation would calculate network effect metrics
  }

  private async getContentShared(userId: string, dateRange: DateRange): Promise<any[]> {
    return []; // Implementation would get content shared by user
  }

  private async calculateOrganicGrowthRate(dateRange: DateRange): Promise<number> {
    return 0; // Implementation would calculate organic growth rate
  }

  private async analyzeSocialMediaPlatforms(conversions: ConversionEvent[]): Promise<any> {
    return {}; // Implementation would analyze performance by social platform
  }

  private async calculateOverallViralCoefficient(dateRange: DateRange): Promise<number> {
    return 0; // Implementation would calculate overall viral coefficient
  }

  private async trackBrandMentions(dateRange: DateRange): Promise<any> {
    return {}; // Implementation would track brand mentions across platforms
  }

  private async analyzeInfluencerImpact(dateRange: DateRange): Promise<any> {
    return {}; // Implementation would analyze influencer campaign impact
  }
}

export default MarketingAttributionService;