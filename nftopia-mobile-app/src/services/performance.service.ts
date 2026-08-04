import { PerformanceObserver, PerformanceEntry, Performance } from 'react-native-performance';
import { analyticsService } from '@/src/analytics/analytics.service';
import { errorLogger } from '@/src/errors/logger';
import { Platform } from 'react-native';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, any>;
  timestamp: number;
}

export interface APIMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  size?: number;
  timestamp: number;
}

export interface ScreenLoadMetric {
  screenName: string;
  loadTime: number;
  renderTime: number;
  timestamp: number;
}

export interface MemoryMetric {
  used: number;
  total: number;
  percentage: number;
  timestamp: number;
}

class PerformanceService {
  private static instance: PerformanceService;
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private isEnabled = true;
  private performanceObserver: PerformanceObserver | null = null;
  private screenStartTimes: Map<string, number> = new Map();
  private apiStartTimes: Map<string, number> = new Map();
  private coldStartTime: number | null = null;
  private frameDropCount = 0;
  private isTrackingFrames = false;

  private constructor() {
    this.initPerformanceObserver();
  }

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  private initPerformanceObserver(): void {
    try {
      // @ts-ignore - PerformanceObserver may not be available in all environments
      if (typeof PerformanceObserver !== 'undefined') {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            this.handlePerformanceEntry(entry);
          }
        });

