import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type Action = {
  label: string;
  onPress: () => void;
  icon?: string;
  destructive?: boolean;
};

type BottomSheetActionsProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  actions: Action[];
  onClose: () => void;
};

export default function BottomSheetActions({
  visible,
  title,
  subtitle,
  actions,
  onClose,
}: BottomSheetActionsProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 220,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const handleAction = (action: Action) => {
    onClose();

    setTimeout(() => {
      action.onPress();
    }, 180);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        >
          <Pressable
            style={styles.backdropPressable}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>{title}</Text>

          {subtitle ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : null}

          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => handleAction(action)}
                style={({ pressed }) => [
                  styles.action,
                  action.destructive && styles.destructiveAction,
                  pressed && styles.actionPressed,
                ]}
              >
                <View style={styles.actionIconContainer}>
                  <Text style={styles.actionIcon}>
                    {action.icon ?? '•'}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.actionText,
                    action.destructive && styles.destructiveText,
                  ]}
                >
                  {action.label}
                </Text>

                <Text style={styles.arrow}>›</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.actionPressed,
            ]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 18, 16, 0.48)',
  },

  backdropPressable: {
    flex: 1,
  },

  sheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
  },

  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    marginBottom: 22,
    borderRadius: 10,
    backgroundColor: '#D9DDD9',
  },

  title: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
    color: '#151815',
  },

  subtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: '#777D77',
  },

  actions: {
    marginTop: 20,
    gap: 10,
  },

  action: {
    minHeight: 62,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: '#F6F7F6',
    flexDirection: 'row',
    alignItems: 'center',
  },

  destructiveAction: {
    backgroundColor: '#FEF2F2',
  },

  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionIcon: {
    fontSize: 18,
    color: '#222822',
  },

  actionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#202520',
  },

  destructiveText: {
    color: '#B42318',
  },

  arrow: {
    fontSize: 27,
    color: '#7A807A',
  },

  actionPressed: {
    opacity: 0.78,
  },

  cancelButton: {
    height: 52,
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#ECEFEC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#272C27',
  },
});