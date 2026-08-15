import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import { formatTimer } from "../hooks/useLiveSpeech";
import type { RecordingItem } from "../types";

type Props = {
  items: RecordingItem[];
  favoritesOnly?: boolean;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen: (item: RecordingItem) => void;
};

export function RecordingsScreen({
  items,
  favoritesOnly = false,
  onToggleFavorite,
  onDelete,
  onOpen,
}: Props) {
  const list = favoritesOnly ? items.filter((i) => i.favorite) : items;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>
        {favoritesOnly ? "Favorites" : "Recent Recordings"}
      </Text>
      <Text style={styles.sub}>
        {favoritesOnly
          ? "Starred transcripts only"
          : "Saved live transcriptions from Home"}
      </Text>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No recordings yet</Text>
          <Text style={styles.emptyBody}>
            Go to Home, speak, then tap Save.
          </Text>
        </View>
      ) : (
        list.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onOpen(item)}
            style={styles.card}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Pressable
                onPress={() => onToggleFavorite(item.id)}
                hitSlop={8}
              >
                <Text style={styles.star}>{item.favorite ? "★" : "☆"}</Text>
              </Pressable>
            </View>
            <Text style={styles.cardMeta}>
              {new Date(item.createdAt).toLocaleString()} ·{" "}
              {formatTimer(item.durationSec)}
            </Text>
            <Text style={styles.cardPreview} numberOfLines={2}>
              {item.text}
            </Text>
            <Pressable
              onPress={() =>
                Alert.alert("Delete recording?", undefined, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDelete(item.id),
                  },
                ])
              }
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 28, gap: 12 },
  title: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 28,
    color: colors.text,
  },
  sub: {
    marginTop: -4,
    marginBottom: 8,
    fontFamily: "DMSans_400Regular",
    color: colors.textMuted,
    fontSize: 14,
  },
  empty: {
    marginTop: 40,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  emptyTitle: {
    fontFamily: "Outfit_700Bold",
    color: colors.text,
    fontSize: 16,
  },
  emptyBody: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    color: colors.textMuted,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    fontFamily: "Outfit_700Bold",
    color: colors.text,
    fontSize: 16,
  },
  star: { color: colors.gold, fontSize: 18 },
  cardMeta: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    color: colors.textDim,
    fontSize: 12,
  },
  cardPreview: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  deleteBtn: { marginTop: 10, alignSelf: "flex-start" },
  deleteText: {
    color: colors.red,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
});
