/**
 * MahaTicket Android — App Entry Point
 * Event ticketing for Maharashtra theatres & live shows
 */
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import RootNavigator from './src/navigation';
import { COLORS } from './src/theme/colors';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.bg}
          translucent={false}
        />
        <ErrorBoundary>
          <NavigationContainer
            theme={{
              ...DefaultTheme,
              colors: {
                ...DefaultTheme.colors,
                primary: COLORS.primary,
                background: COLORS.bg,
                card: COLORS.surface,
                text: COLORS.text,
                border: COLORS.border,
                notification: COLORS.accent,
              },
            }}
          >
            <RootNavigator />
          </NavigationContainer>
        </ErrorBoundary>
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
