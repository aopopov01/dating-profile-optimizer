/**
 * Reporting and Alerting Service
 * Provides automated report generation, scheduled deliveries, and intelligent alerting
 * Supports multiple output formats and delivery channels
 */

import {
  DateRange,
  DashboardAlert,
  BusinessMetrics,
  ApplicationPerformance,
  AIModelPerformance
} from '../../types';

import AnalyticsManager from './AnalyticsManager';
import BusinessIntelligenceDashboard from './BusinessIntelligenceDashboard';
import AIPerformanceMonitor from './AIPerformanceMonitor';
import OperationalMetricsMonitor from './OperationalMetricsMonitor';

export interface ReportConfiguration {
  id: string;
  name: string;
  description: string;
  type: 'executive' | 'product' | 'marketing' | 'operations' | 'ai_performance' | 'custom';
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    time: string; // HH:MM format
    dayOfWeek?: number; // 0-6 for weekly reports
    dayOfMonth?: number; // 1-31 for monthly reports
    timezone: string;
  };
  recipients: {
    email: string;
    role: string;
    preferences: {
      format: 'pdf' | 'html' | 'json' | 'csv';
      includeCharts: boolean;
      includeTrends: boolean;
      includeRecommendations: boolean;
    };
  }[];
  dateRange: {
    type: 'relative' | 'fixed';
    value: string; // '7d', '30d', '3m' for relative or ISO date for fixed
  };
  filters: Record<string, any>;
  enabled: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'percent_change' | 'anomaly';
  threshold: number;
  lookbackPeriod: string; // '5m', '1h', '1d'
  severity: 'info' | 'warning' | 'critical';
  channels: AlertChannel[];
  enabled: boolean;
  suppressionPeriod: number; // minutes
  lastTriggered?: string;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'push' | 'sms';
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface GeneratedReport {
  id: string;
  configurationId: string;
  type: string;
  generatedAt: string;
  dateRange: DateRange;
  format: string;
  size: number;
  url?: string;
  error?: string;
  deliveryStatus: {
    channel: string;
    status: 'pending' | 'sent' | 'failed';
    timestamp: string;
    error?: string;
  }[];
}

export interface TriggeredAlert {
  id: string;
  ruleId: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  triggeredAt: string;
  resolvedAt?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  message: string;
  context: Record<string, any>;
}

export class ReportingAlertingService {
  private static instance: ReportingAlertingService;
  private reportConfigurations: Map<string, ReportConfiguration> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private generatedReports: GeneratedReport[] = [];
  private triggeredAlerts: TriggeredAlert[] = [];
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  private analyticsManager: AnalyticsManager;
  private biDashboard: BusinessIntelligenceDashboard;
  private aiMonitor: AIPerformanceMonitor;
  private opsMonitor: OperationalMetricsMonitor;

  private constructor() {
    this.analyticsManager = AnalyticsManager.getInstance();
    this.biDashboard = BusinessIntelligenceDashboard.getInstance();
    this.aiMonitor = AIPerformanceMonitor.getInstance();
    this.opsMonitor = OperationalMetricsMonitor.getInstance();
  }

  public static getInstance(): ReportingAlertingService {
    if (!ReportingAlertingService.instance) {
      ReportingAlertingService.instance = new ReportingAlertingService();
    }
    return ReportingAlertingService.instance;
  }

  /**
   * Start the reporting and alerting service
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('Reporting and Alerting Service already running');
      return;
    }

    this.isRunning = true;
    this.scheduleReports();
    this.startAlertMonitoring();
    
    console.log('Reporting and Alerting Service started');
  }

  /**
   * Stop the service
   */
  public stop(): void {
    this.isRunning = false;
    
    // Clear all scheduled jobs
    for (const [id, timeout] of this.scheduledJobs) {
      clearTimeout(timeout);
    }
    this.scheduledJobs.clear();
    
    console.log('Reporting and Alerting Service stopped');
  }

  /**
   * Add or update a report configuration
   */
  public configureReport(config: ReportConfiguration): void {
    this.reportConfigurations.set(config.id, config);
    
    if (config.enabled && this.isRunning) {
      this.scheduleReport(config);
    }
    
    console.log(`Report configured: ${config.name} (${config.type})`);
  }

  /**
   * Add or update an alert rule
   */
  public configureAlert(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    console.log(`Alert rule configured: ${rule.name}`);
  }

