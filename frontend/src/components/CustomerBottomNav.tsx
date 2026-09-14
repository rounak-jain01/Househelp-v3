import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavKey = 'home' | 'bookings' | 'profile';

type CustomerBottomNavProps = {
  visible?: boolean;
};

export default function CustomerBottomNav({ visible = true }: CustomerBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const active: NavKey =
    pathname === '/customer' || pathname === '/customer/'
      ? 'home'
      : pathname.startsWith('/customer/bookings')
        ? 'bookings'
        : pathname.startsWith('/customer/profile')
          ? 'profile'
          : 'home';

  const go = (key: NavKey) => {
    if (key === active) return;
    if (key === 'home') router.replace('/customer');
    else if (key === 'bookings') router.replace('/customer/bookings');
    else router.replace('/customer/profile');
  };

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 7) }]}>
        <NavItem label="Home" icon="home" active={active === 'home'} onPress={() => go('home')} />
        <NavItem label="Bookings" icon="bookings" active={active === 'bookings'} onPress={() => go('bookings')} />
        <NavItem label="Profile" icon="profile" active={active === 'profile'} onPress={() => go('profile')} />
      </View>
    </View>
  );
}

function NavItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: NavKey;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <View style={styles.iconSlot}>
        <NavIcon type={icon} active={active} />
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

function NavIcon({ type, active }: { type: NavKey; active: boolean }) {
  const stroke = active ? '#102536' : '#506273';
  const fill = active ? '#102536' : 'transparent';

  if (type === 'home') {
    return (
      <View style={styles.homeIcon}>
        <View style={[styles.homeRoof, { borderBottomColor: stroke }]} />
        <View style={[styles.homeBody, { backgroundColor: fill, borderColor: stroke }]}>
          <View style={[styles.homeDoor, { backgroundColor: active ? '#FFFFFF' : stroke }]} />
        </View>
      </View>
    );
  }

  if (type === 'bookings') {
    return (
      <View style={[styles.calendar, { borderColor: stroke }]}>
        <View style={[styles.calendarTop, { borderColor: stroke }]} />
        <View style={styles.calendarDots}>
          {[0, 1, 2, 3].map((dot) => (
            <View key={dot} style={[styles.dot, { backgroundColor: stroke }]} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.profileIcon}>
      <View style={[styles.profileHead, { borderColor: stroke, backgroundColor: fill }]} />
      <View style={[styles.profileShoulders, { borderColor: stroke, backgroundColor: fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    minHeight: 72,
    paddingTop: 7,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#102536',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 10,
  },
  item: {
    flex: 1,
    minHeight: 57,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 14,
  },
  itemPressed: {
    opacity: 0.6,
  },
  iconSlot: {
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 0,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    color: '#506273',
  },
  labelActive: {
    fontWeight: '800',
    color: '#102536',
  },
  homeIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
  },
  homeRoof: {
    position: 'absolute',
    top: 1,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  homeBody: {
    position: 'absolute',
    top: 10,
    width: 23,
    height: 18,
    borderWidth: 2.2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  homeDoor: {
    position: 'absolute',
    bottom: 0,
    left: 7,
    width: 7,
    height: 11,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  calendar: {
    width: 26,
    height: 27,
    borderWidth: 2.2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  calendarTop: {
    height: 7,
    borderBottomWidth: 2.2,
  },
  calendarDots: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 3,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  dot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  profileIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
  },
  profileHead: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.2,
  },
  profileShoulders: {
    position: 'absolute',
    bottom: 0,
    width: 27,
    height: 13,
    borderWidth: 2.2,
    borderRadius: 14,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
});
