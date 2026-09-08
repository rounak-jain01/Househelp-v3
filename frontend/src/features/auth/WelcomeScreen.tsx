import { useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type UserRole = 'user' | 'maid';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleContinue = () => {
    if (!selectedRole) return;

    router.push({
      pathname: '/auth/phone',
      params: { role: selectedRole },
    });
  };

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F7F7F5"
      />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <View style={styles.logo}>
              <View style={styles.roof} />
              <View style={styles.house} />
            </View>

            <Text style={styles.brand}>homehelp</Text>
          </View>
        </View>

        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.overline}>WELCOME</Text>

          <Text style={styles.title}>
            Home care,{'\n'}
            <Text style={styles.titleAccent}>made simple.</Text>
          </Text>

          <Text style={styles.subtitle}>
            Get reliable help for your home{'\n'}
            whenever you need it.
          </Text>
        </View>

        {/* Role Selection */}
        <View style={styles.roleSection}>
          <Text style={styles.sectionTitle}>
            How would you like to continue?
          </Text>

          {/* Customer */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSelectedRole('user')}
            style={[
              styles.roleCard,
              selectedRole === 'user' && styles.roleCardSelected,
            ]}
          >
            <View
              style={[
                styles.roleIcon,
                selectedRole === 'user' && styles.roleIconSelected,
              ]}
            >
              <Text
                style={[
                  styles.homeIcon,
                  selectedRole === 'user' && styles.iconSelected,
                ]}
              >
                ⌂
              </Text>
            </View>

            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>Customer</Text>

              <Text style={styles.roleDescription}>
                Book trusted help for your home
              </Text>
            </View>

            <View
              style={[
                styles.radio,
                selectedRole === 'user' && styles.radioSelected,
              ]}
            >
              {selectedRole === 'user' && (
                <View style={styles.radioDot} />
              )}
            </View>
          </TouchableOpacity>

          {/* Help */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSelectedRole('maid')}
            style={[
              styles.roleCard,
              selectedRole === 'maid' && styles.roleCardSelected,
            ]}
          >
            <View
              style={[
                styles.roleIcon,
                selectedRole === 'maid' && styles.roleIconSelected,
              ]}
            >
              <Text
                style={[
                  styles.helpIcon,
                  selectedRole === 'maid' && styles.iconSelected,
                ]}
              >
                +
              </Text>
            </View>

            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>Help</Text>

              <Text style={styles.roleDescription}>
                Provide home services and earn
              </Text>
            </View>

            <View
              style={[
                styles.radio,
                selectedRole === 'maid' && styles.radioSelected,
              ]}
            >
              {selectedRole === 'maid' && (
                <View style={styles.radioDot} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Action */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!selectedRole}
            onPress={handleContinue}
            style={[
              styles.continueButton,
              !selectedRole && styles.continueButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.continueText,
                !selectedRole && styles.continueTextDisabled,
              ]}
            >
              Continue
            </Text>

            <Text
              style={[
                styles.arrow,
                !selectedRole && styles.continueTextDisabled,
              ]}
            >
              →
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Simple help. Trusted service.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F7F5',
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },

  /* Header */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#202320',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  roof: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    top: 8,
  },

  house: {
    width: 13,
    height: 10,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#FFFFFF',
    marginTop: 7,
  },

  brand: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: '#202320',
  },

  /* Welcome */

  welcomeSection: {
    marginTop: 56,
  },

  overline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#8A8D89',
    marginBottom: 12,
  },

  title: {
    fontSize: 40,
    lineHeight: 45,
    fontWeight: '800',
    letterSpacing: -1.5,
    color: '#202320',
  },

  titleAccent: {
    color: '#617064',
  },

  subtitle: {
    marginTop: 17,
    fontSize: 15,
    lineHeight: 23,
    color: '#777A76',
  },

  /* Roles */

  roleSection: {
    marginTop: 46,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#353735',
    marginBottom: 15,
  },

  roleCard: {
    minHeight: 88,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E4E0',
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  roleCardSelected: {
    backgroundColor: '#F0F3F0',
    borderColor: '#617064',
  },

  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#F1F1EE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  roleIconSelected: {
    backgroundColor: '#DCE4DD',
  },

  homeIcon: {
    fontSize: 27,
    color: '#60635F',
  },

  helpIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: '#60635F',
  },

  iconSelected: {
    color: '#4D5D51',
  },

  roleInfo: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 12,
  },

  roleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#252725',
  },

  roleDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: '#858884',
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#C5C7C3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: '#617064',
  },

  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#617064',
  },

  /* Bottom */

  bottomSection: {
    marginTop: 'auto',
  },

  continueButton: {
    height: 56,
    borderRadius: 17,
    backgroundColor: '#202320',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  continueButtonDisabled: {
    backgroundColor: '#DDDED9',
  },

  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  continueTextDisabled: {
    color: '#9C9E99',
  },

  arrow: {
    fontSize: 21,
    marginLeft: 10,
    marginTop: -2,
    color: '#FFFFFF',
  },

  footerText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 11,
    color: '#A0A29E',
  },
});