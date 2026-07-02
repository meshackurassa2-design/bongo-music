import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { decode } from 'base64-arraybuffer';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { generateMusic, getTaskInfo, SunoAudioData, SunoTaskStatus } from '../lib/sunoApi';
import { useAIStore, AISongTask } from '../store/aiStore';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import { COLORS } from '../constants';
import MiniPlayer from '../components/MiniPlayer';

export default function AIStudioScreen() {
  const router = useRouter();
  
  // Create Form State
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [activeTab, setActiveTab] = useState<'Create' | 'Workspace'>('Create');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState<Record<string, boolean>>({});
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});

  const { tasks, addTask, updateTask, removeTask } = useAIStore();
  const { session, profile } = useAuthStore();

  const currentTrack = usePlayerStore(s => s.currentTrack);

  const handleGenerate = async () => {
    if (!title || !style || !lyrics) {
      Alert.alert("Missing Fields", "Please fill out title, style, and lyrics.");
      return;
    }
    setIsGenerating(true);
    try {
      const taskId = await generateMusic(lyrics, style, title);
      addTask(taskId, title);
      setTitle('');
      setStyle('');
      setLyrics('');
      setActiveTab('Workspace');
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'AI Studio', headerStyle: { backgroundColor: COLORS.card }, headerTintColor: COLORS.textPrimary, headerShown: false }} />
      
      {/* Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Studio</Text>
        <View style={{ width: 28 }} />
      </View>
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'Create' && styles.activeTab]} onPress={() => setActiveTab('Create')}>
          <Text style={[styles.tabText, activeTab === 'Create' && styles.activeTabText]}>Create</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'Workspace' && styles.activeTab]} onPress={() => setActiveTab('Workspace')}>
          <Text style={[styles.tabText, activeTab === 'Workspace' && styles.activeTabText]}>Workspace</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'Create' ? (
        <ScrollView style={styles.content} contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.label}>Song Title</Text>
          <TextInput style={styles.input} placeholder="e.g. Midnight Memories" placeholderTextColor={COLORS.textTertiary} value={title} onChangeText={setTitle} />
          
          <Text style={styles.label}>Musical Style (Genres / Vibes)</Text>
          <TextInput style={styles.input} placeholder="e.g. Acoustic pop, upbeat, female vocals" placeholderTextColor={COLORS.textTertiary} value={style} onChangeText={setStyle} />
          
          <Text style={styles.label}>Lyrics (Up to 3000 chars)</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Write your verses and chorus here..." placeholderTextColor={COLORS.textTertiary} value={lyrics} onChangeText={setLyrics} multiline textAlignVertical="top" />

          <TouchableOpacity style={[styles.generateBtn, isGenerating && { opacity: 0.7 }]} onPress={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <ActivityIndicator color={COLORS.black} /> : <Text style={styles.generateBtnText}>Generate with AI</Text>}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ padding: 16 }}>
          {tasks.length === 0 ? (
            <Text style={styles.emptyText}>Your workspace is empty.</Text>
          ) : (
            tasks.map(task => (
              <TaskItem 
                key={task.taskId} 
                task={task} 
                isPublishing={isPublishing} 
                setIsPublishing={setIsPublishing} 
                isDownloading={isDownloading} 
                setIsDownloading={setIsDownloading} 
              />
            ))
          )}
        </ScrollView>
      )}
      
      {/* Show global MiniPlayer if a song is playing */}
      {currentTrack && <MiniPlayer />}
    </SafeAreaView>
  );
}

