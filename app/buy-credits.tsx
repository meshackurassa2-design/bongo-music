import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../constants';

const PACKAGES_META: Record<string, { credits: number; songs: number; oldPrice: string | null; saveText: string | null; popular: boolean }> = {
  'credits_small_120': { credits: 120, songs: 10, oldPrice: null, saveText: null, popular: false },
  'credits_medium_600': { credits: 600, songs: 50, oldPrice: '16,000 TSH', saveText: 'SAVE 10%', popular: true },
  'credits_large_1200': { credits: 1200, songs: 100, oldPrice: '32,000 TSH', saveText: 'SAVE 17%', popular: false },
};

export default function BuyCreditsScreen() {
  const router = useRouter();
  const { session, profile, fetchProfile } = useAuthStore();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        if (Platform.OS === 'web') {
          setIsLoading(false);
          return; // RevenueCat not supported on web
        }
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (e) {
        console.error('Error fetching offerings', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOfferings();
  }, []);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    if (!session?.user) {
      Alert.alert("Error", "You must be logged in to buy credits.");
      return;
    }

    setProcessingId(pkg.identifier);
    
    try {
      if (Platform.OS === 'web') throw new Error("In-App Purchases are not supported on the web.");
      
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      
      const meta = PACKAGES_META[pkg.product.identifier] || { credits: 0 };
      if (meta.credits > 0) {
        const { error } = await supabase.rpc('add_credits', { 
          user_id: session.user.id, 
          amount: meta.credits 
        });
        if (error) throw error;
        await fetchProfile(session.user.id);
      }
      
      Alert.alert(
        "Purchase Successful!", 
        "Thank you for your purchase. Your credits have been added.",
        [{ text: "Awesome", onPress: () => router.back() }]
      );
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert("Purchase Failed", error.message || "An unknown error occurred.");
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store</Text>
        <View style={styles.balanceBadge}>
          <Ionicons name="diamond" size={14} color={COLORS.gold} />
          <Text style={styles.balanceText}>{profile?.credits || 0}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[COLORS.goldLight, COLORS.goldDark]}
            style={styles.heroIcon}
          >
            <Ionicons name="diamond" size={48} color={COLORS.black} />
          </LinearGradient>
          <Text style={styles.heroTitle}>Get More Credits</Text>
          <Text style={styles.heroSub}>Generate incredible AI songs. Each song costs 12 credits.</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={COLORS.gold} size="large" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.packagesContainer}>
            {packages.map((pkg) => {
              const meta = PACKAGES_META[pkg.product.identifier] || { credits: pkg.product.title, songs: '?', oldPrice: null, saveText: null, popular: false };
              return (
              <TouchableOpacity 
                key={pkg.identifier} 
                style={[styles.packageCard, meta.popular && styles.packageCardPopular]}
                onPress={() => handlePurchase(pkg)}
                disabled={processingId !== null}
              >
                {meta.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>MOST POPULAR</Text>
                  </View>
                )}
                
                <View style={styles.packageInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="diamond" size={20} color={COLORS.gold} />
                    <Text style={styles.creditAmount}>{meta.credits}</Text>
                  </View>
                  <Text style={styles.creditLabel}>{meta.songs} Songs</Text>
                </View>

                <View style={styles.priceContainer}>
                  <View style={styles.priceTopRow}>
                    {meta.saveText && <Text style={styles.saveTextInline}>{meta.saveText}</Text>}
                    {meta.oldPrice && <Text style={styles.oldPrice}>{meta.oldPrice}</Text>}
                  </View>
                  <View style={styles.priceBtn}>
                    {processingId === pkg.identifier ? (
                      <ActivityIndicator color={COLORS.black} size="small" />
                    ) : (
                      <Text style={styles.priceText}>{pkg.product.priceString}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              );
            })}
            
            {packages.length === 0 && (
              <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginTop: 20 }}>
                No packages available. Please configure RevenueCat.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  balanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 4 },
  balanceText: { color: COLORS.gold, fontSize: 13, fontWeight: 'bold' },
  content: { padding: 24 },
  heroSection: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  heroIcon: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  heroTitle: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  heroSub: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  packagesContainer: { gap: 16 },
  packageCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.divider },
  packageCardPopular: { borderColor: COLORS.gold, backgroundColor: '#2a2211' },
  popularBadge: { position: 'absolute', top: -10, left: '50%', transform: [{ translateX: -45 }], backgroundColor: COLORS.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  popularText: { color: COLORS.black, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  packageInfo: { gap: 4 },
  creditAmount: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800' },
  creditLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  priceContainer: { alignItems: 'flex-end', gap: 6 },
  priceTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 },
  saveTextInline: { color: COLORS.gold, fontSize: 11, fontWeight: '800' },
  oldPrice: { color: COLORS.textTertiary, fontSize: 12, textDecorationLine: 'line-through', fontWeight: '600' },
  priceBtn: { backgroundColor: COLORS.gold, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, minWidth: 90, alignItems: 'center' },
  priceText: { color: COLORS.black, fontSize: 16, fontWeight: '800' },
});
