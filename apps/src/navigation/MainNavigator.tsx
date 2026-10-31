import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { CartScreen } from '../features/cart/screens/CartScreen';
import { CheckoutScreen } from '../features/checkout/screens/CheckoutScreen';
import { PaymentScreen } from '../features/payment/screens/PaymentScreen';
import { MenuScreen } from '../features/menu/screens/MenuScreen';
import { LiveOrderTrackingScreen } from '../features/orders/screens/LiveOrderTrackingScreen';
import { MyOrdersScreen } from '../features/orders/screens/MyOrdersScreen';
import { OrderSuccessScreen } from '../features/orders/screens/OrderSuccessScreen';
import { RefundStatusScreen } from '../features/orders/screens/RefundStatusScreen';
import { AddressesScreen } from '../features/profile/screens/AddressesScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { SettingsScreen } from '../features/profile/screens/SettingsScreen';
import { SupportScreen } from '../features/profile/screens/SupportScreen';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { ReviewsScreen } from '../features/reviews/screens/ReviewsScreen';
import { HomeScreen } from '../features/restaurants/screens/HomeScreen';
import { RestaurantDetailsScreen } from '../features/restaurants/screens/RestaurantDetailsScreen';
import { RestaurantListingScreen } from '../features/restaurants/screens/RestaurantListingScreen';
import { SearchScreen } from '../features/restaurants/screens/SearchScreen';
import { WalletScreen } from '../features/wallet/screens/WalletScreen';
import type {
  BrowseStackParamList,
  MainTabParamList,
  NotificationsStackParamList,
  OrdersStackParamList,
  ProfileStackParamList,
  HelpStackParamList,
} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const BrowseStack = createNativeStackNavigator<BrowseStackParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();
const NotificationsStack =
  createNativeStackNavigator<NotificationsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const HelpStack = createNativeStackNavigator<HelpStackParamList>();

import { DarkStoreScreen } from '../features/darkStore/screens/DarkStoreScreen';
import { DarkStoreSubCategoryScreen } from '../features/darkStore/screens/DarkStoreSubCategoryScreen';
import { DarkStoreItemsScreen } from '../features/darkStore/screens/DarkStoreItemsScreen';
import { DarkStoreSearchScreen } from '../features/darkStore/screens/DarkStoreSearchScreen';

function BrowseStackNavigator() {
  return (
    <BrowseStack.Navigator screenOptions={{ headerShown: false }}>
      <BrowseStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <BrowseStack.Screen
        name="RestaurantListing"
        component={RestaurantListingScreen}
        options={{ title: 'Listing' }}
      />
      <BrowseStack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <BrowseStack.Screen
        name="RestaurantDetails"
        component={RestaurantDetailsScreen}
        options={{ title: 'Restaurant' }}
      />
      <BrowseStack.Screen
        name="Menu"
        component={MenuScreen}
        options={{ title: 'Menu' }}
      />
      <BrowseStack.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: 'Cart' }}
      />
      <BrowseStack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: 'Checkout' }}
      />
      <BrowseStack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: 'Payment' }}
      />
      <BrowseStack.Screen
        name="Addresses"
        component={AddressesScreen}
        options={{ title: 'Addresses' }}
      />
      <BrowseStack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{ title: 'Reviews' }}
      />
      <BrowseStack.Screen
        name="DarkStore"
        component={DarkStoreScreen as any}
        options={{ title: 'Quick Store' }}
      />
      <BrowseStack.Screen
        name="DarkStoreSubCategory"
        component={DarkStoreSubCategoryScreen as any}
        options={{ title: 'Category' }}
      />
      <BrowseStack.Screen
        name="DarkStoreItems"
        component={DarkStoreItemsScreen as any}
        options={{ title: 'Items' }}
      />
      <BrowseStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <BrowseStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <BrowseStack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ title: 'Wallet' }}
      />
    </BrowseStack.Navigator>
  );
}

function OrdersStackNavigator() {
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen
        name="MyOrders"
        component={MyOrdersScreen}
        options={{ title: 'Orders' }}
      />
      <OrdersStack.Screen
        name="OrderSuccess"
        component={OrderSuccessScreen}
        options={{ title: 'Order confirmed' }}
      />
      <OrdersStack.Screen
        name="LiveOrderTracking"
        component={LiveOrderTrackingScreen}
        options={{ title: 'Track order' }}
      />
      <OrdersStack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{ title: 'Reviews' }}
      />
      <OrdersStack.Screen
        name="RefundStatus"
        component={RefundStatusScreen}
        options={{ title: 'Refund Status' }}
      />
    </OrdersStack.Navigator>
  );
}