function TaskItem({ task, isPublishing, setIsPublishing, isDownloading, setIsDownloading }: { task: AISongTask, isPublishing: any, setIsPublishing: any, isDownloading: any, setIsDownloading: any }) {
  const { updateTask, removeTask } = useAIStore();
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (task.status === 'PENDING' || task.status === 'PROCESSING') {
      interval = setInterval(async () => {
        try {
          const info = await getTaskInfo(task.taskId);
          setPollError(null);
          
          const hasTracks = info.data && info.data.length > 0 && (info.data[0].audioUrl || info.data[0].streamAudioUrl);
          
          if (hasTracks) {
             const mappedData = info.data.map((t: any) => ({ ...t, audioUrl: t.audioUrl || t.streamAudioUrl }));
             updateTask(task.taskId, 'SUCCESS', mappedData);
          } else if (info.status === 'SENSITIVE_WORD_ERROR') {
             updateTask(task.taskId, 'SENSITIVE_WORD_ERROR');
          } else if (info.status === 'FAILED' || info.status?.includes('ERROR')) {
             updateTask(task.taskId, 'FAILED');
          } else if (info.status === 'SUCCESS' && !hasTracks) {
             updateTask(task.taskId, 'FAILED');
          }
        } catch (e: any) {
          setPollError(e.message || "Network error");
        }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [task.status]);

  const manualCheck = async () => {
    try {
      const info = await getTaskInfo(task.taskId);
      const hasTracks = info.data && info.data.length > 0 && (info.data[0].audioUrl || info.data[0].streamAudioUrl);
      if (hasTracks) {
        const mappedData = info.data.map((t: any) => ({ ...t, audioUrl: t.audioUrl || t.streamAudioUrl }));
        updateTask(task.taskId, 'SUCCESS', mappedData);
      } else if (info.status === 'SENSITIVE_WORD_ERROR') {
        updateTask(task.taskId, 'SENSITIVE_WORD_ERROR');
      } else if (info.status === 'FAILED' || (info.status === 'SUCCESS' && !hasTracks)) {
        updateTask(task.taskId, 'FAILED');
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handlePlay = async (track: SunoAudioData) => {
    const aiTrack = {
      id: track.id,
      audio_url: track.audioUrl,
      title: track.title || task.title,
      artist_name: 'AI Generated',
      cover_url: track.imageUrl || 'https://via.placeholder.com/150',
      duration: Math.floor(track.duration || 0),
      play_count: 0
    };
    await usePlayerStore.getState().playTrack(aiTrack as any);
  };

  const handlePublish = async (track: SunoAudioData) => {
    setIsPublishing((prev: any) => ({ ...prev, [track.id]: true }));
    try {
      const { session, profile } = useAuthStore.getState();
      if (!session) throw new Error("Not logged in");
      
      const localAudioUri = FileSystem.cacheDirectory + `${track.id}.mp3`;
      await FileSystem.downloadAsync(track.audioUrl, localAudioUri);
      
      const localCoverUri = FileSystem.cacheDirectory + `${track.id}.jpg`;
      await FileSystem.downloadAsync(track.imageUrl, localCoverUri);

      const audioBase64 = await FileSystem.readAsStringAsync(localAudioUri, { encoding: FileSystem.EncodingType.Base64 });
      const coverBase64 = await FileSystem.readAsStringAsync(localCoverUri, { encoding: FileSystem.EncodingType.Base64 });

      const { data: audioData, error: audioErr } = await supabase.storage.from('audio').upload(`ai_tracks/${track.id}.mp3`, decode(audioBase64), { contentType: 'audio/mpeg' });
      if (audioErr) throw audioErr;

      const { data: coverData, error: coverErr } = await supabase.storage.from('images').upload(`ai_covers/${track.id}.jpg`, decode(coverBase64), { contentType: 'image/jpeg' });
      if (coverErr) throw coverErr;

      const audioPublicUrl = supabase.storage.from('audio').getPublicUrl(`ai_tracks/${track.id}.mp3`).data.publicUrl;
      const coverPublicUrl = supabase.storage.from('images').getPublicUrl(`ai_covers/${track.id}.jpg`).data.publicUrl;

      const { error: dbErr } = await supabase.from('tracks').insert({
        user_id: session.user.id,
        artist_name: profile?.display_name || session.user.user_metadata?.display_name || 'AI Artist',
        title: track.title || task.title,
        audio_url: audioPublicUrl,
        cover_url: coverPublicUrl,
        duration_sec: Math.floor(track.duration || 0),
        play_count: 0,
        is_public: true
      });
      if (dbErr) throw dbErr;

      Alert.alert("Success", "Song published to your profile!");
    } catch (e: any) {
      Alert.alert("Publish Error", e.message);
    } finally {
      setIsPublishing((prev: any) => ({ ...prev, [track.id]: false }));
    }
  };

  const handleDownload = async (track: SunoAudioData) => {
    setIsDownloading((prev: any) => ({ ...prev, [track.id]: true }));
    try {
      const localAudioUri = FileSystem.documentDirectory + `${(track.title || 'AI_Song').replace(/[^a-z0-9]/gi, '_')}.mp3`;
      await FileSystem.downloadAsync(track.audioUrl, localAudioUri);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localAudioUri);
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch (e: any) {
      Alert.alert("Download Error", e.message);
    } finally {
      setIsDownloading((prev: any) => ({ ...prev, [track.id]: false }));
    }
  };

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <TouchableOpacity onPress={() => removeTask(task.taskId)}>
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
      
      {task.status === 'PENDING' || task.status === 'PROCESSING' ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={COLORS.gold} size="small" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.statusText}>
              {pollError ? `Retrying... (${pollError})` : 'AI is composing...'}
            </Text>
          </View>
          <TouchableOpacity onPress={manualCheck} style={{ padding: 8, backgroundColor: COLORS.cardAlt, borderRadius: 8 }}>
            <Text style={{ color: COLORS.gold, fontSize: 12, fontWeight: 'bold' }}>CHECK</Text>
          </TouchableOpacity>
        </View>
      ) : task.status === 'SENSITIVE_WORD_ERROR' ? (
        <Text style={[styles.statusText, { color: COLORS.error }]}>Generation Failed: Sensitive words.</Text>
      ) : task.status === 'FAILED' ? (
        <Text style={[styles.statusText, { color: COLORS.error }]}>Generation Failed.</Text>
      ) : Array.isArray(task.tracks) && task.tracks.length > 0 ? (
        task.tracks.map(track => (
          <View key={track.id} style={styles.trackRow}>
            <Image source={{ uri: track.imageUrl }} style={styles.trackImg} cachePolicy="memory-disk" />
            <View style={{ flex: 1 }}>
               <Text style={styles.trackTitle}>{track.title || "AI Generated"}</Text>
               <View style={styles.trackActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handlePlay(track)}>
                    <Ionicons name="play" size={16} color={COLORS.black} />
                    <Text style={styles.actionText}>Play</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.cardAlt, flex: 0.5 }]} onPress={() => handleDownload(track)}>
                    {isDownloading[track.id] ? <ActivityIndicator size="small" color={COLORS.textPrimary} /> : (
                      <Ionicons name="download" size={16} color={COLORS.textPrimary} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.cardAlt }]} onPress={() => handlePublish(track)}>
                    {isPublishing[track.id] ? <ActivityIndicator size="small" color={COLORS.textPrimary} /> : (
                      <>
                        <Ionicons name="cloud-upload" size={16} color={COLORS.gold} />
                        <Text style={[styles.actionText, { color: COLORS.textPrimary }]}>Publish</Text>
                      </>
                    )}
                  </TouchableOpacity>
               </View>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.statusText}>Formatting tracks...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  customHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.gold },
  tabText: { color: COLORS.textSecondary, fontWeight: '600' },
  activeTabText: { color: COLORS.gold },
  content: { flex: 1 },
  label: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: COLORS.card, color: COLORS.textPrimary, padding: 14, borderRadius: 12, fontSize: 15 },
  textArea: { height: 180 },
  generateBtn: { backgroundColor: COLORS.gold, paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  generateBtnText: { color: COLORS.black, fontSize: 16, fontWeight: '700' },
  emptyText: { color: COLORS.textTertiary, textAlign: 'center', marginTop: 40 },
  taskCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 16 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  taskTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { color: COLORS.gold, fontSize: 13 },
  trackRow: { flexDirection: 'row', marginTop: 12, gap: 12, backgroundColor: COLORS.cardAlt, padding: 8, borderRadius: 8 },
  trackImg: { width: 60, height: 60, borderRadius: 8 },
  trackTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  trackActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.gold, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  actionText: { color: COLORS.black, fontSize: 12, fontWeight: '700' },
});
