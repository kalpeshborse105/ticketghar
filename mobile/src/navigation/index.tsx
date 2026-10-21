/**
 * Navigation — MahaTicket Android
 * Native bottom tabs (Material) + stack — instant tab switches, no custom web-like bar
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import MyTicketsScreen from '../screens/MyTicketsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import SeatSelectionScreen from '../screens/SeatSelectionScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import BookingConfirmedScreen from '../screens/BookingConfirmedScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PolicyViewerScreen from '../screens/PolicyViewerScreen';
import TicketScannerScreen from '../screens/TicketScannerScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import PostEventScreen from '../screens/PostEventScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { focused: string; unfocused: string }> = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Explore: { focused: 'compass', unfocused: 'compass-outline' },
  Tickets: { focused: 'ticket-confirmation', unfocused: 'ticket-confirmation-outline' },
  Profile: { focused: 'account', unfocused: 'account-outline' },
};

function MainTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: false,
        freezeOnBlur: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textDim,
        tabBarPressColor: 'transparent',
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name] || TAB_ICONS.Home;
          return (
            <Icon
              name={focused ? icons.focused : icons.unfocused}
              size={size ?? 24}
              color={color}
            />
          );
        },
        tabBarStyle: {
          ...styles.tabBar,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: styles.tabItem,
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Explore' }} />
      <Tab.Screen name="Tickets" component={MyTicketsScreen} options={{ title: 'My Tickets' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 150,
        freezeOnBlur: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'fade' }} />

      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ animation: 'slide_from_right', animationDuration: 150 }}
      />
      <Stack.Screen
        name="SeatSelection"
        component={SeatSelectionScreen}
        options={{ animation: 'slide_from_right', animationDuration: 150 }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{
          animation: 'slide_from_right',
          animationDuration: 150,
          // Hold + pricing lock: do not swipe-back into seat map mid-checkout
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="BookingConfirmed"
        component={BookingConfirmedScreen}
        options={{ animation: 'fade', animationDuration: 150, gestureEnabled: false }}
      />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen
        name="PolicyViewer"
        component={PolicyViewerScreen}
        options={{ animation: 'slide_from_right', animationDuration: 150 }}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ animation: 'slide_from_right', animationDuration: 150 }}
      />
      <Stack.Screen
        name="PostEvent"
        component={PostEventScreen}
        options={{ animation: 'slide_from_right', animationDuration: 150 }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ animation: 'slide_from_right', animationDuration: 150 }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ animation: 'slide_from_right', animationDuration: 150 }}
      />
      <Stack.Screen
        name="Tickets"
        component={MyTicketsScreen}
        options={{ animation: 'slide_from_right', animationDuration: 150 }}
      />
      <Stack.Screen
        name="TicketScanner"
        component={TicketScannerScreen}
        options={{ animation: 'slide_from_bottom', animationDuration: 150 }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    paddingTop: 4,
  },
  tabItem: {
    paddingTop: 2,
    paddingBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
