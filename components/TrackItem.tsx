import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Track } from '../constants';

type Props = {
  track: Track;
  isPlaying: boolean;
  onPress: () => void;
  onArtistPress?: () => void;
};

export default function TrackItem({ track, isPlaying, onPress, onArtistPress }: Props) {
  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  return (
    <TouchableOpacity
      style={[styles.container, isPlaying && styles.playing]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Cover */}
      <View style={styles.coverWrap}>
        {track.cover_url
          ? <Image source={{ uri: track.cover_url }} style={styles.cover} transition={200} cachePolicy="memory-disk" />
          : <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="musical-note" size={20} color={COLORS.textTertiary} />
            </View>
        }
        {isPlaying && (
          <View style={styles.playingOverlay}>
            <Ionicons name="volume-high" size={18} color={COLORS.gold} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.title, isPlaying && styles.titlePlaying]} numberOfLines={1}>{track.title}</Text>
        <TouchableOpacity onPress={onArtistPress} disabled={!onArtistPress}>
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist_name} · <Text style={styles.genre}>{track.genre}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <Text style={styles.stat}>{formatCount(track.play_count)} ▶</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Ionicons name="heart" size={10} color={COLORS.textTertiary} />
          <Text style={styles.stat}>{formatCount(track.like_count)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  playing: { backgroundColor: COLORS.gold + '10' },
  coverWrap: { position: 'relative' },
  cover: { width: 52, height: 52, borderRadius: 8, backgroundColor: COLORS.card },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  playingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  title: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  titlePlaying: { color: COLORS.gold },
  artist: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  genre: { color: COLORS.textTertiary },
  stats: { alignItems: 'flex-end', gap: 3 },
  stat: { color: COLORS.textTertiary, fontSize: 11 },
});
