import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';

// Device information interface
interface DeviceInfo {
  id: string;
  name: string;
  platform: 'ios' | 'android';
  version: string;
  model: string;
  lastActive: string;
  isCurrentDevice: boolean;
}

// Sync data interface
interface SyncData {
  userId: string;
  deviceId: string;
  timestamp: string;
  dataType: 'preferences' | 'behavior' | 'profile' | 'analytics' | 'all';
  data: any;
  checksum: string;
  version: number;
}

// Sync conflict resolution
interface SyncConflict {
  id: string;
  dataType: string;
  localData: any;
  remoteData: any;
  localTimestamp: string;
  remoteTimestamp: string;
  resolution?: 'local' | 'remote' | 'merge' | 'manual';
}

// Sync status
interface SyncStatus {
  lastSync: Date | null;
  isOnline: boolean;
  pendingChanges: number;
  conflicts: SyncConflict[];
  syncInProgress: boolean;
  devicesCount: number;
  dataConsistency: number; // 0-1, 1 being fully consistent
}

// Cloud storage interface (abstract)
interface CloudStorageProvider {
  upload(key: string, data: any, metadata?: any): Promise<void>;
  download(key: string): Promise<any>;
  list(prefix?: string): Promise<string[]>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// Mock cloud storage implementation
class MockCloudStorage implements CloudStorageProvider {
  private storage = new Map<string, any>();

  async upload(key: string, data: any, metadata?: any): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    this.storage.set(key, { data, metadata, timestamp: new Date().toISOString() });
  }

  async download(key: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const item = this.storage.get(key);
    return item?.data || null;
  }

  async list(prefix?: string): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return Array.from(this.storage.keys()).filter(key => 
      !prefix || key.startsWith(prefix)
    );
  }

  async delete(key: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    this.storage.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.storage.has(key);
  }
}

class CrossPlatformSyncManager {
  private static instance: CrossPlatformSyncManager;
  private cloudStorage: CloudStorageProvider;
  private deviceId: string = '';
  private userId: string = '';
  private syncKey: string = '';
  private listeners: Array<(status: SyncStatus) => void> = [];
  private conflictResolvers = new Map<string, (conflict: SyncConflict) => Promise<'local' | 'remote' | 'merge'>>();
  
  private currentStatus: SyncStatus = {
    lastSync: null,
    isOnline: false,
    pendingChanges: 0,
    conflicts: [],
    syncInProgress: false,
    devicesCount: 1,
    dataConsistency: 1
  };

  static getInstance(): CrossPlatformSyncManager {
    if (!CrossPlatformSyncManager.instance) {
      CrossPlatformSyncManager.instance = new CrossPlatformSyncManager();
    }
    return CrossPlatformSyncManager.instance;
  }

  constructor() {
    this.cloudStorage = new MockCloudStorage(); // In production, use actual cloud storage
    this.initializeSync();
  }

  // Initialize sync system
  private async initializeSync() {
    try {
      // Get device information
      this.deviceId = await DeviceInfo.getUniqueId();
      
      // Load user ID from storage
      const storedUserId = await AsyncStorage.getItem('@sync_user_id');
      if (storedUserId) {
        this.userId = storedUserId;
        this.syncKey = this.generateSyncKey(this.userId);
      }

      // Load sync status
      await this.loadSyncStatus();
      
      // Register device if not already registered
      await this.registerDevice();
      
    } catch (error) {
      console.error('Error initializing sync:', error);
    }
  }

  // Generate encryption key for sync data
  private generateSyncKey(userId: string): string {
    return CryptoJS.SHA256(userId + this.deviceId).toString();
  }

