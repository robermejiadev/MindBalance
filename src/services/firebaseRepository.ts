import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signOut, 
  updateProfile as authUpdateProfile,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import type { Auth, User as FirebaseUser } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { IRepository, UserProfile, CbtRecord, AttentionRecord, ExerciseSession, UserSettings } from './interfaces';

// Configuración proporcionada por el usuario
const defaultFirebaseConfig = {
  apiKey: "AIzaSyCUwLMBtmc_tFuuAiW1BwUEaGd8HLxX0s0",
  authDomain: "mindbalance-514f8.firebaseapp.com",
  projectId: "mindbalance-514f8",
  storageBucket: "mindbalance-514f8.firebasestorage.app",
  messagingSenderId: "870536535995",
  appId: "1:870536535995:web:17a88fddd6c169a4db6e9e"
};

class FirebaseRepository implements IRepository {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private config: any = null;

  constructor() {
    this.initialize(defaultFirebaseConfig);
  }

  public initialize(config: any): boolean {
    try {
      if (!config || !config.apiKey) return false;
      this.config = config;
      
      // Evitar inicializar múltiples veces
      if (getApps().length === 0) {
        this.app = initializeApp(config);
      } else {
        this.app = getApp();
      }
      
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      return true;
    } catch (error) {
      console.error("Error al inicializar Firebase:", error);
      return false;
    }
  }

  public getAuthInstance(): Auth | null {
    return this.auth;
  }

  public isInitialized(): boolean {
    return this.app !== null && this.auth !== null && this.db !== null;
  }

  private mapFirebaseUser(user: FirebaseUser, goals?: string): UserProfile {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
      photoURL: user.photoURL,
      goals: goals || 'Practicar la observación sin juzgar, aprender a reestructurar pensamientos y cultivar una atención más equilibrada.',
      createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : new Date().toISOString()
    };
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    if (!this.isInitialized()) return null;
    const currentUser = this.auth!.currentUser;
    if (!currentUser) return null;
    