        // Start observing navigation and resource timing
        this.performanceObserver.observe({
          entryTypes: ['navigation', 'resource', 'mark', 'measure'],
        });
      }
    } catch (error) {
      console.warn('PerformanceObserver not available:', error);
    }
  }

  private handlePerformanceEntry(entry: PerformanceEntry): void {
    try {
      switch (entry.entryType) {
        case 'navigation':
          this.trackNavigationTiming(entry);
          break;
        case 'resource':
          this.trackResourceTiming(entry);
          break;
        case 'mark':
          this.trackMark(entry);
          break;
        case 'measure':
          this.trackMeasure(entry);
          break;
      }
    } catch (error) {
      errorLogger.log(error as Error, 'PerformanceService');
    }
  }

  private trackNavigationTiming(entry: PerformanceEntry): void {
    const navigationEntry = entry as any;
    const loadTime = navigationEntry.loadEventEnd - navigationEntry.fetchStart;
    
    this.trackMetric('app_load_time', loadTime, 'ms', {
      type: 'navigation',
      domComplete: navigationEntry.domComplete,
    });

    // Track cold start if this is the first navigation
    if (!this.coldStartTime) {
      this.coldStartTime = Date.now();
      this.trackMetric('cold_start_time', performance.now(), 'ms', {
        platform: Platform.OS,
      });
    }
  }

  private trackResourceTiming(entry: PerformanceEntry): void {
    const resourceEntry = entry as any;
    const duration = resourceEntry.duration || 0;
    
    if (duration > 100) {
      this.trackMetric('resource_load_time', duration, 'ms', {
        resource: resourceEntry.name,
        type: resourceEntry.initiatorType,
        size: resourceEntry.transferSize || 0,
      });
    }
  }

  private trackMark(entry: PerformanceEntry): void {
    // Track custom marks
    if (entry.name.startsWith('screen_')) {
      const screenName = entry.name.replace('screen_', '');
      this.screenStartTimes.set(screenName, entry.startTime);
    }
  }

  private trackMeasure(entry: PerformanceEntry): void {
    // Track custom measures
    this.trackMetric(`measure_${entry.name}`, entry.duration, 'ms', {
      start: entry.startTime,
      duration: entry.duration,
    });
  }

  // Start tracking screen load time
  startScreenLoad(screenName: string): void {
    try {
      const markName = `screen_start_${screenName}`;
      performance.mark(markName);
      this.screenStartTimes.set(screenName, performance.now());
      
      analyticsService.track('screen_load_start', {
        screen: screenName,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Performance API may not be available
      console.warn('Performance mark not available:', error);
    }
  }

  // End tracking screen load time
  endScreenLoad(screenName: string): void {
    try {
      const startTime = this.screenStartTimes.get(screenName);
      if (startTime) {
        const loadTime = performance.now() - startTime;
        this.screenStartTimes.delete(screenName);
        
        this.trackMetric(`screen_load_${screenName}`, loadTime, 'ms', {
          screen: screenName,
        });

        analyticsService.track('screen_load_complete', {
          screen: screenName,
          loadTime: Math.round(loadTime),
          timestamp: Date.now(),
        });

        // Alert if screen load time is too slow
        if (loadTime > 3000) {
          this.trackMetric('slow_screen_load', loadTime, 'ms', {
            screen: screenName,
            threshold: 3000,
          });
        }
      }
    } catch (error) {
      console.warn('Performance measure not available:', error);
    }
  }

  // Track API request timing
  startAPICall(endpoint: string, method: string): string {
    const id = `${endpoint}_${Date.now()}`;
    this.apiStartTimes.set(id, Date.now());
    
    return id;
  }

  endAPICall(id: string, status: number, size?: number): void {
    const startTime = this.apiStartTimes.get(id);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.apiStartTimes.delete(id);
      
      // Extract endpoint from id
      const endpoint = id.split('_')[0];
      
      this.trackAPIMetric({
        endpoint,
        method: 'GET', // This would need to be passed through
        duration,
        status,
        size,
        timestamp: Date.now(),
      });

      // Track slow API calls
      if (duration > 1000) {
        this.trackMetric('slow_api_call', duration, 'ms', {
          endpoint,
          status,
          size,
        });
      }
    }
  }

  // Track custom metric
  trackMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    tags?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      tags,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);
    
    // Trim metrics if exceeds max
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Track to analytics
    analyticsService.track('performance_metric', {
      name,
      value,
      unit,
      tags,
      timestamp: metric.timestamp,
    });
  }

  // Track API metric
  trackAPIMetric(metric: APIMetric): void {
    analyticsService.track('api_performance', {
      endpoint: metric.endpoint,
      method: metric.method,
      duration: metric.duration,
      status: metric.status,
      size: metric.size,
      timestamp: metric.timestamp,
    });

    this.trackMetric(
      `api_${metric.endpoint}`,
      metric.duration,
      'ms',
      {
        method: metric.method,
        status: metric.status,
        size: metric.size,
      }
    );
  }

  // Track memory usage
  async trackMemory(): Promise<void> {
    try {
      // @ts-ignore - memory may not be available in all environments
      if (performance.memory) {
        // @ts-ignore
        const memory = performance.memory;
        const used = memory.usedJSHeapSize || 0;
        const total = memory.totalJSHeapSize || 0;
        const percentage = total > 0 ? (used / total) * 100 : 0;

        const metric: MemoryMetric = {
          used,
          total,
          percentage,
          timestamp: Date.now(),
        };

        this.trackMetric('memory_usage', percentage, '%', {
          used: Math.round(used / (1024 * 1024)),
          total: Math.round(total / (1024 * 1024)),
          platform: Platform.OS,
        });

        // Alert if memory usage is high (> 80%)
        if (percentage > 80) {
          this.trackMetric('high_memory_usage', percentage, '%', {
            used: Math.round(used / (1024 * 1024)),
            total: Math.round(total / (1024 * 1024)),
          });
        }
      }
    } catch (error) {
      // Memory API not available
      console.warn('Memory tracking not available:', error);
    }
  }

  // Track frame drops
  startFrameTracking(): void {
    if (this.isTrackingFrames) return;
    
    this.isTrackingFrames = true;
    this.frameDropCount = 0;

    // Track frames using requestAnimationFrame
    let lastFrameTime = performance.now();
    const checkFrame = () => {
      if (!this.isTrackingFrames) return;

      const currentTime = performance.now();
      const delta = currentTime - lastFrameTime;
      
      // 16.67ms is expected for 60fps, drop if > 33ms (30fps)
      if (delta > 33) {
        this.frameDropCount++;
        this.trackMetric('frame_drop', delta, 'ms', {
          count: this.frameDropCount,
          timestamp: Date.now(),
        });

        // Alert if many frame drops
        if (this.frameDropCount > 10) {
          this.trackMetric('high_frame_drop', this.frameDropCount, 'count', {
            lastDelta: Math.round(delta),
          });
        }
      }

      lastFrameTime = currentTime;
      requestAnimationFrame(checkFrame);
    };

    requestAnimationFrame(checkFrame);
  }

  stopFrameTracking(): void {
    this.isTrackingFrames = false;
  }

  // Get all metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = [];
  }

  // Enable/disable tracking
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Get cold start time
  getColdStartTime(): number | null {
    return this.coldStartTime;
  }

  // Get frame drop count
  getFrameDropCount(): number {
    return this.frameDropCount;
  }

  // Generate performance report
  generateReport(): Record<string, any> {
    const metrics = this.metrics;
    
    // Calculate statistics
    const screenLoads = metrics.filter(m => m.name.startsWith('screen_load_'));
    const apiCalls = metrics.filter(m => m.name.startsWith('api_'));
    const slowCalls = metrics.filter(m => m.name === 'slow_api_call' || m.name === 'slow_screen_load');
    const memory = metrics.filter(m => m.name === 'memory_usage');
    const frameDrops = metrics.filter(m => m.name === 'frame_drop');

    const avgScreenLoad = screenLoads.reduce((acc, m) => acc + m.value, 0) / (screenLoads.length || 1);
    const avgAPICall = apiCalls.reduce((acc, m) => acc + m.value, 0) / (apiCalls.length || 1);
    const avgMemory = memory.reduce((acc, m) => acc + m.value, 0) / (memory.length || 1);

    return {
      totalMetrics: metrics.length,
      screenLoads: {
        count: screenLoads.length,
        average: Math.round(avgScreenLoad),
      },
      apiCalls: {
        count: apiCalls.length,
        average: Math.round(avgAPICall),
      },
      slowCalls: slowCalls.length,
      memory: {
        average: Math.round(avgMemory),
        samples: memory.length,
      },
      frameDrops: frameDrops.length,
      coldStartTime: this.coldStartTime,
    };
  }
}

export const performanceService = PerformanceService.getInstance();