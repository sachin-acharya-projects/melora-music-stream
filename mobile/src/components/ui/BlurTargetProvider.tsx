import { createContext, useContext, useRef, type ReactNode } from 'react';
import { View, type View as ViewType } from 'react-native';

let BlurTargetView: typeof View;
try {
  BlurTargetView = require('expo-blur').BlurTargetView;
} catch {
  BlurTargetView = View;
}

const BlurTargetContext = createContext<React.RefObject<ViewType | null>>({ current: null });

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
