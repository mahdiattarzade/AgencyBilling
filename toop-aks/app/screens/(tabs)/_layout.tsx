import React from "react";
import { Tabs } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
    return (
        <Tabs

            screenOptions={{
                tabBarActiveTintColor: '#FF6B6B',
                tabBarInactiveTintColor: '#999',
                headerShown: false, // Hide default header
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#e9ecef',
                    height: 80,
                    paddingBottom: 10,
                    paddingTop: 5,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
            }}
        >
            <Tabs.Screen
                name='index'
                options={{
                    title: 'خانه',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name='home' color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="archived"
                options={{
                    title: 'بایگانی',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name='archive' color={color} size={size} />
                    ),
                }}
            />
        </Tabs>
    );
}