const DarkStoreStack = createNativeStackNavigator<any>();

function DarkStoreStackNavigator() {
  return (
    <DarkStoreStack.Navigator screenOptions={{ headerShown: false }}>
      <DarkStoreStack.Screen
        name="DarkStore"
        component={DarkStoreScreen as any}
        options={{ title: 'Quick Store' }}
      />
      <DarkStoreStack.Screen
        name="DarkStoreSubCategory"
        component={DarkStoreSubCategoryScreen as any}
        options={{ title: 'Category' }}
      />
      <DarkStoreStack.Screen
        name="DarkStoreItems"
        component={DarkStoreItemsScreen as any}
        options={{ title: 'Items' }}
      />
      <DarkStoreStack.Screen
        name="DarkStoreSearch"
        component={DarkStoreSearchScreen as any}
        options={{ title: 'Search' }}
      />
      <DarkStoreStack.Screen
        name="Cart"
        component={CartScreen as any}
        options={{ title: 'Cart' }}
      />
      <DarkStoreStack.Screen
        name="Checkout"
        component={CheckoutScreen as any}
        options={{ title: 'Checkout' }}
      />
      <DarkStoreStack.Screen
        name="Payment"
        component={PaymentScreen as any}
        options={{ title: 'Payment' }}
      />
      <DarkStoreStack.Screen
        name="Addresses"
        component={AddressesScreen as any}
        options={{ title: 'Addresses' }}
      />
    </DarkStoreStack.Navigator>
  );
}

function HelpStackNavigator() {
  return (
    <HelpStack.Navigator screenOptions={{ headerShown: false }}>
      <HelpStack.Screen
        name="Help"
        component={SupportScreen}
        options={{ title: 'Help & Support' }}
      />
    </HelpStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen
        name="Addresses"
        component={AddressesScreen}
        options={{ title: 'Addresses' }}
      />
      <ProfileStack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ title: 'Wallet' }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </ProfileStack.Navigator>
  );
}

/**
 * Main tabs — System Design §5.1 Customer / P2-CUS-01…07.
 */
export function MainNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FCD34D', // Gold active text
        tabBarInactiveTintColor: '#9CA3AF', // Muted inactive text
        tabBarStyle: {
          borderTopWidth: 1.2,
          borderTopColor: 'rgba(252, 211, 77, 0.25)',
          backgroundColor: '#0B1410', // Deep luxury slate/emerald background for high contrast
          height: Platform.OS === 'ios' ? 88 : 70 + Math.max(insets.bottom, 4),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          marginTop: 2,
          letterSpacing: 0.2,
        },
        tabBarIcon: ({ focused }) => {
          let iconName: keyof typeof Feather.glyphMap = 'home';
          if (route.name === 'BrowseTab') {
            iconName = 'home';
          } else if (route.name === 'DarkStoreTab') {
            iconName = 'zap';
          } else if (route.name === 'OrdersTab') {
            iconName = 'file-text';
          } else if (route.name === 'HelpTab' || (route as any).name === 'ProfileTab') {
            iconName = 'headphones';
          }

          return (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? 'rgba(252, 211, 77, 0.18)' : 'transparent',
                borderRadius: 16,
                width: 44,
                height: 30,
              }}
            >
              <Feather
                name={iconName}
                size={20}
                color={focused ? '#FCD34D' : '#9CA3AF'}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="BrowseTab"
        component={BrowseStackNavigator}
        options={{ title: 'Home' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('BrowseTab', { screen: 'Home' });
          },
        })}
      />
      <Tab.Screen
        name="DarkStoreTab"
        component={DarkStoreStackNavigator as any}
        options={{ title: 'Quick Store' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('DarkStoreTab', { screen: 'DarkStore' });
          },
        })}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStackNavigator}
        options={{ title: 'Orders' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('OrdersTab', { screen: 'MyOrders' });
          },
        })}
      />
      <Tab.Screen
        name="HelpTab"
        component={HelpStackNavigator}
        options={{ title: 'Help' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('HelpTab', { screen: 'Help' });
          },
        })}
      />
    </Tab.Navigator>
  );
}