  // Encrypt sync data
  private encryptData(data: any): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.syncKey).toString();
  }

  // Decrypt sync data
  private decryptData(encryptedData: string): any {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.syncKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }

  // Generate checksum for data integrity
  private generateChecksum(data: any): string {
    return CryptoJS.MD5(JSON.stringify(data)).toString();
  }

  // Set user for sync
  async setUser(userId: string): Promise<void> {
    try {
      this.userId = userId;
      this.syncKey = this.generateSyncKey(userId);
      
      await AsyncStorage.setItem('@sync_user_id', userId);
      await this.registerDevice();
      
      // Perform initial sync
      await this.performFullSync();
      
    } catch (error) {
      console.error('Error setting user:', error);
      throw error;
    }
  }

  // Register current device
  private async registerDevice(): Promise<void> {
    if (!this.userId) return;

    try {
      const deviceInfo: DeviceInfo = {
        id: this.deviceId,
        name: await DeviceInfo.getDeviceName(),
        platform: Platform.OS as 'ios' | 'android',
        version: Platform.Version.toString(),
        model: await DeviceInfo.getModel(),
        lastActive: new Date().toISOString(),
        isCurrentDevice: true
      };

      const devicesKey = `${this.userId}/devices`;
      const existingDevices: DeviceInfo[] = await this.cloudStorage.download(devicesKey) || [];
      
      // Update or add current device
      const updatedDevices = existingDevices.filter(d => d.id !== this.deviceId);
      updatedDevices.push(deviceInfo);
      
      await this.cloudStorage.upload(devicesKey, updatedDevices);
      
      this.currentStatus.devicesCount = updatedDevices.length;
      this.notifyListeners();
      
    } catch (error) {
      console.error('Error registering device:', error);
    }
  }

  // Get all registered devices
  async getRegisteredDevices(): Promise<DeviceInfo[]> {
    if (!this.userId) return [];

    try {
      const devicesKey = `${this.userId}/devices`;
      const devices: DeviceInfo[] = await this.cloudStorage.download(devicesKey) || [];
      
      return devices.map(device => ({
        ...device,
        isCurrentDevice: device.id === this.deviceId
      }));
      
    } catch (error) {
      console.error('Error getting registered devices:', error);
      return [];
    }
  }

  // Remove device from sync
  async removeDevice(deviceId: string): Promise<void> {
    if (!this.userId || deviceId === this.deviceId) return;

    try {
      const devicesKey = `${this.userId}/devices`;
      const devices: DeviceInfo[] = await this.cloudStorage.download(devicesKey) || [];
      
      const updatedDevices = devices.filter(d => d.id !== deviceId);
      await this.cloudStorage.upload(devicesKey, updatedDevices);
      
      // Also remove device-specific data
      const deviceDataKeys = await this.cloudStorage.list(`${this.userId}/${deviceId}/`);
      for (const key of deviceDataKeys) {
        await this.cloudStorage.delete(key);
      }
      
      this.currentStatus.devicesCount = updatedDevices.length;
      this.notifyListeners();
      
    } catch (error) {
      console.error('Error removing device:', error);
      throw error;
    }
  }

  // Upload data to cloud
  async uploadData(dataType: string, data: any): Promise<void> {
    if (!this.userId) throw new Error('User not set for sync');

    try {
      const syncData: SyncData = {
        userId: this.userId,
        deviceId: this.deviceId,
        timestamp: new Date().toISOString(),
        dataType: dataType as any,
        data,
        checksum: this.generateChecksum(data),
        version: 1
      };

      const encryptedData = this.encryptData(syncData);
      const key = `${this.userId}/${dataType}/${this.deviceId}`;
      
      await this.cloudStorage.upload(key, encryptedData);
      
      // Update sync status
      await this.updateSyncStatus({ lastSync: new Date() });
      
    } catch (error) {
      console.error('Error uploading data:', error);
      throw error;
    }
  }

  // Download data from cloud
  async downloadData(dataType: string, deviceId?: string): Promise<any> {
    if (!this.userId) throw new Error('User not set for sync');

    try {
      const targetDeviceId = deviceId || this.deviceId;
      const key = `${this.userId}/${dataType}/${targetDeviceId}`;
      
      const encryptedData = await this.cloudStorage.download(key);
      if (!encryptedData) return null;
      
      const syncData: SyncData = this.decryptData(encryptedData);
      
      // Verify checksum
      if (syncData.checksum !== this.generateChecksum(syncData.data)) {
        throw new Error('Data integrity check failed');
      }
      
      return syncData.data;
      
    } catch (error) {
      console.error('Error downloading data:', error);
      return null;
    }
  }

  // Perform full sync across all data types
  async performFullSync(): Promise<void> {
    if (!this.userId || this.currentStatus.syncInProgress) return;

    try {
      this.currentStatus.syncInProgress = true;
      this.notifyListeners();

      const dataTypes = ['preferences', 'behavior', 'profile', 'analytics'];
      const conflicts: SyncConflict[] = [];
      
      for (const dataType of dataTypes) {
        try {
          // Get local data
          const localData = await this.getLocalData(dataType);
          const localTimestamp = await this.getLocalTimestamp(dataType);
          
          // Get all device versions of this data type
          const devices = await this.getRegisteredDevices();
          const remoteVersions = await Promise.all(
            devices
              .filter(d => !d.isCurrentDevice)
              .map(async d => ({
                deviceId: d.id,
                data: await this.downloadData(dataType, d.id),
                timestamp: d.lastActive
              }))
          );
          
          // Find the most recent version
          const mostRecentRemote = remoteVersions
            .filter(v => v.data)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
          
          if (mostRecentRemote && localData) {
            // Check for conflicts
            const remoteTime = new Date(mostRecentRemote.timestamp);
            const localTime = new Date(localTimestamp || 0);
            
            if (Math.abs(remoteTime.getTime() - localTime.getTime()) > 60000) { // 1 minute threshold
              // Check if data is actually different
              if (JSON.stringify(localData) !== JSON.stringify(mostRecentRemote.data)) {
                conflicts.push({
                  id: `${dataType}_${Date.now()}`,
                  dataType,
                  localData,
                  remoteData: mostRecentRemote.data,
                  localTimestamp: localTime.toISOString(),
                  remoteTimestamp: remoteTime.toISOString()
                });
                continue;
              }
            }
            
            // No conflict, use the most recent version
            if (remoteTime > localTime) {
              await this.setLocalData(dataType, mostRecentRemote.data);
              await this.setLocalTimestamp(dataType, remoteTime.toISOString());
            } else {
              // Upload local version if it's newer
              await this.uploadData(dataType, localData);
            }
          } else if (mostRecentRemote && !localData) {
            // Remote exists, local doesn't - use remote
            await this.setLocalData(dataType, mostRecentRemote.data);
            await this.setLocalTimestamp(dataType, mostRecentRemote.timestamp);
          } else if (localData && !mostRecentRemote) {
            // Local exists, remote doesn't - upload local
            await this.uploadData(dataType, localData);
          }
          
        } catch (error) {
          console.error(`Error syncing ${dataType}:`, error);
        }
      }

      // Update conflicts in status
      this.currentStatus.conflicts = conflicts;
      await this.updateSyncStatus({ 
        lastSync: new Date(),
        conflicts,
        dataConsistency: conflicts.length === 0 ? 1 : 0.5
      });
      
    } catch (error) {
      console.error('Error performing full sync:', error);
      throw error;
    } finally {
      this.currentStatus.syncInProgress = false;
      this.notifyListeners();
    }
  }

  // Resolve sync conflicts
  async resolveConflict(conflictId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void> {
    const conflict = this.currentStatus.conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    try {
      let resolvedData: any;
      
      switch (resolution) {
        case 'local':
          resolvedData = conflict.localData;
          break;
        case 'remote':
          resolvedData = conflict.remoteData;
          break;
        case 'merge':
          // Implement smart merging based on data type
          resolvedData = this.mergeData(conflict.localData, conflict.remoteData, conflict.dataType);
          break;
      }

      // Apply resolved data
      await this.setLocalData(conflict.dataType, resolvedData);
      await this.uploadData(conflict.dataType, resolvedData);
      
      // Remove conflict
      this.currentStatus.conflicts = this.currentStatus.conflicts.filter(c => c.id !== conflictId);
      
      // Update data consistency
      if (this.currentStatus.conflicts.length === 0) {
        this.currentStatus.dataConsistency = 1;
      }
      
      this.notifyListeners();
      
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  // Smart data merging
  private mergeData(localData: any, remoteData: any, dataType: string): any {
    // Implementation depends on data structure
    // This is a simplified merge strategy
    
    if (dataType === 'preferences') {
      // For preferences, prefer the most recently changed individual settings
      const merged = { ...localData };
      
      for (const key in remoteData) {
        if (remoteData[key] !== localData[key]) {
          // In a real implementation, you'd have timestamps for individual preferences
          // For now, we'll prefer remote if different
          merged[key] = remoteData[key];
        }
      }
      
      return merged;
    } else if (dataType === 'behavior') {
      // For behavior data, sum up counters and merge arrays
      return {
        ...localData,
        mostUsedFeatures: {
          ...localData.mostUsedFeatures,
          ...remoteData.mostUsedFeatures
        },
        sessionDuration: [...(localData.sessionDuration || []), ...(remoteData.sessionDuration || [])],
        satisfactionRatings: [...(localData.satisfactionRatings || []), ...(remoteData.satisfactionRatings || [])]
      };
    } else {
      // Default: prefer remote data
      return remoteData;
    }
  }

  // Local data management helpers
  private async getLocalData(dataType: string): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(`@sync_${dataType}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting local ${dataType}:`, error);
      return null;
    }
  }

  private async setLocalData(dataType: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(`@sync_${dataType}`, JSON.stringify(data));
    } catch (error) {
      console.error(`Error setting local ${dataType}:`, error);
    }
  }

  private async getLocalTimestamp(dataType: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`@sync_${dataType}_timestamp`);
    } catch (error) {
      return null;
    }
  }

  private async setLocalTimestamp(dataType: string, timestamp: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`@sync_${dataType}_timestamp`, timestamp);
    } catch (error) {
      console.error(`Error setting local timestamp for ${dataType}:`, error);
    }
  }

  // Sync status management
  private async loadSyncStatus(): Promise<void> {
    try {
      const statusData = await AsyncStorage.getItem('@sync_status');
      if (statusData) {
        const status = JSON.parse(statusData);
        this.currentStatus = {
          ...this.currentStatus,
          ...status,
          lastSync: status.lastSync ? new Date(status.lastSync) : null
        };
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  }

  private async updateSyncStatus(updates: Partial<SyncStatus>): Promise<void> {
    try {
      this.currentStatus = { ...this.currentStatus, ...updates };
      
      await AsyncStorage.setItem('@sync_status', JSON.stringify({
        ...this.currentStatus,
        lastSync: this.currentStatus.lastSync?.toISOString()
      }));
      
      this.notifyListeners();
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  // Listeners management
  addSyncListener(listener: (status: SyncStatus) => void): void {
    this.listeners.push(listener);
    // Immediately call with current status
    listener(this.currentStatus);
  }

  removeSyncListener(listener: (status: SyncStatus) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentStatus));
  }

  // Get current sync status
  getSyncStatus(): SyncStatus {
    return this.currentStatus;
  }

  // Clear all sync data
  async clearSyncData(): Promise<void> {
    try {
      // Clear local sync data
      const keys = await AsyncStorage.getAllKeys();
      const syncKeys = keys.filter(key => key.startsWith('@sync_'));
      await AsyncStorage.multiRemove(syncKeys);
      
      // Clear cloud data if user is set
      if (this.userId) {
        const cloudKeys = await this.cloudStorage.list(`${this.userId}/`);
        for (const key of cloudKeys) {
          await this.cloudStorage.delete(key);
        }
      }
      
      // Reset status
      this.currentStatus = {
        lastSync: null,
        isOnline: false,
        pendingChanges: 0,
        conflicts: [],
        syncInProgress: false,
        devicesCount: 1,
        dataConsistency: 1
      };
      
      this.notifyListeners();
      
    } catch (error) {
      console.error('Error clearing sync data:', error);
      throw error;
    }
  }
}

export default CrossPlatformSyncManager;
export type { DeviceInfo, SyncData, SyncConflict, SyncStatus };