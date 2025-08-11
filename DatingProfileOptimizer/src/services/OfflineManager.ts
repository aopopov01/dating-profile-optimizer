import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Platform } from 'react-native';

// Offline storage keys
const OFFLINE_KEYS = {
  USER_DATA: '@offline_user_data',
  PHOTO_ANALYSES: '@offline_photo_analyses',
  GENERATED_BIOS: '@offline_generated_bios',
  CACHED_IMAGES: '@offline_cached_images',
  PENDING_UPLOADS: '@offline_pending_uploads',
  SYNC_QUEUE: '@offline_sync_queue',
  LAST_SYNC: '@offline_last_sync',
  OFFLINE_PREFERENCES: '@offline_preferences'
};

// Data types for offline storage
export interface OfflineUserData {
  id: string;
  email: string;
  profile: {
    name: string;
    age: number;
    bio: string;
    location: string;
    interests: string[];
    photos: string[];
  };
  preferences: {
    notifications: boolean;
    theme: string;
    language: string;
  };
  lastUpdated: string;
}

export interface OfflinePhotoAnalysis {
  id: string;
  userId: string;
  photoUri: string;
  analysis: {
    score: number;
    feedback: string[];
    recommendations: string[];
    strengths: string[];
    improvements: string[];
  };
  createdAt: string;
  synced: boolean;
}

export interface OfflineGeneratedBio {
  id: string;
  userId: string;
  content: string;
  style: string;
  parameters: Record<string, any>;
  createdAt: string;
  synced: boolean;
}

export interface PendingUpload {
  id: string;
  type: 'photo' | 'profile' | 'bio';
  data: any;
  retryCount: number;
  lastAttempt: string;
  createdAt: string;
}

export interface SyncOperation {
  id: string;
  operation: 'create' | 'update' | 'delete';
  dataType: 'user' | 'photo_analysis' | 'generated_bio';
  data: any;
  timestamp: string;
  retryCount: number;
  lastAttempt?: string;
  error?: string;
}

export interface CachedImage {
  uri: string;
  localPath: string;
  mimeType: string;
  size: number;
  lastAccessed: string;
  expiresAt: string;
}

// Network status interface
interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  isWifiEnabled: boolean;
}

class OfflineManager {
  private static instance: OfflineManager;
  private networkStatus: NetworkStatus = {
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
    isWifiEnabled: false
  };
  private syncInProgress = false;
  private listeners: Array<(status: NetworkStatus) => void> = [];
  private syncListeners: Array<(progress: SyncProgress) => void> = [];

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  constructor() {
    this.initializeNetworkMonitoring();
  }

  // Initialize network monitoring
  private initializeNetworkMonitoring() {
    NetInfo.addEventListener(this.handleNetworkChange);
    
    // Get initial network state
    NetInfo.fetch().then(this.handleNetworkChange);
  }

  // Handle network state changes
  private handleNetworkChange = (state: NetInfoState) => {
    const newStatus: NetworkStatus = {
      isConnected: state.isConnected || false,
      isInternetReachable: state.isInternetReachable || false,
      type: state.type || 'unknown',
      isWifiEnabled: state.type === 'wifi' && state.isConnected || false
    };

    const wasOffline = !this.networkStatus.isConnected;
    const isNowOnline = newStatus.isConnected;

    this.networkStatus = newStatus;

    // Notify listeners
    this.listeners.forEach(listener => listener(newStatus));

    // Auto-sync when coming back online
    if (wasOffline && isNowOnline) {
      this.autoSync();
    }
  };

  // Add network status listener
  addNetworkListener(listener: (status: NetworkStatus) => void) {
    this.listeners.push(listener);
    // Immediately call with current status
    listener(this.networkStatus);
  }

