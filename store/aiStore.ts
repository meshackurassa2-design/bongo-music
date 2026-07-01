import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SunoAudioData, SunoTaskStatus } from '../lib/sunoApi';

export interface AISongTask {
  taskId: string;
  title: string;
  status: SunoTaskStatus;
  createdAt: number;
  tracks?: SunoAudioData[];
}

interface AIStore {
  tasks: AISongTask[];
  addTask: (taskId: string, title: string) => void;
  updateTask: (taskId: string, status: SunoTaskStatus, tracks?: SunoAudioData[]) => void;
  removeTask: (taskId: string) => void;
}

export const useAIStore = create<AIStore>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (taskId, title) => set((state) => ({
        tasks: [{ taskId, title, status: 'PENDING', createdAt: Date.now() }, ...state.tasks]
      })),
      updateTask: (taskId, status, tracks) => set((state) => ({
        tasks: state.tasks.map(t => t.taskId === taskId ? { ...t, status, tracks: tracks || t.tracks } : t)
      })),
      removeTask: (taskId) => set((state) => ({
        tasks: state.tasks.filter(t => t.taskId !== taskId)
      })),
    }),
    {
      name: 'ai-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
