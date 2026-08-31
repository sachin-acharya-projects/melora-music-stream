import { createContext, useContext, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { BlurTargetView } from 'expo-blur';

const BlurTargetContext = createContext<React.RefObject<View | null>>({ current: null });

export function useBlurTarget() {
  return useContext(BlurTargetContext);
}

export function BlurTargetProvider({ children }: { children: ReactNode }) {
  const ref = useRef<View>(null);
  return (
    <BlurTargetContext.Provider value={ref}>
      <BlurTargetView ref={ref} style={{ flex: 1 }}>
        {children}
      </BlurTargetView>
    </BlurTargetContext.Provider>
  );
}
