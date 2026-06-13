import { View, Text, FlatList, StyleSheet } from "react-native";

const mockStandings = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  position: i + 1,
  driver: ["VER", "PER", "LEC", "SAI", "NOR", "PIA", "RUS", "HAM"][i % 8],
  gap: i === 0 ? "LEADER" : `+${(i * 1.5).toFixed(3)}s`,
  tire: ["S", "M", "H"][i % 3],
}));

export function MobileTimingTower() {
  const renderItem = ({ item }: any) => (
    <View style={styles.row}>
      <Text style={styles.pos}>{item.position}</Text>
      <Text style={styles.driver}>{item.driver}</Text>
      <Text style={styles.gap}>{item.gap}</Text>
      <Text style={[styles.tire, item.tire === "S" ? styles.soft : item.tire === "M" ? styles.medium : styles.hard]}>
        {item.tire}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={mockStandings}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: "#000",
  },
  row: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    alignItems: "center",
  },
  pos: {
    color: "#fff",
    width: 30,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  driver: {
    color: "#fff",
    flex: 1,
    fontFamily: "monospace",
  },
  gap: {
    color: "#aaa",
    width: 80,
    textAlign: "right",
    fontFamily: "monospace",
  },
  tire: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: "center",
    lineHeight: 24,
    marginLeft: 12,
    fontWeight: "bold",
    fontSize: 12,
  },
  soft: { backgroundColor: "#E10600", color: "#fff" },
  medium: { backgroundColor: "#FFD700", color: "#000" },
  hard: { backgroundColor: "#fff", color: "#000" },
});
