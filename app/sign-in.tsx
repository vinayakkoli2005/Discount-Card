import React, { useEffect, useState } from "react";
import { StyleSheet, StatusBar, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import images from '@/constants/images';
import icons from '@/constants/icons';
import { login, loginDemo } from '@/lib/appwrite';
import { Redirect } from "expo-router";
import { useGlobalContext } from "@/lib/global-provider";

const SignIn = () => {
  const { refetch, loading, isLogged, user } = useGlobalContext();
  const [showDemo, setShowDemo] = useState(false);
  const [demoEmail, setDemoEmail] = useState("demo@volo.app");
  const [demoPassword, setDemoPassword] = useState("VoloDemo@123");

  useEffect(() => {
    if (__DEV__ && !loading && isLogged && user) {
      console.log("User:", user);
    }
  }, [loading, isLogged, user]);

  if (!loading && isLogged) return <Redirect href="/" />;

  const handleLogin = async () => {
    const result = await login();
    if (result) {
      refetch();
    } else {
      Alert.alert("Login Failed", "Unable to login. Please try again.");
    }
  };

  const handleDemoLogin = async () => {
    const result = await loginDemo(demoEmail, demoPassword);
    if (result) {
      refetch();
    } else {
      Alert.alert("Demo Login Failed", "Invalid credentials. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── Hero image ── */}
      <View style={{ position: 'relative' }}>
        <Image
          source={images.onboarding}
          style={{ width: '100%', height: 480 }}
          resizeMode="contain"
        />

        {/* VOLO pill */}
        <View style={styles.pill}>
          <Text style={styles.pillText}>VOLO</Text>
        </View>
      </View>

      {/* ── Branding ── */}
      <View style={styles.content}>
        <Text style={styles.brandName}>Volo</Text>

        <Text style={styles.tagline}>
          Vocal for local
        </Text>

        <Text style={styles.description}>
          Discover local stores near you
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Button */}
        <TouchableOpacity
          onPress={handleLogin}
          style={styles.button}
          activeOpacity={0.85}
        >
          <Image
            source={icons.google}
            style={{ width: 20, height: 20 }}
            resizeMode="contain"
          />
          <Text style={styles.buttonText}>Login with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowDemo(v => !v)}
          style={styles.demoButton}
          activeOpacity={0.7}
        >
          <Text style={styles.demoButtonText}>Try Demo</Text>
        </TouchableOpacity>

        {showDemo && (
          <View style={styles.demoForm}>
            <TextInput
              style={styles.demoInput}
              value={demoEmail}
              onChangeText={setDemoEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.demoInput}
              value={demoPassword}
              onChangeText={setDemoPassword}
              secureTextEntry
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              onPress={handleDemoLogin}
              style={styles.demoSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.demoSubmitText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.terms}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default SignIn;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  pill: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },

  pillText: {
    color: '#0061FF',
    fontFamily: 'Rubik-Bold',
    fontSize: 11,
    letterSpacing: 4,
    backgroundColor: '#0061FF0A',
    borderColor: '#0061FF40',
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 100,
  },

  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -30,
  },

  brandName: {
    fontFamily: 'Rubik-ExtraBold',
    fontSize: 58,
    color: '#191D31',
    textAlign: 'center',
    letterSpacing: 1.5,
  },

  tagline: {
    fontFamily: 'Rubik-Bold',
    fontSize: 22,
    color: '#0061FF',
    textAlign: 'center',
    marginTop: 10,
  },

  description: {
    fontFamily: 'Rubik-Medium',
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },

  divider: {
    width: 80,
    height: 2,
    backgroundColor: '#0061FF',
    marginVertical: 26,
    borderRadius: 10,
  },

  button: {
    backgroundColor: '#0061FF',
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20, // 👈 pushed down
    shadowColor: '#0061FF',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  buttonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 17,
    color: '#ffffff',
    marginLeft: 12,
  },

  demoButton: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#0061FF40',
    backgroundColor: '#0061FF08',
    width: '100%',
    alignItems: 'center',
  },

  demoButtonText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 15,
    color: '#0061FF',
  },

  demoForm: {
    width: '100%',
    marginTop: 12,
    gap: 10,
  },

  demoInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#191D31',
    backgroundColor: '#F9FAFB',
  },

  demoSubmit: {
    backgroundColor: '#0061FF',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 2,
  },

  demoSubmitText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 15,
    color: '#ffffff',
  },

  terms: {
    fontFamily: 'Rubik-Regular',
    fontSize: 11,
    color: '#8C8E9870',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
  },
});