import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const TEAM = [
  { name: 'Trương Nhựt Hào', role: 'Dev FrontEnd / Founder', avatar: 'https://ui-avatars.com/api/?name=Truong+Nhut+Hao&background=f59e0b&color=fff' },
  { name: 'Givral Bakery Chef', role: 'Bếp Trưởng Chuyên Nghiệp', avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=300' },
];

export default function AboutPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleBack = () => {
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
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Giới thiệu Givral Bakery</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HERO BANNER */}
        <View style={styles.heroBanner}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800' }}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay}>
            <ThemedText style={styles.heroTitle}>Hơn 10 Năm Trao Gửi Ngọt Ngào</ThemedText>
          </View>
        </View>

        {/* STORY CONTENT */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <ThemedText style={styles.storyTitle}>Về Givral Bakery</ThemedText>
          
          <ThemedText style={styles.paragraph}>
            Givral Bakery là một tiệm bánh nằm ẩn mình giữa phố xá nhộn nhịp của thành phố. Với bề dày hơn 10 năm kinh nghiệm trong lĩnh vực làm bánh, Givral Bakery đã nhanh chóng trở thành điểm đến lý tưởng cho những ai đam mê bánh ngọt và muốn thưởng thức những món đặc sản tại địa phương.
          </ThemedText>

          <ThemedText style={styles.paragraph}>
            Sự phong phú và đa dạng của thực đơn tại Givral Bakery là một điểm nhấn đáng chú ý. Khách hàng có thể chọn từ một loạt các loại bánh tươi ngon như bánh mousse, bánh su kem, bánh tart, bánh tiramisu, bánh phô mai, bánh cookie và nhiều loại bánh khác nữa.
          </ThemedText>

          <ThemedText style={styles.paragraph}>
            Mỗi chiếc bánh tại Givral Bakery đều được chế biến từ những nguyên liệu tươi ngon nhất, không sử dụng chất bảo quản độc hại, mang lại trải nghiệm thưởng thức trọn vẹn và an toàn cho sức khỏe.
          </ThemedText>
        </View>

        {/* OUR TEAM */}
        <ThemedText style={styles.sectionHeaderTitle}>Đội ngũ phát triển (Our Team)</ThemedText>
        <View style={styles.teamGrid}>
          {TEAM.map((member, index) => (
            <View key={index} style={[styles.teamCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <Image source={{ uri: member.avatar }} style={styles.teamAvatar} />
              <ThemedText style={styles.teamName}>{member.name}</ThemedText>
              <ThemedText style={[styles.teamRole, { color: colors.tint }]}>{member.role}</ThemedText>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
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
  heroBanner: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  storyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  teamGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  teamAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 10,
  },
  teamName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  teamRole: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
