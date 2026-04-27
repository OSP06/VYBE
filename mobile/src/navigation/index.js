import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import Onboarding from '../screens/Onboarding';
import Home from '../screens/Home';
import Detail from '../screens/Detail';
import SeeAll from '../screens/SeeAll';
import Saved from '../screens/Saved';
import Profile from '../screens/Profile';
import Login from '../screens/Login';
import Register from '../screens/Register';
import { fonts } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Mood" component={Onboarding} />
      <HomeStack.Screen name="Feed" component={Home} />
      <HomeStack.Screen name="SeeAll" component={SeeAll} />
    </HomeStack.Navigator>
  );
}

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={Login} />
      <AuthStack.Screen name="Register" component={Register} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border2,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 68,
        },
        tabBarActiveTintColor: colors.txt,
        tabBarInactiveTintColor: colors.txt3,
        tabBarLabelStyle: { fontFamily: fonts.display, fontSize: 11, letterSpacing: 1 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 17, color }}>🏠</Text>,
          tabBarLabel: ({ focused, color }) => (
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 8, letterSpacing: 1, color }}>HOME</Text>
              {focused && <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: colors.sage }} />}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Saved"
        component={Saved}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 17, color }}>🤍</Text>,
          tabBarLabel: ({ focused, color }) => (
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 8, letterSpacing: 1, color }}>SAVED</Text>
              {focused && <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: colors.sage }} />}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 17, color }}>👤</Text>,
          tabBarLabel: ({ focused, color }) => (
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 8, letterSpacing: 1, color }}>PROFILE</Text>
              {focused && <View style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: colors.sage }} />}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { colors } = useTheme();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen
              name="Detail"
              component={Detail}
              options={{ presentation: 'modal' }}
            />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthStackNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
