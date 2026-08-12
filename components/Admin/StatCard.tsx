import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: string;
  isPositive?: boolean;
}

export function StatCard({ title, value, icon, trend, isPositive }: StatCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={[styles.card, { borderColor: colors.icon + '30' }]}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <Ionicons name={icon} size={24} color={colors.tint} />
      </View>
      <ThemedText style={styles.value}>{value}</ThemedText>
      {trend && (
        <View style={styles.trendContainer}>
          <Ionicons 
            name={isPositive ? "arrow-up" : "arrow-down"} 
            size={16} 
            color={isPositive ? "#10b981" : "#ef4444"} 
          />
          <ThemedText style={[
            styles.trendText, 
            { color: isPositive ? "#10b981" : "#ef4444" }
          ]}>
            {trend}
          </ThemedText>
          <ThemedText style={styles.trendSubText}> vs last month</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '48%',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    opacity: 0.8,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  trendSubText: {
    fontSize: 12,
    opacity: 0.6,
  },
});
