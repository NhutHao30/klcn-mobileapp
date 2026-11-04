let AsyncStorageModule: any = null;
try {
  AsyncStorageModule = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorageModule = null;
}

const memoryStore: Record<string, string> = {};

export const storageService = {
  async getItem(key: string): Promise<string | null> {
    if (AsyncStorageModule) {
      try {
        return await AsyncStorageModule.getItem(key);
      } catch (e) {}
    }
    return memoryStore[key] || null;
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryStore[key] = value;
    if (AsyncStorageModule) {
      try {
        await AsyncStorageModule.setItem(key, value);
      } catch (e) {}
    }
  },

  async removeItem(key: string): Promise<void> {
    delete memoryStore[key];
    if (AsyncStorageModule) {
      try {
        await AsyncStorageModule.removeItem(key);
      } catch (e) {}
    }
  }
};
