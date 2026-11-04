import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { useLanguage } from '@/context/LanguageContext';

const LANGUAGES = [
  { id: 'vi', name: 'Tiếng Việt', code: 'VN', flag: '🇻🇳' },
  { id: 'en', name: 'English', code: 'US', flag: '🇺🇸' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { language, setLanguage, t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<'vi' | 'en'>(language);

  const handleApply = () => {
    setLanguage(selectedLang as any);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)');
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Ngôn ngữ (Language)</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <ThemedText style={styles.sectionTitle}>Chọn ngôn ngữ giao diện</ThemedText>
        
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {LANGUAGES.map((lang, index) => (
            <React.Fragment key={lang.id}>
              <TouchableOpacity 
                style={styles.langRow}
                onPress={() => setSelectedLang(lang.id as 'vi' | 'en')}
              >
                <View style={styles.langInfo}>
                  <ThemedText style={styles.langFlag}>{lang.flag}</ThemedText>
                  <ThemedText style={styles.langName}>{lang.name}</ThemedText>
                </View>
                
                <View style={[
                  styles.radioOuter, 
                  { borderColor: selectedLang === lang.id ? colors.tint : colors.icon }
                ]}>
                  {selectedLang === lang.id && (
                    <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />
                  )}
                </View>
              </TouchableOpacity>
              
              {index < LANGUAGES.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              )}
            </React.Fragment>
          ))}
        </View>
        
        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: colors.tint }]}
          onPress={handleApply}
        >
          <ThemedText style={styles.saveBtnText}>{t('apply')}</ThemedText>
        </TouchableOpacity>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
    opacity: 0.6,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  langInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  langName: {
    fontSize: 16,
    fontWeight: '500',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  saveBtn: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
