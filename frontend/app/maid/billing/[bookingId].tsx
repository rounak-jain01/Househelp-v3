import { useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { doc, getFirestore, onSnapshot } from '@react-native-firebase/firestore';
import { useMaidLanguage } from '../../../src/features/maid/MaidLanguageContext';

type Billing = { baseAmount?: number; extraTimeMinutes?: number; extraTimeAmount?: number; totalAmount?: number; currency?: string; generatedAt?: unknown };
type Booking = { customerId?: string; maidId?: string | null; winningMaidId?: string | null; status?: string; customerName?: string; duration?: number; approvedExtraMinutes?: number; scheduledDateTime?: unknown; billing?: Billing; paymentStatus?: 'pending' | 'received'; paymentMethod?: 'cash' | 'upi' | null };

function money(value: unknown) { const n = Number(value); return Number.isFinite(n) ? `₹${Math.round(n)}` : '—'; }
function dateText(value: unknown) { try { if (!value) return '—'; const d = typeof (value as any)?.toDate === 'function' ? (value as any).toDate() : new Date(value as any); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' }); } catch { return '—'; } }

export default function MaidBillingRoute() {
  const { bookingId: routeBookingId } = useLocalSearchParams<{ bookingId: string }>();
  const bookingId = String(routeBookingId ?? '');
  const { language } = useMaidLanguage();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid || !bookingId?.trim()) { setError('Unable to load bill.'); setLoading(false); return; }
    const ref = doc(getFirestore(), 'bookings', bookingId.trim());
    return onSnapshot(ref, snap => {
      if (!snap.exists()) { setError('Booking not found.'); setLoading(false); return; }
      const data = snap.data() as Booking;
      if (data.maidId !== uid && data.winningMaidId !== uid) { setError('You do not have access to this bill.'); setLoading(false); return; }
      setBooking(data); setError(''); setLoading(false);
    }, e => { console.error('[MaidBilling] Listener failed:', e); setError(e.message || 'Unable to load bill.'); setLoading(false); });
  }, [bookingId]);

  const billing = booking?.billing;
  const isHindi = language === 'hi';
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1F7A4C" /><Text style={styles.muted}>{isHindi ? 'बिल लोड हो रहा है...' : 'Loading bill...'}</Text></View>;
  if (!booking || !billing) return <View style={styles.center}><Text style={styles.title}>{error || (isHindi ? 'बिल उपलब्ध नहीं है' : 'Bill is not available')}</Text><Pressable style={styles.button} onPress={() => router.replace('/maid')}><Text style={styles.buttonText}>{isHindi ? 'होम पर जाएं' : 'Back to home'}</Text></Pressable></View>;

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.header}><Text style={styles.eyebrow}>HOMEHELP</Text><Text style={styles.title}>{isHindi ? 'बिल / भुगतान' : 'Billing'}</Text><Text style={styles.subtitle}>{isHindi ? 'काम पूरा हो गया है' : 'Job completed'}</Text></View>
    <View style={styles.success}><Text style={styles.successTitle}>✓ {isHindi ? 'बुकिंग पूरी हुई' : 'Booking completed'}</Text><Text style={styles.successText}>{booking.customerName || (isHindi ? 'ग्राहक' : 'Customer')}</Text></View>
    <View style={styles.card}>
      <Row label={isHindi ? 'बुकिंग राशि' : 'Base amount'} value={money(billing.baseAmount)} />
      <Row label={isHindi ? 'अतिरिक्त समय' : 'Extra time'} value={`${billing.extraTimeMinutes ?? 0} min`} />
      <Row label={isHindi ? 'अतिरिक्त समय राशि' : 'Extra time amount'} value={money(billing.extraTimeAmount)} />
      <View style={styles.divider} />
      <Row label={isHindi ? 'कुल राशि' : 'Total'} value={money(billing.totalAmount)} strong />
    </View>
    <View style={styles.card}>
      <Row label={isHindi ? 'भुगतान स्थिति' : 'Payment status'} value={booking.paymentStatus === 'received' ? (isHindi ? 'Paid' : 'Paid') : (isHindi ? 'बकाया' : 'Pending')} />
      <Row label={isHindi ? 'भुगतान तरीका' : 'Payment method'} value={booking.paymentMethod ? booking.paymentMethod.toUpperCase() : '—'} />
      <Row label={isHindi ? 'पूरा होने का समय' : 'Completed at'} value={dateText(booking.scheduledDateTime)} />
    </View>
    <Text style={styles.note}>{isHindi ? 'अभी कोई ऑनलाइन पेमेंट गेटवे इस्तेमाल नहीं हो रहा है। यह स्क्रीन केवल बिलिंग सारांश दिखाती है।' : 'No online payment gateway is used. This screen shows the billing summary only.'}</Text>
    <Pressable style={styles.button} onPress={() => router.replace('/maid')}><Text style={styles.buttonText}>{isHindi ? 'होम पर जाएं' : 'Back to home'}</Text></Pressable>
  </ScrollView>;
}
function Row({ label, value, strong=false }: { label:string; value:string; strong?:boolean }) { return <View style={styles.row}><Text style={[styles.label, strong && styles.strong]}>{label}</Text><Text style={[styles.value, strong && styles.total]}>{value}</Text></View>; }
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F7F8F6'},content:{padding:20,paddingBottom:36},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:'#F7F8F6'},muted:{marginTop:10,color:'#707770'},header:{marginBottom:18},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.4,color:'#1F7A4C'},title:{marginTop:5,fontSize:27,fontWeight:'900',color:'#121612'},subtitle:{marginTop:4,fontSize:13,color:'#707770'},success:{padding:18,borderRadius:20,backgroundColor:'#EAF5EE',marginBottom:15},successTitle:{fontSize:17,fontWeight:'900',color:'#1F7A4C'},successText:{marginTop:6,fontSize:13,color:'#536057'},card:{backgroundColor:'#FFF',borderRadius:19,borderWidth:1,borderColor:'#E2E7E3',paddingHorizontal:16,marginBottom:15},row:{minHeight:56,flexDirection:'row',alignItems:'center'},label:{flex:1,fontSize:12,color:'#7A817B'},value:{fontSize:14,fontWeight:'800',color:'#202520'},strong:{fontWeight:'900',color:'#202520'},total:{fontSize:20,color:'#1F7A4C'},divider:{height:1,backgroundColor:'#ECEFEC'},note:{fontSize:12,lineHeight:18,color:'#737B75',marginBottom:4},button:{height:50,borderRadius:15,backgroundColor:'#1F7A4C',alignItems:'center',justifyContent:'center',marginTop:14},buttonText:{fontSize:14,fontWeight:'900',color:'#FFF'}});
