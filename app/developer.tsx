import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import icons from "@/constants/icons";

const PHONE = "9711210844";
const LINKEDIN = "https://www.linkedin.com/in/vinayak-koli-940b0728b/";

const openURL = (url: string) =>
  Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open link"));

export default function DeveloperInfo() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Image source={icons.backArrow} style={{ width: 18, height: 18 }} />
        </TouchableOpacity>

        {/* Hero card */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>VK</Text>
          </View>
          <Text style={styles.heroName}>Vinayak Koli</Text>
          <Text style={styles.heroRole}>Full-Stack Developer</Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>Open to Work ✦</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Row label="🎓 College" value="IIIT Delhi" />
          <Row label="🏛️ Full Form" value="Indraprastha Institute of Information Technology, Delhi" />
          <Row label="📚 Degree" value="B.Tech – Computer Science & Social Sciences" />
        </View>

        {/* CTA card */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaHeading}>💡 Let's Build Something Great</Text>
          <Text style={styles.ctaBody}>
            Need affordable, high-quality software or mobile app development?{"\n"}
            I build clean, fast, and scalable products — without the agency price tag.
          </Text>
        </View>

        {/* Contact buttons */}
        <View style={styles.contactRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnCall]}
            onPress={() => openURL(`tel:${PHONE}`)}
          >
            <Image source={icons.phone} style={styles.btnIcon} tintColor="#fff" />
            <Text style={styles.btnText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnWA]}
            onPress={() => openURL(`https://wa.me/91${PHONE}`)}
          >
            <Image source={icons.chat} style={styles.btnIcon} tintColor="#fff" />
            <Text style={styles.btnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.linkedInBtn}
          onPress={() => openURL(LINKEDIN)}
        >
          <Text style={styles.linkedInText}>🔗  View LinkedIn Profile</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Built with React Native + Expo{"\n"}
          <Text style={{ color: "#0061FF" }}>vinayak23597@iiitd.ac.in</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 48 },

  back: {
    marginTop: 12,
    marginLeft: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Hero ── */
  hero: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: "#0061FF",
    borderRadius: 24,
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
    shadowColor: "#0061FF",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 2,
  },
  heroName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  heroRole: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  badge: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },

  /* ── Info card ── */
  card: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: "#F7F9FF",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E0EAFF",
  },
  row: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2FF",
  },
  rowLabel: {
    fontSize: 11,
    color: "#0061FF",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  rowValue: {
    fontSize: 14,
    color: "#191D31",
    fontWeight: "600",
    lineHeight: 20,
  },

  /* ── CTA card ── */
  ctaCard: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  ctaHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#92400E",
    marginBottom: 8,
  },
  ctaBody: {
    fontSize: 14,
    color: "#78350F",
    lineHeight: 22,
  },

  /* ── Contact ── */
  contactRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginHorizontal: 20,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnCall: {
    backgroundColor: "#0061FF",
    shadowColor: "#0061FF",
  },
  btnWA: {
    backgroundColor: "#25D366",
    shadowColor: "#25D366",
  },
  btnIcon: { width: 18, height: 18 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  linkedInBtn: {
    marginTop: 12,
    marginHorizontal: 20,
    backgroundColor: "#EEF4FF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C7D9FF",
  },
  linkedInText: {
    color: "#0061FF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  footer: {
    marginTop: 32,
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 20,
  },
});
