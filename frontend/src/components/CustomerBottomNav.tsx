import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavKey = 'home' | 'bookings' | 'profile';

type CustomerBottomNavProps = {
  visible?: boolean;
};

export default function CustomerBottomNav({
  visible = true,
}: CustomerBottomNavProps) {
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

    if (key === 'home') {
      router.replace('/customer');
    } else if (key === 'bookings') {
      router.replace('/customer/bookings');
    } else {
      router.replace('/customer/profile');
    }
  };

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View
        style={[
          styles.bar,
          {
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        <NavItem
          label="Home"
          icon="home"
          active={active === 'home'}
          onPress={() => go('home')}
        />
        <NavItem
          label="Bookings"
          icon="bookings"
          active={active === 'bookings'}
          onPress={() => go('bookings')}
        />
        <NavItem
          label="Profile"
          icon="profile"
          active={active === 'profile'}
          onPress={() => go('profile')}
        />
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
      style={({ pressed }) => [
        styles.item,
        pressed && styles.itemPressed,
      ]}
    >
      <View style={styles.iconSlot}>
        <NavIcon type={icon} active={active} />
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function NavIcon({
  type,
  active,
}: {
  type: NavKey;
  active: boolean;
}) {
  const stroke = active ? '#102536' : '#506273';
  const fill = active ? '#102536' : 'transparent';

  if (type === 'home') {
    return (
      <View style={styles.homeIcon}>
        <View
          style={[
            styles.homeRoof,
            {
              borderBottomColor: stroke,
            },
          ]}
        />
        <View
          style={[
            styles.homeBody,
            {
              backgroundColor: fill,
              borderColor: stroke,
            },
          ]}
        >
          <View
            style={[
              styles.homeDoor,
              { backgroundColor: active ? '#FFFFFF' : stroke },
            ]}
          />
        </View>
      </View>
    );
  }

  if (type === 'bookings') {
    return (
      <View style={[styles.calendar, { borderColor: stroke }]}>
        <View style={[styles.calendarTop, { borderColor: stroke }]} />
        <View style={styles.calendarDots}>
          <View style={[styles.dot, { backgroundColor: stroke }]} />
          <View style={[styles.dot, { backgroundColor: stroke }]} />
          <View style={[styles.dot, { backgroundColor: stroke }]} />
          <View style={[styles.dot, { backgroundColor: stroke }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.profileIcon}>
      <View
        style={[
          styles.profileHead,
          { borderColor: stroke, backgroundColor: fill },
        ]}
      />
      <View
        style={[
          styles.profileShoulders,
          { borderColor: stroke, backgroundColor: fill },
        ]}
      />
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
    minHeight: 92,
    paddingTop: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    shadowColor: '#102536',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 12,
  },
  item: {
    flex: 1,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 18,
  },
  itemPressed: {
    opacity: 0.65,
  },
  iconSlot: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 2,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '500',
    color: '#506273',
  },
  labelActive: {
    fontWeight: '800',
    color: '#102536',
  },
  homeIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
  },
  homeRoof: {
    position: 'absolute',
    top: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 17,
    borderRightWidth: 17,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  homeBody: {
    position: 'absolute',
    top: 12,
    width: 28,
    height: 22,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  homeDoor: {
    position: 'absolute',
    bottom: 0,
    left: 9,
    width: 8,
    height: 13,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  calendar: {
    width: 30,
    height: 31,
    borderWidth: 2.5,
    borderRadius: 5,
    overflow: 'hidden',
  },
  calendarTop: {
    height: 8,
    borderBottomWidth: 2.5,
  },
  calendarDots: {
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  profileIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
  },
  profileHead: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  },
  profileShoulders: {
    position: 'absolute',
    bottom: 1,
    width: 31,
    height: 15,
    borderWidth: 2.5,
    borderRadius: 16,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
});
