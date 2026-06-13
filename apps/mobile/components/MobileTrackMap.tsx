import { View, Text, StyleSheet } from "react-native";

export function MobileTrackMap() {
  // In a real app this would use @shopify/react-native-skia
  return (
    <View style={styles.container}>
      <Text style={styles.text}>[ Track Map Canvas Placeholder ]</Text>
      <View style={styles.dot} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#555",
    fontFamily: "monospace",
  },
  dot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E10600",
    top: "50%",
    left: "50%",
  },
});
