const os = require('os');
const fs = require('fs');
const path = require('path');

function getActiveLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    const lowerName = name.toLowerCase();
    // Skip virtual adapters (WSL, Hyper-V, Docker, VMware, VirtualBox, VPN)
    if (
      lowerName.includes('vethernet') ||
      lowerName.includes('wsl') ||
      lowerName.includes('docker') ||
      lowerName.includes('vmware') ||
      lowerName.includes('virtualbox') ||
      lowerName.includes('vbox') ||
      lowerName.includes('loopback') ||
      lowerName.includes('pseudo')
    ) {
      continue;
    }

    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal && addr.address !== '127.0.0.1') {
        // Prioritize Wi-Fi / Wireless / Hotspot interfaces
        const isWifi = lowerName.includes('wi-fi') || lowerName.includes('wlan') || lowerName.includes('wireless');
        const isIphoneHotspot = addr.address.startsWith('172.20.10.');
        const isAndroidHotspot = addr.address.startsWith('192.168.43.') || addr.address.startsWith('192.168.137.');
        candidates.push({
          name,
          ip: addr.address,
          priority: isIphoneHotspot || isAndroidHotspot ? 3 : isWifi ? 2 : 1,
        });
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);
  return candidates.length > 0 ? candidates[0].ip : '192.168.1.2';
}

const detectedIp = getActiveLanIp();
console.log(`🌐 [GivralBakery Mobile] Tự động nhận diện IP mạng hiện tại (Wi-Fi/Hotspot): ${detectedIp}`);
console.log(`🚀 [GivralBakery Mobile] Hãy đảm bảo Backend Laravel đang chạy với lệnh: php artisan serve --host=0.0.0.0 --port=8000`);

const envPath = path.join(__dirname, '..', '.env');
let useAzure = process.argv.includes('--cloud') || process.argv.includes('--azure');
if (!useAzure && fs.existsSync(envPath)) {
  const existing = fs.readFileSync(envPath, 'utf8');
  if (existing.includes('USE_AZURE=true') && !process.argv.includes('--local')) {
    useAzure = true;
  }
}

const envContent = useAzure
  ? `# Kết nối máy chủ Cloud Givral Bakery Live (HTTPS)
REACT_NATIVE_PACKAGER_HOSTNAME=${detectedIp}
EXPO_PUBLIC_API_URL=https://givral-bakery.vercel.app/api
USE_AZURE=true
`
  : `# Tự động đồng bộ theo Wi-Fi / Hotspot hiện tại bởi scripts/sync-ip.js
REACT_NATIVE_PACKAGER_HOSTNAME=${detectedIp}
EXPO_PUBLIC_API_URL=http://${detectedIp}:8000/api
`;

if (useAzure) {
  console.log(`☁️ [Givral Bakery Mobile] Đang kết nối tới Backend Azure Cloud: http://104.46.218.250:8000/api`);
}

fs.writeFileSync(envPath, envContent, 'utf8');

// Đồng bộ luôn MANUAL_WIFI_IP trong config/apiConfig.ts
const apiConfigPath = path.join(__dirname, '..', 'config', 'apiConfig.ts');
if (fs.existsSync(apiConfigPath)) {
  let content = fs.readFileSync(apiConfigPath, 'utf8');
  content = content.replace(/const MANUAL_WIFI_IP = '[^']*';/, `const MANUAL_WIFI_IP = '${detectedIp}';`);
  fs.writeFileSync(apiConfigPath, content, 'utf8');
}

