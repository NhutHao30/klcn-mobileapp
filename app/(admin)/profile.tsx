import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Hồ sơ cá nhân</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <Image 
            source={{ uri: 'https://ui-avatars.com/api/?name=Admin+Dola&background=f59e0b&color=fff' }} 
            style={styles.avatar} 
          />
          <TouchableOpacity style={[styles.editAvatarBtn, { backgroundColor: colors.tint }]}>
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Họ và tên</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
              <Ionicons name="person-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                defaultValue="Dola Bakery Admin"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
              <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: colors.icon }]}
                defaultValue="admin@dolabakery.com"
                editable={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Số điện thoại</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
              <Ionicons name="call-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                defaultValue="0987654321"
                keyboardType="phone-pad"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Ngày sinh</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                defaultValue="15/08/1995"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.tint }]}>
          <ThemedText style={styles.saveBtnText}>Lưu thay đổi</ThemedText>
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
  avatarSection: {
    alignItems: 'center',
    marginVertical: 24,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  saveBtn: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
