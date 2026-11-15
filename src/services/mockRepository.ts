import type { IRepository, UserProfile, CbtRecord, AttentionRecord, ExerciseSession, UserSettings } from './interfaces';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

export class MockRepository implements IRepository {
  private getStorageItem<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  private setStorageItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    await delay();
    return this.getStorageItem<UserProfile | null>('mb_current_user', null);
  }

  async loginSimulated(email: string): Promise<UserProfile> {
    await delay();
    let users = this.getStorageItem<UserProfile[]>('mb_users', []);
    let user = users.find(u => u.email === email);

    if (!user) {
      user = {
        uid: Math.random().toString(36).substring(2, 11),
        email,
        displayName: email.split('@')[0],
        photoURL: null,
        goals: 'Practicar la observación sin juzgar, aprender a reestructurar pensamientos y cultivar una atención más equilibrada.',
        createdAt: new Date().toISOString()
      };
      users.push(user);
      this.setStorageItem('mb_users', users);
    }

    this.setStorageItem('mb_current_user', user);
    return user;
  }

  async logout(): Promise<void> {
    await delay();
    localStorage.removeItem('mb_current_user');
  }

  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    await delay();
    let users = this.getStorageItem<UserProfile[]>('mb_users', []);
    let currentUser = this.getStorageItem<UserProfile | null>('mb_current_user', null);

    users = users.map(u => {
      if (u.uid === uid) {
        const updated = { ...u, ...data };
        if (currentUser && currentUser.uid === uid) {
          currentUser = updated;
        }
        return updated;
      }
      return u;
    });

    this.setStorageItem('mb_users', users);
    if (currentUser) {
      this.setStorageItem('mb_current_user', currentUser);
    }
  }

  async saveCbtRecord(record: Omit<CbtRecord, 'id' | 'userId' | 'date'> & { date?: string }): Promise<CbtRecord> {
    await delay();
    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error('No autenticado');

    const records = this.getStorageItem<CbtRecord[]>('mb_cbt_records', []);
    const newRecord: CbtRecord = {
      ...record,
      id: Math.random().toString(36).substring(2, 11),
      userId: currentUser.uid,
      date: record.date || new Date().toISOString()
    };

    records.push(newRecord);
    this.setStorageItem('mb_cbt_records', records);
    return newRecord;
  }

  async getCbtRecords(): Promise<CbtRecord[]> {
    await delay();
    const currentUser = await this.getCurrentUser();
    if (!currentUser) return [];

    const records = this.getStorageItem<CbtRecord[]>('mb_cbt_records', []);
    return records.filter(r => r.userId === currentUser.uid);
  }

  async updateCbtRecord(id: string, record: Partial<Omit<CbtRecord, 'id' | 'userId'>>): Promise<void> {
    await delay();
    let records = this.getStorageItem<CbtRecord[]>('mb_cbt_records', []);
    records = records.map(r => r.id === id ? { ...r, ...record } : r);
    this.setStorageItem('mb_cbt_records', records);
  }

  async deleteCbtRecord(id: string): Promise<void> {
    await delay();
    let records = this.getStorageItem<CbtRecord[]>('mb_cbt_records', []);
    records = records.filter(r => r.id !== id);
    this.setStorageItem('mb_cbt_records', records);
  }

  async saveAttentionRecord(record: Omit<AttentionRecord, 'id' | 'userId' | 'date'> & { date?: string }): Promise<AttentionRecord> {
    await delay();
    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error('No autenticado');

    const records = this.getStorageItem<AttentionRecord[]>('mb_attention_records', []);
    const newRecord: AttentionRecord = {
      ...record,
      id: Math.random().toString(36).substring(2, 11),
      userId: currentUser.uid,
      date: record.date || new Date().toISOString()
    };

    records.push(newRecord);
    this.setStorageItem('mb_attention_records', records);
    return newRecord;
  }

  async getAttentionRecords(): Promise<AttentionRecord[]> {
    await delay();
    const currentUser = await this.getCurrentUser();
    if (!currentUser) return [];

    const records = this.getStorageItem<AttentionRecord[]>('mb_attention_records', []);
    return records.filter(r => r.userId === currentUser.uid);
  }

  async saveExerciseSession(session: Omit<ExerciseSession, 'id' | 'userId' | 'date'> & { date?: string }): Promise<ExerciseSession> {
    await delay();
    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error('No autenticado');

    const sessions = this.getStorageItem<ExerciseSession[]>('mb_exercise_sessions', []);
    const newSession: ExerciseSession = {
      ...session,
      id: Math.random().toString(36).substring(2, 11),
      userId: currentUser.uid,
      date: session.date || new Date().toISOString()
    };

    sessions.push(newSession);
    this.setStorageItem('mb_exercise_sessions', sessions);
    return newSession;
  }

  async getExerciseSessions(): Promise<ExerciseSession[]> {
    await delay();
    const currentUser = await this.getCurrentUser();
    if (!currentUser) return [];

    const sessions = this.getStorageItem<ExerciseSession[]>('mb_exercise_sessions', []);
    return sessions.filter(s => s.userId === currentUser.uid);
  }

  async getSettings(userId: string): Promise<UserSettings> {
    await delay();
    const defaultSettings: UserSettings = { theme: 'dark', language: 'es' };
    const settingsMap = this.getStorageItem<Record<string, UserSettings>>('mb_settings', {});
    return settingsMap[userId] || defaultSettings;
  }

  async saveSettings(userId: string, settings: UserSettings): Promise<void> {
    await delay();
    const settingsMap = this.getStorageItem<Record<string, UserSettings>>('mb_settings', {});
    settingsMap[userId] = settings;
    this.setStorageItem('mb_settings', settingsMap);
  }

  // Pre-poblar datos de prueba para demostración completa de gráficos
  async populateMockData(userId: string) {
    // Generar registros TCC para las últimas 2 semanas
    const mockCbtRecords: CbtRecord[] = [
      {
        id: 'cbt1',
        userId,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // hace 10 días
        q1_whatHappened: 'Mi jefe me envió un correo pidiendo reunirnos con urgencia por la tarde sin dar detalles.',
        q2_directObservation: ['Solo escuché palabras sueltas', 'No tengo suficiente información'],
        q3_automaticThought: 'Cometí un error grave y me van a despedir de la empresa.',
        q4_emotions: { ansiedad: 85, miedo: 90, tristeza: 40, molestia: 10, verguenza: 60, enojo: 10 },
        q5_intensity: 85,
        q6_supportingEvidence: 'El correo dice "reunión urgente". En otras ocasiones cuando se despide a alguien, se hace de imprevisto.',
        q7_opposingEvidence: 'He cumplido todos mis objetivos este mes. Hace una semana mi supervisor elogió mi desempeño en el último proyecto. Las reuniones urgentes a menudo son por temas operativos o llamadas de clientes de último minuto.',
        q8_alternativeExplanations: [
          'Es posible que necesite mi ayuda para resolver una incidencia con un cliente importante.',
          'Puede ser para planificar el próximo sprint o discutir la delegación de una nueva tarea.',
          'Quizás quiera revisar detalles generales del equipo que no requieren pre-aviso complejo.'
        ],
        q9_balancedExplanation: 'Aunque la falta de detalles en el correo me causa ansiedad, es muy improbable que me despidan dado mi buen desempeño reciente. Lo más probable es que sea una reunión de trabajo operativa o una consulta rápida.',
        q10_whatLearned: 'La falta de información gatilla mis peores escenarios. Analizar la evidencia objetiva me ayudó a bajar la ansiedad a niveles manejables.'
      },
      {
        id: 'cbt2',
        userId,
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // hace 6 días
        q1_whatHappened: 'Saludé a un compañero en el pasillo y no me devolvió el saludo, pasó de largo.',
        q2_directObservation: ['Vi claramente a la persona', 'No pude escuchar toda la conversación'],
        q3_automaticThought: 'Le caigo mal y me está ignorando deliberadamente.',
        q4_emotions: { ansiedad: 30, miedo: 20, tristeza: 65, molestia: 50, verguenza: 70, enojo: 40 },
        q5_intensity: 60,
        q6_supportingEvidence: 'Pasó muy cerca de mí y tenía los ojos abiertos.',
        q7_opposingEvidence: 'Ayer almorzamos juntos y conversamos amigablemente. Llevaba auriculares puestos. El pasillo estaba ruidoso y él caminaba deprisa hacia la oficina de soporte con una laptop en la mano.',
        q8_alternativeExplanations: [
          'Iba muy distraído pensando en un problema técnico y no me vio.',
          'Llevaba música o estaba en una llamada con auriculares pequeños y no me escuchó.',
          'Iba apurado por una urgencia laboral y no tuvo tiempo de detenerse.'
        ],
        q9_balancedExplanation: 'Es muy probable que no me haya visto ni oído porque iba distraído, apurado y con auriculares, en lugar de ser un acto de desprecio hacia mí.',
        q10_whatLearned: 'No debo tomar las reacciones ajenas como algo personal inmediatamente; las explicaciones situacionales suelen ser más acertadas.'
      },
      {
        id: 'cbt3',
        userId,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // hace 3 días
        q1_whatHappened: 'Presenté mis ideas en la reunión de equipo y se hizo un silencio de varios segundos antes de que otro hablara.',
        q2_directObservation: ['Escuché la conversación completa', 'Vi claramente a la persona'],
        q3_automaticThought: 'Dijiste una tontería absoluta y todos piensan que eres un incompetente.',
        q4_emotions: { ansiedad: 70, miedo: 50, tristeza: 45, molestia: 10, verguenza: 80, enojo: 10 },
        q5_intensity: 75,
        q6_supportingEvidence: 'El silencio duró unos 5 segundos, lo cual se sintió eterno y tenso.',
        q7_opposingEvidence: 'Después del silencio, la líder del equipo dijo "Es una buena propuesta, vamos a analizar cómo integrarla". El equipo suele quedarse callado procesando información o esperando a que la líder hable primero.',
        q8_alternativeExplanations: [
          'Estaban asimilando los puntos complejos que expuse.',
          'Esperaban que la jefa de equipo diera su feedback inicial para no interrumpir.',
          'Estaban cansados (era viernes por la tarde) y el tiempo de respuesta era más lento.'
        ],
        q9_balancedExplanation: 'El silencio no indica rechazo ni incompetencia de mi parte. Se debió a la dinámica normal de espera en el equipo y al procesamiento de la propuesta, la cual finalmente fue bien recibida.',
        q10_whatLearned: 'Tengo una tendencia a interpretar las pausas sociales como desaprobación instantánea.'
      }
    ];

    // Generar datos de entrenamiento de atención
    const mockAttentionRecords: AttentionRecord[] = [];
    for (let i = 8; i >= 0; i--) {
      mockAttentionRecords.push({
        id: `att_${i}`,
        userId,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        neutralConversations: Math.floor(Math.random() * 5) + 2,
        pleasantConversations: Math.floor(Math.random() * 4) + 1,
        unpleasantConversations: Math.floor(Math.random() * 2), // sesgo atencional: pocas desagradables
        greetingsObserved: Math.floor(Math.random() * 6) + 3,
        collaborationsObserved: Math.floor(Math.random() * 4) + 1,
        smilesObserved: Math.floor(Math.random() * 5) + 2
      });
    }

    // Generar sesiones de ejercicios realizados
    const mockSessions: ExerciseSession[] = [
      { id: 's1', userId, exerciseId: 'respiracion', exerciseName: 'Respiración Consciente', date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), durationSeconds: 120, notes: 'Me sentí más calmado al finalizar.' },
      { id: 's2', userId, exerciseId: 'hechos', exerciseName: 'Hechos vs Interpretaciones', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), durationSeconds: 300, notes: 'Me ayudó a ver el correo de mi jefe objetivamente.' },
      { id: 's3', userId, exerciseId: 'respiracion', exerciseName: 'Respiración Consciente', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), durationSeconds: 180 },
      { id: 's4', userId, exerciseId: 'escaneo', exerciseName: 'Escaneo del Entorno', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), durationSeconds: 240 },
      { id: 's5', userId, exerciseId: 'gratitud', exerciseName: 'Diario de Gratitud', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), durationSeconds: 150, notes: 'Agradecí por el café y el buen clima.' },
      { id: 's6', userId, exerciseId: 'respiracion', exerciseName: 'Respiración Consciente', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), durationSeconds: 300 }
    ];

    this.setStorageItem('mb_cbt_records', mockCbtRecords);
    this.setStorageItem('mb_attention_records', mockAttentionRecords);
    this.setStorageItem('mb_exercise_sessions', mockSessions);
  }
}
export const mockRepositoryInstance = new MockRepository();
