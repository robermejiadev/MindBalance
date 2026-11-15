export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  goals?: string;
  createdAt: string;
}

export interface CbtRecord {
  id: string;
  userId: string;
  date: string; // ISO date string
  q1_whatHappened: string;
  q2_directObservation: string[]; // checkboxes selected
  q3_automaticThought: string;
  q4_emotions: {
    ansiedad: number;
    miedo: number;
    tristeza: number;
    molestia: number;
    verguenza: number;
    enojo: number;
  };
  q5_intensity: number;
  q6_supportingEvidence: string;
  q7_opposingEvidence: string;
  q8_alternativeExplanations: string[]; // dynamic list of explanations
  q9_balancedExplanation: string;
  q10_whatLearned: string;
}

export interface AttentionRecord {
  id: string;
  userId: string;
  date: string;
  neutralConversations: number;
  pleasantConversations: number;
  unpleasantConversations: number;
  greetingsObserved: number;
  collaborationsObserved: number;
  smilesObserved: number;
}

export interface ExerciseSession {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  date: string;
  durationSeconds: number;
  notes?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'es' | 'en';
  firebaseConfig?: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  };
}

export interface IRepository {
  // Authentication
  getCurrentUser(): Promise<UserProfile | null>;
  loginSimulated(email: string): Promise<UserProfile>;
  logout(): Promise<void>;
  updateProfile(uid: string, data: Partial<UserProfile>): Promise<void>;

  // CBT Records
  saveCbtRecord(record: Omit<CbtRecord, 'id' | 'userId' | 'date'> & { date?: string }): Promise<CbtRecord>;
  updateCbtRecord(id: string, record: Partial<Omit<CbtRecord, 'id' | 'userId'>>): Promise<void>;
  getCbtRecords(): Promise<CbtRecord[]>;
  deleteCbtRecord(id: string): Promise<void>;

  // Attention Training
  saveAttentionRecord(record: Omit<AttentionRecord, 'id' | 'userId' | 'date'> & { date?: string }): Promise<AttentionRecord>;
  getAttentionRecords(): Promise<AttentionRecord[]>;

  // Exercises
  saveExerciseSession(session: Omit<ExerciseSession, 'id' | 'userId' | 'date'> & { date?: string }): Promise<ExerciseSession>;
  getExerciseSessions(): Promise<ExerciseSession[]>;

  // Settings
  getSettings(userId: string): Promise<UserSettings>;
  saveSettings(userId: string, settings: UserSettings): Promise<void>;
}
