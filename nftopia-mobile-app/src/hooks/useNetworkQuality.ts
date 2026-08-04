import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type NetworkQuality = 'slow' | 'medium' | 'fast' | 'unknown';

export function useNetworkQuality(): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>('unknown');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (!state.isConnected) {
        setQuality('unknown');
        return;
      }

      // Determine quality based on connection type and speed
      const type = state.type;
      const effectiveType = (state.details as any)?.cellularGeneration || 'unknown';

      if (type === 'wifi' || type === 'ethernet') {
        setQuality('fast');
      } else if (type === 'cellular') {
        switch (effectiveType) {
          case '5g':
          case '4g':
            setQuality('fast');
            break;
          case '3g':
            setQuality('medium');
            break;
          case '2g':
          case 'unknown':
          default:
            setQuality('slow');
            break;
        }
      } else {
        setQuality('slow');
      }
    });

    return () => unsubscribe();
  }, []);

  return quality;
}