  /**
   * Generate report immediately
   */
  public async generateReport(configId: string): Promise<GeneratedReport> {
    const config = this.reportConfigurations.get(configId);
    if (!config) {
      throw new Error(`Report configuration not found: ${configId}`);
    }

    const reportId = this.generateReportId();
    const dateRange = this.parseDateRange(config.dateRange);

    console.log(`Generating report: ${config.name} for ${dateRange.start} to ${dateRange.end}`);

    try {
      const reportData = await this.collectReportData(config.type, dateRange, config.filters);
      const report: GeneratedReport = {
        id: reportId,
        configurationId: configId,
        type: config.type,
        generatedAt: new Date().toISOString(),
        dateRange,
        format: config.recipients[0]?.preferences.format || 'pdf',
        size: JSON.stringify(reportData).length,
        deliveryStatus: []
      };

      // Generate report in requested formats and deliver to recipients
      await this.deliverReport(report, config, reportData);

      this.generatedReports.push(report);
      return report;

    } catch (error) {
      const report: GeneratedReport = {
        id: reportId,
        configurationId: configId,
        type: config.type,
        generatedAt: new Date().toISOString(),
        dateRange,
        format: 'error',
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: []
      };

      this.generatedReports.push(report);
      throw error;
    }
  }

  /**
   * Send alert
   */
  public async sendAlert(
    metric: string,
    currentValue: number,
    threshold: number,
    condition: string,
    context: Record<string, any> = {}
  ): Promise<void> {
    // Find matching alert rules
    const matchingRules = Array.from(this.alertRules.values()).filter(rule => 
      rule.metric === metric && rule.enabled && this.evaluateCondition(rule, currentValue, threshold)
    );

    for (const rule of matchingRules) {
      // Check suppression period
      if (this.isAlertSuppressed(rule)) {
        continue;
      }

      const alert: TriggeredAlert = {
        id: this.generateAlertId(),
        ruleId: rule.id,
        metric,
        currentValue,
        threshold: rule.threshold,
        severity: rule.severity,
        triggeredAt: new Date().toISOString(),
        acknowledged: false,
        message: this.generateAlertMessage(rule, currentValue, context),
        context
      };

      this.triggeredAlerts.push(alert);

      // Send alert through configured channels
      await this.deliverAlert(alert, rule);

      // Update last triggered time
      rule.lastTriggered = alert.triggeredAt;
    }
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.triggeredAlerts.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    
    console.log(`Alert acknowledged: ${alertId} by ${userId}`);
    return true;
  }

  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.triggeredAlerts.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.resolvedAt = new Date().toISOString();
    
