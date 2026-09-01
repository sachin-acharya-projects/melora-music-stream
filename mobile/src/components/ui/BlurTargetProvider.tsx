import { createContext, useContext, useRef, type ReactNode } from 'react';
import { View, type View as ViewType } from 'react-native';

const BlurTargetContext = createContext<React.RefObject<ViewType | null>>({ current: null });

export function useBlurTarget() {
  return useContext(BlurTargetContext);
}

export function BlurTargetProvider({ children }: { children: ReactNode }) {
  const ref = useRef<View>(null);
  return (
    <BlurTargetContext.Provider value={ref}>
      <View ref={ref} style={{ flex: 1 }}>
        {children}
      </View>
    </BlurTargetContext.Provider>
  );
}