  // Remove network status listener
  removeNetworkListener(listener: (status: NetworkStatus) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Add sync progress listener
  addSyncListener(listener: (progress: SyncProgress) => void) {
    this.syncListeners.push(listener);
  }

  // Remove sync progress listener
  removeSyncListener(listener: (progress: SyncProgress) => void) {
    this.syncListeners = this.syncListeners.filter(l => l !== listener);
  }

  // Get current network status
  getNetworkStatus(): NetworkStatus {
    return this.networkStatus;
  }

  // Check if device is online
  isOnline(): boolean {
    return this.networkStatus.isConnected && this.networkStatus.isInternetReachable;
  }

  // Store user data offline
  async storeUserData(userData: OfflineUserData): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_KEYS.USER_DATA, JSON.stringify({
        ...userData,
        lastUpdated: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error storing user data offline:', error);
      throw error;
    }
  }

  // Get user data from offline storage
  async getUserData(): Promise<OfflineUserData | null> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user data from offline storage:', error);
      return null;
    }
  }

  // Store photo analysis offline
  async storePhotoAnalysis(analysis: OfflinePhotoAnalysis): Promise<void> {
    try {
      const existing = await this.getPhotoAnalyses();
      const updated = existing.filter(a => a.id !== analysis.id);
      updated.push(analysis);
      
      await AsyncStorage.setItem(OFFLINE_KEYS.PHOTO_ANALYSES, JSON.stringify(updated));
    } catch (error) {
      console.error('Error storing photo analysis offline:', error);
      throw error;
    }
  }

  // Get photo analyses from offline storage
  async getPhotoAnalyses(): Promise<OfflinePhotoAnalysis[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_KEYS.PHOTO_ANALYSES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting photo analyses from offline storage:', error);
      return [];
    }
  }

  // Store generated bio offline
  async storeGeneratedBio(bio: OfflineGeneratedBio): Promise<void> {
    try {
      const existing = await this.getGeneratedBios();
      const updated = existing.filter(b => b.id !== bio.id);
      updated.push(bio);
      
      await AsyncStorage.setItem(OFFLINE_KEYS.GENERATED_BIOS, JSON.stringify(updated));
    } catch (error) {
      console.error('Error storing generated bio offline:', error);
      throw error;
    }
  }

  // Get generated bios from offline storage
  async getGeneratedBios(): Promise<OfflineGeneratedBio[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_KEYS.GENERATED_BIOS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting generated bios from offline storage:', error);
      return [];
    }
  }

  // Add pending upload
  async addPendingUpload(upload: PendingUpload): Promise<void> {
    try {
      const existing = await this.getPendingUploads();
      const updated = existing.filter(u => u.id !== upload.id);
      updated.push(upload);
      
      await AsyncStorage.setItem(OFFLINE_KEYS.PENDING_UPLOADS, JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding pending upload:', error);
      throw error;
    }
  }

  // Get pending uploads
  async getPendingUploads(): Promise<PendingUpload[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_KEYS.PENDING_UPLOADS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending uploads:', error);
      return [];
    }
  }

  // Remove pending upload
  async removePendingUpload(uploadId: string): Promise<void> {
    try {
      const existing = await this.getPendingUploads();
      const updated = existing.filter(u => u.id !== uploadId);
      
      await AsyncStorage.setItem(OFFLINE_KEYS.PENDING_UPLOADS, JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing pending upload:', error);
      throw error;
    }
  }

  // Add sync operation to queue
  async addToSyncQueue(operation: SyncOperation): Promise<void> {
    try {
      const existing = await this.getSyncQueue();
      const updated = existing.filter(op => op.id !== operation.id);
      updated.push(operation);
      
      await AsyncStorage.setItem(OFFLINE_KEYS.SYNC_QUEUE, JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  // Get sync queue
  async getSyncQueue(): Promise<SyncOperation[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  // Remove from sync queue
  async removeFromSyncQueue(operationId: string): Promise<void> {
    try {
      const existing = await this.getSyncQueue();
      const updated = existing.filter(op => op.id !== operationId);
      
      await AsyncStorage.setItem(OFFLINE_KEYS.SYNC_QUEUE, JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing from sync queue:', error);
      throw error;
    }
  }

  // Cache image locally
  async cacheImage(uri: string): Promise<string> {
    try {
      // Implementation would depend on your image caching strategy
      // This is a simplified version
      const cachedImages = await this.getCachedImages();
      const existing = cachedImages.find(img => img.uri === uri);
      
      if (existing && new Date(existing.expiresAt) > new Date()) {
        // Update last accessed
        existing.lastAccessed = new Date().toISOString();
        await this.updateCachedImage(existing);
        return existing.localPath;
      }

      // In a real implementation, you would:
      // 1. Download the image
      // 2. Save it to local file system
      // 3. Store the mapping in cached images
      
      const localPath = `${Platform.OS === 'ios' ? 'Documents' : 'DCIM'}/cached_${Date.now()}.jpg`;
      const cachedImage: CachedImage = {
        uri,
        localPath,
        mimeType: 'image/jpeg',
        size: 0, // Would be actual file size
        lastAccessed: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      await this.storeCachedImage(cachedImage);
      return localPath;
      
    } catch (error) {
      console.error('Error caching image:', error);
      return uri; // Fallback to original URI
    }
  }

  // Get cached images
  async getCachedImages(): Promise<CachedImage[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_KEYS.CACHED_IMAGES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting cached images:', error);
      return [];
    }
  }

  // Store cached image
  async storeCachedImage(cachedImage: CachedImage): Promise<void> {
    try {
      const existing = await this.getCachedImages();
      const updated = existing.filter(img => img.uri !== cachedImage.uri);
      updated.push(cachedImage);
      
      await AsyncStorage.setItem(OFFLINE_KEYS.CACHED_IMAGES, JSON.stringify(updated));
    } catch (error) {
      console.error('Error storing cached image:', error);
      throw error;
    }
  }

  // Update cached image
  async updateCachedImage(cachedImage: CachedImage): Promise<void> {
    await this.storeCachedImage(cachedImage);
  }

  // Clear expired cached images
  async clearExpiredCache(): Promise<void> {
    try {
      const cached = await this.getCachedImages();
      const now = new Date();
      const valid = cached.filter(img => new Date(img.expiresAt) > now);
      
      await AsyncStorage.setItem(OFFLINE_KEYS.CACHED_IMAGES, JSON.stringify(valid));
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  // Get last sync time
  async getLastSyncTime(): Promise<Date | null> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_KEYS.LAST_SYNC);
      return data ? new Date(data) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  // Set last sync time
  async setLastSyncTime(time: Date = new Date()): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_KEYS.LAST_SYNC, time.toISOString());
    } catch (error) {
      console.error('Error setting last sync time:', error);
    }
  }

  // Auto sync when coming online
  private async autoSync(): Promise<void> {
    if (this.syncInProgress) return;
    
    try {
      await this.performSync();
    } catch (error) {
      console.error('Auto sync failed:', error);
    }
  }

  // Manual sync
  async sync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    if (!this.isOnline()) {
      return { success: false, error: 'Device is offline' };
    }

    return await this.performSync();
  }

  // Perform sync operation
  private async performSync(): Promise<SyncResult> {
    this.syncInProgress = true;
    
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: []
    };

    try {
      // Notify sync start
      this.notifySyncProgress({
        phase: 'starting',
        totalItems: 0,
        completedItems: 0,
        currentItem: null
      });

      // Get pending operations
      const syncQueue = await this.getSyncQueue();
      const pendingUploads = await this.getPendingUploads();
      
      const totalItems = syncQueue.length + pendingUploads.length;
      
      this.notifySyncProgress({
        phase: 'syncing',
        totalItems,
        completedItems: 0,
        currentItem: 'Preparing sync...'
      });

      let completedItems = 0;

      // Process sync queue
      for (const operation of syncQueue) {
        try {
          this.notifySyncProgress({
            phase: 'syncing',
            totalItems,
            completedItems,
            currentItem: `Syncing ${operation.dataType}...`
          });

          await this.processSyncOperation(operation);
          await this.removeFromSyncQueue(operation.id);
          result.syncedItems++;
          completedItems++;
          
        } catch (error) {
          console.error('Sync operation failed:', error);
          result.failedItems++;
          result.errors.push(`Failed to sync ${operation.dataType}: ${error}`);
          
          // Update retry count
          operation.retryCount++;
          operation.lastAttempt = new Date().toISOString();
          operation.error = String(error);
          
          if (operation.retryCount < 3) {
            await this.addToSyncQueue(operation);
          } else {
            await this.removeFromSyncQueue(operation.id);
          }
        }
      }

      // Process pending uploads
      for (const upload of pendingUploads) {
        try {
          this.notifySyncProgress({
            phase: 'syncing',
            totalItems,
            completedItems,
            currentItem: `Uploading ${upload.type}...`
          });

          await this.processPendingUpload(upload);
          await this.removePendingUpload(upload.id);
          result.syncedItems++;
          completedItems++;
          
        } catch (error) {
          console.error('Upload failed:', error);
          result.failedItems++;
          result.errors.push(`Failed to upload ${upload.type}: ${error}`);
          
          // Update retry count
          upload.retryCount++;
          upload.lastAttempt = new Date().toISOString();
          
          if (upload.retryCount < 3) {
            await this.addPendingUpload(upload);
          } else {
            await this.removePendingUpload(upload.id);
          }
        }
      }

      // Update last sync time
      await this.setLastSyncTime();

      // Notify sync completion
      this.notifySyncProgress({
        phase: 'completed',
        totalItems,
        completedItems: totalItems,
        currentItem: null
      });

      result.success = result.failedItems === 0;
      
    } catch (error) {
      console.error('Sync failed:', error);
      result.success = false;
      result.errors.push(String(error));
      
      this.notifySyncProgress({
        phase: 'error',
        totalItems: 0,
        completedItems: 0,
        currentItem: null,
        error: String(error)
      });
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  // Process individual sync operation
  private async processSyncOperation(operation: SyncOperation): Promise<void> {
    // This would implement the actual API calls to sync data
    // For now, this is a placeholder
    
    switch (operation.dataType) {
      case 'user':
        // Sync user data
        break;
      case 'photo_analysis':
        // Sync photo analysis
        break;
      case 'generated_bio':
        // Sync generated bio
        break;
    }
  }

  // Process pending upload
  private async processPendingUpload(upload: PendingUpload): Promise<void> {
    // This would implement the actual upload logic
    // For now, this is a placeholder
    
    switch (upload.type) {
      case 'photo':
        // Upload photo
        break;
      case 'profile':
        // Upload profile
        break;
      case 'bio':
        // Upload bio
        break;
    }
  }

  // Notify sync progress to listeners
  private notifySyncProgress(progress: SyncProgress): void {
    this.syncListeners.forEach(listener => listener(progress));
  }

  // Get storage usage
  async getStorageUsage(): Promise<StorageUsage> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => key.startsWith('@offline_'));
      
      let totalSize = 0;
      const breakdown: Record<string, number> = {};

      for (const key of offlineKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const size = new Blob([data]).size;
            totalSize += size;
            breakdown[key] = size;
          }
        } catch (error) {
          console.error(`Error getting size for key ${key}:`, error);
        }
      }

      return {
        totalSize,
        breakdown,
        lastCalculated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return {
        totalSize: 0,
        breakdown: {},
        lastCalculated: new Date().toISOString()
      };
    }
  }

  // Clear all offline data
  async clearAllOfflineData(): Promise<void> {
    try {
      const keys = Object.values(OFFLINE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing offline data:', error);
      throw error;
    }
  }
}

// Sync progress interface
export interface SyncProgress {
  phase: 'starting' | 'syncing' | 'completed' | 'error';
  totalItems: number;
  completedItems: number;
  currentItem: string | null;
  error?: string;
}

// Sync result interface
export interface SyncResult {
  success: boolean;
  syncedItems?: number;
  failedItems?: number;
  errors?: string[];
  error?: string;
}

// Storage usage interface
export interface StorageUsage {
  totalSize: number;
  breakdown: Record<string, number>;
  lastCalculated: string;
}

export default OfflineManager;