    console.log(`Alert resolved: ${alertId}`);
    return true;
  }

  /**
   * Get report history
   */
  public getReportHistory(limit = 50): GeneratedReport[] {
    return this.generatedReports
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): TriggeredAlert[] {
    return this.triggeredAlerts.filter(alert => !alert.resolvedAt);
  }

  /**
   * Get alert history
   */
  public getAlertHistory(limit = 100): TriggeredAlert[] {
    return this.triggeredAlerts
      .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())
      .slice(0, limit);
  }

  /**
   * Create default report configurations
   */
  public createDefaultReportConfigurations(): void {
    const configs: ReportConfiguration[] = [
      {
        id: 'executive_weekly',
        name: 'Executive Weekly Report',
        description: 'Weekly executive dashboard with key business metrics',
        type: 'executive',
        schedule: {
          frequency: 'weekly',
          time: '09:00',
          dayOfWeek: 1, // Monday
          timezone: 'UTC'
        },
        recipients: [
          {
            email: 'ceo@company.com',
            role: 'CEO',
            preferences: {
              format: 'pdf',
              includeCharts: true,
              includeTrends: true,
              includeRecommendations: true
            }
          }
        ],
        dateRange: {
          type: 'relative',
          value: '7d'
        },
        filters: {},
        enabled: true
      },
      {
        id: 'product_daily',
        name: 'Product Daily Report',
        description: 'Daily product metrics and AI performance',
        type: 'product',
        schedule: {
          frequency: 'daily',
          time: '08:00',
          timezone: 'UTC'
        },
        recipients: [
          {
            email: 'product@company.com',
            role: 'Product Manager',
            preferences: {
              format: 'html',
              includeCharts: true,
              includeTrends: true,
              includeRecommendations: true
            }
          }
        ],
        dateRange: {
          type: 'relative',
          value: '1d'
        },
        filters: {},
        enabled: true
      }
    ];

    configs.forEach(config => this.configureReport(config));
  }

  /**
   * Create default alert rules
   */
  public createDefaultAlertRules(): void {
    const rules: AlertRule[] = [
      {
        id: 'high_crash_rate',
        name: 'High Crash Rate',
        description: 'Alert when crash rate exceeds threshold',
        metric: 'crash_rate',
        condition: 'greater_than',
        threshold: 0.01, // 1%
        lookbackPeriod: '1h',
        severity: 'critical',
        channels: [
          {
            type: 'email',
            configuration: { recipients: ['dev@company.com'] },
            enabled: true
          }
        ],
        enabled: true,
        suppressionPeriod: 30
      },
      {
        id: 'low_conversion_rate',
        name: 'Low Conversion Rate',
        description: 'Alert when conversion rate drops significantly',
        metric: 'conversion_rate',
        condition: 'percent_change',
        threshold: -0.20, // 20% decrease
        lookbackPeriod: '6h',
        severity: 'warning',
        channels: [
          {
            type: 'slack',
            configuration: { channel: '#alerts' },
            enabled: true
          }
        ],
        enabled: true,
        suppressionPeriod: 60
      }
    ];

    rules.forEach(rule => this.configureAlert(rule));
  }

  /**
   * Private methods
   */
  private scheduleReports(): void {
    for (const [id, config] of this.reportConfigurations) {
      if (config.enabled) {
        this.scheduleReport(config);
      }
    }
  }

  private scheduleReport(config: ReportConfiguration): void {
    // Clear existing schedule
    const existingTimeout = this.scheduledJobs.get(config.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Calculate next execution time
    const nextExecution = this.calculateNextExecution(config.schedule);
    const timeUntilExecution = nextExecution.getTime() - Date.now();

    const timeout = setTimeout(async () => {
      try {
        await this.generateReport(config.id);
        // Reschedule for next execution
        this.scheduleReport(config);
      } catch (error) {
        console.error(`Failed to generate scheduled report ${config.id}:`, error);
        // Reschedule anyway to avoid stopping the service
        this.scheduleReport(config);
      }
    }, timeUntilExecution);

    this.scheduledJobs.set(config.id, timeout);
    
    console.log(`Report ${config.name} scheduled for ${nextExecution.toISOString()}`);
  }

  private startAlertMonitoring(): void {
    // Monitor metrics every minute
    setInterval(() => {
      this.checkAlertConditions();
    }, 60000);
  }

  private async checkAlertConditions(): Promise<void> {
    // Check various metrics against alert rules
    const currentTime = new Date();
    
    // Example: Check crash rate
    const crashRate = await this.getCurrentCrashRate();
    if (crashRate > 0) {
      await this.sendAlert('crash_rate', crashRate, 0.01, 'greater_than');
    }

    // Example: Check conversion rate
    const conversionRate = await this.getCurrentConversionRate();
    const previousConversionRate = await this.getPreviousConversionRate();
    const conversionChange = (conversionRate - previousConversionRate) / previousConversionRate;
    
    if (Math.abs(conversionChange) > 0.1) {
      await this.sendAlert('conversion_rate', conversionChange, -0.20, 'percent_change');
    }
  }

  private parseDateRange(dateRange: ReportConfiguration['dateRange']): DateRange {
    if (dateRange.type === 'fixed') {
      // For fixed dates, parse the ISO date string
      return {
        start: dateRange.value,
        end: new Date().toISOString()
      };
    }

    // For relative dates
    const now = new Date();
    const value = dateRange.value;
    let start: Date;

    if (value.endsWith('d')) {
      const days = parseInt(value);
      start = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    } else if (value.endsWith('h')) {
      const hours = parseInt(value);
      start = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    } else if (value.endsWith('m')) {
      const months = parseInt(value);
      start = new Date(now);
      start.setMonth(start.getMonth() - months);
    } else {
      // Default to 7 days
      start = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    }

    return {
      start: start.toISOString(),
      end: now.toISOString()
    };
  }

  private async collectReportData(
    type: string,
    dateRange: DateRange,
    filters: Record<string, any>
  ): Promise<any> {
    switch (type) {
      case 'executive':
        return await this.biDashboard.getExecutiveDashboard(dateRange);
      case 'product':
        return await this.biDashboard.getProductDashboard(dateRange);
      case 'marketing':
        return await this.biDashboard.getMarketingDashboard(dateRange);
      case 'operations':
        return await this.opsMonitor.getPerformanceDashboard(dateRange);
      case 'ai_performance':
        return await this.aiMonitor.generatePerformanceReport(dateRange);
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  private async deliverReport(
    report: GeneratedReport,
    config: ReportConfiguration,
    data: any
  ): Promise<void> {
    for (const recipient of config.recipients) {
      const deliveryStatus = {
        channel: recipient.email,
        status: 'pending' as const,
        timestamp: new Date().toISOString()
      };

      try {
        // Generate report in requested format
        const formattedReport = await this.formatReport(data, recipient.preferences, config.type);
        
        // Send report
        await this.sendReportEmail(recipient.email, config.name, formattedReport, recipient.preferences.format);
        
        deliveryStatus.status = 'sent';
      } catch (error) {
        deliveryStatus.status = 'failed';
        deliveryStatus.error = error instanceof Error ? error.message : 'Unknown error';
      }

      report.deliveryStatus.push(deliveryStatus);
    }
  }

  private async deliverAlert(alert: TriggeredAlert, rule: AlertRule): Promise<void> {
    for (const channel of rule.channels) {
      if (!channel.enabled) continue;

      try {
        switch (channel.type) {
          case 'email':
            await this.sendAlertEmail(alert, channel.configuration);
            break;
          case 'slack':
            await this.sendSlackAlert(alert, channel.configuration);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, channel.configuration);
            break;
          case 'push':
            await this.sendPushAlert(alert, channel.configuration);
            break;
        }
      } catch (error) {
        console.error(`Failed to send alert via ${channel.type}:`, error);
      }
    }
  }

  private calculateNextExecution(schedule: ReportConfiguration['schedule']): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    let nextExecution = new Date(now);
    nextExecution.setHours(hours, minutes, 0, 0);

    switch (schedule.frequency) {
      case 'daily':
        if (nextExecution <= now) {
          nextExecution.setDate(nextExecution.getDate() + 1);
        }
        break;
      case 'weekly':
        const targetDay = schedule.dayOfWeek || 1;
        const daysUntilTarget = (targetDay - nextExecution.getDay() + 7) % 7;
        nextExecution.setDate(nextExecution.getDate() + daysUntilTarget);
        if (nextExecution <= now) {
          nextExecution.setDate(nextExecution.getDate() + 7);
        }
        break;
      case 'monthly':
        const targetDate = schedule.dayOfMonth || 1;
        nextExecution.setDate(targetDate);
        if (nextExecution <= now) {
          nextExecution.setMonth(nextExecution.getMonth() + 1);
        }
        break;
    }

    return nextExecution;
  }

  private evaluateCondition(rule: AlertRule, currentValue: number, threshold: number): boolean {
    switch (rule.condition) {
      case 'greater_than':
        return currentValue > rule.threshold;
      case 'less_than':
        return currentValue < rule.threshold;
      case 'equals':
        return currentValue === rule.threshold;
      case 'percent_change':
        return Math.abs(currentValue) > Math.abs(rule.threshold);
      default:
        return false;
    }
  }

  private isAlertSuppressed(rule: AlertRule): boolean {
    if (!rule.lastTriggered) return false;
    
    const lastTriggered = new Date(rule.lastTriggered);
    const suppressUntil = new Date(lastTriggered.getTime() + (rule.suppressionPeriod * 60 * 1000));
    
    return new Date() < suppressUntil;
  }

  private generateAlertMessage(rule: AlertRule, currentValue: number, context: Record<string, any>): string {
    return `Alert: ${rule.name} - ${rule.metric} is ${currentValue} (threshold: ${rule.threshold})`;
  }

  // Mock implementations for complex operations
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async formatReport(data: any, preferences: any, reportType: string): Promise<any> {
    return data; // Mock implementation
  }

  private async sendReportEmail(email: string, reportName: string, report: any, format: string): Promise<void> {
    console.log(`Sending ${format} report "${reportName}" to ${email}`);
  }

  private async sendAlertEmail(alert: TriggeredAlert, config: any): Promise<void> {
    console.log(`Sending email alert: ${alert.message}`);
  }

  private async sendSlackAlert(alert: TriggeredAlert, config: any): Promise<void> {
    console.log(`Sending Slack alert: ${alert.message}`);
  }

  private async sendWebhookAlert(alert: TriggeredAlert, config: any): Promise<void> {
    console.log(`Sending webhook alert: ${alert.message}`);
  }

  private async sendPushAlert(alert: TriggeredAlert, config: any): Promise<void> {
    console.log(`Sending push alert: ${alert.message}`);
  }

  private async getCurrentCrashRate(): Promise<number> {
    return 0.005; // Mock implementation
  }

  private async getCurrentConversionRate(): Promise<number> {
    return 0.078; // Mock implementation
  }

  private async getPreviousConversionRate(): Promise<number> {
    return 0.075; // Mock implementation
  }
}

export default ReportingAlertingService;