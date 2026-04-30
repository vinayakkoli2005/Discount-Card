import icons from "@/constants/icons";
import images from "@/constants/images";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Store } from "@/lib/types/store";

const STORE_IMAGE_PLACEHOLDER =
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=640&q=60";

interface Props {
  item: Store;
  onPress?: () => void;
}

export const FeaturedCard = ({ item:{image,rating, name, address, Price, category}, onPress }: Props) => {

  return (
    
    <TouchableOpacity
      onPress={onPress}
      className="flex flex-col items-start w-60 h-80 relative"
    >
      <Image source={{ uri: image || STORE_IMAGE_PLACEHOLDER }} className="size-full rounded-2xl" />

      <Image
        source={images.cardGradient}
        className="size-full rounded-2xl absolute bottom-0"
      />


      <View className="flex flex-col items-start absolute bottom-5 inset-x-5">
        <Text
          className="text-xl font-rubik-extrabold text-white"
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text className="text-base font-rubik text-white" numberOfLines={1}>
          {address}
        </Text>

        <View className="flex flex-row items-center justify-between w-full">
          <Text className="text-xl font-rubik-extrabold text-white">
            ${Price}
          </Text>
          <Image source={icons.heart} className="size-5" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const Card = ({ item:{image,rating, name, address, Price,category}, onPress }: Props) => {
  return (
    <TouchableOpacity
      className="flex-1 w-full mt-4 px-3 py-4 rounded-lg bg-white shadow-lg shadow-black-100/70 relative"
      onPress={onPress}
    >

      <Image source={{ uri: image || STORE_IMAGE_PLACEHOLDER }} className="w-full h-40 rounded-lg" />
      <View className="flex flex-col mt-2">
        <Text className="text-base font-rubik-bold text-black-300">
          {name}
        </Text>
        <Text className="text-xs font-rubik text-black-100">
          {address}
        </Text>

        <View className="flex flex-row items-center justify-between mt-2">
          <Text className="text-base font-rubik-bold text-primary-300">
            {category}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
