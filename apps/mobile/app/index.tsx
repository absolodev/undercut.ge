import { View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { MobileTimingTower } from "../components/MobileTimingTower";
import { MobileTrackMap } from "../components/MobileTrackMap";

export default function Home() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "UnderCut Live" }} />
      <View style={styles.mapContainer}>
        <MobileTrackMap />
      </View>
      <View style={styles.towerContainer}>
        <MobileTimingTower />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  mapContainer: {
    height: 250,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  towerContainer: {
    flex: 1,
  },
});
