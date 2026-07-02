const API_KEY = '13f2a0b42e2ef8af321d5151b9c2f532';
const BASE_URL = 'https://api.sunoapi.org/api/v1';

export type SunoTaskStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'SENSITIVE_WORD_ERROR';

export interface SunoAudioData {
  id: string;
  title: string;
  audioUrl: string;
  imageUrl: string;
  videoUrl: string;
  duration: number;
  status: string;
}

export interface SunoTaskResponse {
  taskId: string;
  status: SunoTaskStatus;
  data?: SunoAudioData[];
}

export const generateMusic = async (prompt: string, tags: string, title: string): Promise<string> => {
  const response = await fetch(`${BASE_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      tags,
      title,
      customMode: true,
      instrumental: false,
      model: "V4_5ALL",
      callBackUrl: "https://httpbin.org/post",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate music: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  
  let taskId;
  if (typeof json.data === 'string') {
    taskId = json.data;
  } else if (json.data && json.data.taskId) {
    taskId = json.data.taskId;
  } else {
    taskId = json.taskId;
  }
  
  if (!taskId) {
     console.error("Suno API full response:", json);
     throw new Error(json.msg || "No taskId returned. Check console for full response.");
  }
  return taskId;
};

export const getTaskInfo = async (taskId: string): Promise<SunoTaskResponse> => {
  const response = await fetch(`${BASE_URL}/generate/record-info?taskId=${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch task info: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  
  if (json.code !== 200 || !json.data) {
    throw new Error(json.msg || "Failed to fetch task info");
  }

  const taskData = json.data;
  return {
    taskId: taskData.taskId,
    status: taskData.status,
    data: taskData.response?.sunoData || [],
  };
};
