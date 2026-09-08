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

type BottomSheetMessageProps = {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
  icon?: string;
};

export default function BottomSheetMessage({
  visible,
  title,
  message,
  buttonText = 'Got it',
  onClose,
  icon = '!',
}: BottomSheetMessageProps) {
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

          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{icon}</Text>
          </View>

          <Text style={styles.title}>{title}</Text>

          <Text style={styles.message}>{message}</Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
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
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 26,
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

  iconContainer: {
    width: 52,
    height: 52,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#EEF3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1A231B',
  },

  title: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
    color: '#151815',
  },

  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#737873',
  },

  button: {
    height: 52,
    marginTop: 22,
    borderRadius: 16,
    backgroundColor: '#151A16',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonPressed: {
    opacity: 0.84,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});