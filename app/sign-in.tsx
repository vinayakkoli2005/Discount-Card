import React, { useEffect, useState } from "react";
import { StyleSheet} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import images from '@/constants/images';
import icons from '@/constants/icons';
import { isLoggedIn, login } from '@/lib/appwrite';
import { Redirect } from "expo-router";
import { useGlobalContext } from "@/lib/global-provider";



const SignIn = () => {
  const { refetch, loading, isLogged , user} = useGlobalContext();
  useEffect(() => {
    if (!loading && isLogged && user) {
      console.log("avatar value:", user.avatar);
      console.log("avatar typeof:", typeof user.avatar);
      console.log("✅ User already logged in:", user);
    }
  }, [loading, isLogged, user]);

  if (!loading && isLogged) return <Redirect href="/" />;

  const handleLogin = async () => {
    const result =  await login();
    if(result) {
      refetch();    
    }else {
      Alert.alert("Login Failed", "Unable to login. Please try again.");
    }
  }



  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerClassName="h-full">
        <Image source={images.onboarding} className="w-full h-4/6" resizeMode="contain" />

        <View className="px-10">
          <Text className="text-base text-center uppercase">
            Welcome To Discount Card
          </Text>
          <Text className="text-3xl font-rubik-bold text-black-300 text-center mt-2">
            Let's get you not closer to {'\n'}
            <Text className='text-primary-300'>Your Store</Text>
          </Text>
          <Text className='text-lg font-rubik text-black-200 text-center '>
            Login to Discount Card with Google
          </Text>
          <TouchableOpacity onPress={handleLogin} className="bg-white rounded-full w-full py-4 mt-5 shadow-lg shadow-zinc-900" >
            <View className="flex flex-row items-center justify-center">
              <Image
                source={icons.google}
                className="w-5 h-5"
                resizeMode="contain"
              />
              <Text className="text-lg font-rubik-medium text-black-300 ml-2">
                Continue with Google
              </Text>
            </View>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

export default SignIn

const styles = StyleSheet.create({})

// vinayak koli