    // Buscar perfil extendido en Firestore
    const userDoc = await getDoc(doc(this.db!, 'users', currentUser.uid));
    let goals = undefined;
    if (userDoc.exists()) {
      goals = userDoc.data().goals;
    } else {
      // Crear documento inicial si no existe (importante para redirecciones de Google en móvil)
      goals = 'Practicar la observación sin juzgar, aprender a reestructurar pensamientos y cultivar una atención más equilibrada.';
      await setDoc(doc(this.db!, 'users', currentUser.uid), {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
        photoURL: currentUser.photoURL,
        goals,
        createdAt: new Date().toISOString()
      });
    }
    return this.mapFirebaseUser(currentUser, goals);
  }

  // Permite login por correo con Firebase Auth
  async loginWithEmail(email: string, password: string): Promise<UserProfile> {
    if (!this.isInitialized()) throw new Error('Firebase no está inicializado');
    const credential = await signInWithEmailAndPassword(this.auth!, email, password);
    const user = credential.user;
    
    const userDoc = await getDoc(doc(this.db!, 'users', user.uid));
    let goals = undefined;
    if (userDoc.exists()) {
      goals = userDoc.data().goals;
    } else {
      // Crear documento inicial si no existe
      await setDoc(doc(this.db!, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || email.split('@')[0],
        goals: 'Practicar la observación sin juzgar, aprender a reestructurar pensamientos y cultivar una atención más equilibrada.',
        createdAt: new Date().toISOString()
      });
    }

    return this.mapFirebaseUser(user, goals);
  }

  // Permite registro con Firebase Auth
  async signupWithEmail(email: string, password: string): Promise<UserProfile> {
    if (!this.isInitialized()) throw new Error('Firebase no está inicializado');
    const credential = await createUserWithEmailAndPassword(this.auth!, email, password);
    const user = credential.user;

    const profileData = {
      uid: user.uid,
      email: user.email,
      displayName: email.split('@')[0],
      goals: 'Practicar la observación sin juzgar, aprender a reestructurar pensamientos y cultivar una atención más equilibrada.',
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(this.db!, 'users', user.uid), profileData);
    return this.mapFirebaseUser(user, profileData.goals);
  }

  // Permite login con Google
  async loginWithGoogle(): Promise<UserProfile> {
    if (!this.isInitialized()) throw new Error('Firebase no está inicializado');
    const provider = new GoogleAuthProvider();
    
    // Usamos signInWithPopup para todo dispositivo, ya que signInWithRedirect falla
    // en móviles debido al bloqueo de cookies de terceros en dominios personalizados de Render.
    const credential = await signInWithPopup(this.auth!, provider);
    const user = credential.user;

    const userDoc = await getDoc(doc(this.db!, 'users', user.uid));
    let goals = undefined;
    if (userDoc.exists()) {
      goals = userDoc.data().goals;
    } else {
      goals = 'Practicar la observación sin juzgar, aprender a reestructurar pensamientos y cultivar una atención más equilibrada.';
      await setDoc(doc(this.db!, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        goals,
        createdAt: new Date().toISOString()
      });
    }

    return this.mapFirebaseUser(user, goals);
  }

  // Implementa loginSimulated (para alinearse con IRepository)
  async loginSimulated(_email: string): Promise<UserProfile> {
    // Si Firebase está activo, intentamos simular o arrojar error indicando usar credenciales reales.
    // Para simplificar, devolvemos un login de Firebase simulando o redirigiendo
    throw new Error('Usa loginWithEmail, signupWithEmail o loginWithGoogle cuando Firebase esté activo.');
  }

  async logout(): Promise<void> {
    if (!this.isInitialized()) return;
    await signOut(this.auth!);
  }

  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    if (!this.isInitialized()) return;
    
    // Actualizar en Firebase Auth si aplica
    const currentUser = this.auth!.currentUser;
    if (currentUser && currentUser.uid === uid) {
      if (data.displayName) {
        await authUpdateProfile(currentUser, { displayName: data.displayName });
      }
      if (data.photoURL) {
        await authUpdateProfile(currentUser, { photoURL: data.photoURL });
      }
    }

    // Actualizar en Firestore
    await setDoc(doc(this.db!, 'users', uid), data, { merge: true });
  }

  async saveCbtRecord(record: Omit<CbtRecord, 'id' | 'userId' | 'date'> & { date?: string }): Promise<CbtRecord> {
    if (!this.isInitialized()) throw new Error('Firebase no está inicializado');
    const currentUser = this.auth!.currentUser;
    if (!currentUser) throw new Error('No autenticado');

    const newRecord = {
      ...record,
      userId: currentUser.uid,
      date: record.date || new Date().toISOString()
    };

    const docRef = await addDoc(collection(this.db!, 'daily_records'), newRecord);
    return {
      ...newRecord,
      id: docRef.id
    };
  }

  async getCbtRecords(): Promise<CbtRecord[]> {
    if (!this.isInitialized()) return [];
    const currentUser = this.auth!.currentUser;
    if (!currentUser) return [];

    const q = query(collection(this.db!, 'daily_records'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    
    const records: CbtRecord[] = [];
    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      } as CbtRecord);
    });
    
    // Ordenar por fecha descendente
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async updateCbtRecord(id: string, record: Partial<Omit<CbtRecord, 'id' | 'userId'>>): Promise<void> {
    if (!this.isInitialized()) return;
    await setDoc(doc(this.db!, 'daily_records', id), record, { merge: true });
  }

  async deleteCbtRecord(id: string): Promise<void> {
    if (!this.isInitialized()) return;
    await deleteDoc(doc(this.db!, 'daily_records', id));
  }

  async saveAttentionRecord(record: Omit<AttentionRecord, 'id' | 'userId' | 'date'> & { date?: string }): Promise<AttentionRecord> {
    if (!this.isInitialized()) throw new Error('Firebase no está inicializado');
    const currentUser = this.auth!.currentUser;
    if (!currentUser) throw new Error('No autenticado');

    const newRecord = {
      ...record,
      userId: currentUser.uid,
      date: record.date || new Date().toISOString()
    };

    const docRef = await addDoc(collection(this.db!, 'attention_training'), newRecord);
    return {
      ...newRecord,
      id: docRef.id
    };
  }

  async getAttentionRecords(): Promise<AttentionRecord[]> {
    if (!this.isInitialized()) return [];
    const currentUser = this.auth!.currentUser;
    if (!currentUser) return [];

    const q = query(collection(this.db!, 'attention_training'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    
    const records: AttentionRecord[] = [];
    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      } as AttentionRecord);
    });
    
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async saveExerciseSession(session: Omit<ExerciseSession, 'id' | 'userId' | 'date'> & { date?: string }): Promise<ExerciseSession> {
    if (!this.isInitialized()) throw new Error('Firebase no está inicializado');
    const currentUser = this.auth!.currentUser;
    if (!currentUser) throw new Error('No autenticado');

    const newSession = {
      ...session,
      userId: currentUser.uid,
      date: session.date || new Date().toISOString()
    };

    const docRef = await addDoc(collection(this.db!, 'exercises'), newSession);
    return {
      ...newSession,
      id: docRef.id
    };
  }

  async getExerciseSessions(): Promise<ExerciseSession[]> {
    if (!this.isInitialized()) return [];
    const currentUser = this.auth!.currentUser;
    if (!currentUser) return [];

    const q = query(collection(this.db!, 'exercises'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    
    const sessions: ExerciseSession[] = [];
    snapshot.forEach(doc => {
      sessions.push({
        id: doc.id,
        ...doc.data()
      } as ExerciseSession);
    });
    
    return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getSettings(userId: string): Promise<UserSettings> {
    if (!this.isInitialized()) return { theme: 'dark', language: 'es' };
    
    const docRef = await getDoc(doc(this.db!, 'settings', userId));
    if (docRef.exists()) {
      return docRef.data() as UserSettings;
    }
    
    return { theme: 'dark', language: 'es', firebaseConfig: this.config };
  }

  async saveSettings(userId: string, settings: UserSettings): Promise<void> {
    if (!this.isInitialized()) return;
    await setDoc(doc(this.db!, 'settings', userId), settings, { merge: true });
  }
}

export const firebaseRepositoryInstance = new FirebaseRepository();
export { FirebaseRepository };
