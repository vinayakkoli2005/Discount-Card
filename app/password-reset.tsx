import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { sendPasswordRecovery } from "@/lib/appwrite";
import { getEmailError } from "@/lib/validation";

const PasswordReset = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const emailErr = getEmailError(email);
    if (emailErr) return Alert.alert("Invalid Email", emailErr);

    setSubmitting(true);
    try {
      await sendPasswordRecovery(email.trim());
      setSent(true);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Something went wrong.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View className="px-8 mt-10">
          <TouchableOpacity onPress={() => router.back()} className="mb-6">
            <Text className="text-primary-300 font-rubik-medium text-base">
              ← Back
            </Text>
          </TouchableOpacity>

          <Text className="text-2xl font-rubik-bold text-black-300">
            Reset Password
          </Text>

          {sent ? (
            <View className="mt-8 items-center">
              <Text className="text-5xl mb-4">📧</Text>
              <Text className="text-lg font-rubik-medium text-black-300 text-center">
                Check your inbox
              </Text>
              <Text className="text-base font-rubik text-black-200 text-center mt-2">
                We sent a password reset link to{"\n"}
                <Text className="font-rubik-medium text-black-300">{email}</Text>
              </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-primary-300 rounded-full px-8 py-4 mt-8"
              >
                <Text className="text-white font-rubik-medium text-base">
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text className="text-base font-rubik text-black-200 mt-2">
                Enter your email and we'll send you a link to reset your
                password.
              </Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="border border-gray-200 rounded-xl px-4 py-3 mt-6 font-rubik text-black-300"
                placeholderTextColor="#aaa"
              />

              <TouchableOpacity
                onPress={handleSend}
                disabled={submitting}
                className="bg-primary-300 rounded-full py-4 mt-5 items-center"
              >
                <Text className="text-white font-rubik-medium text-lg">
                  {submitting ? "Sending..." : "Send Reset Link"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PasswordReset;
