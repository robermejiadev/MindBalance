import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Heart, 
  Clipboard, 
  Compass,
  Brain
} from 'lucide-react';
import { getRepository } from '../../services';
import { toPeruDateTimeLocal, fromPeruDateTimeLocalToISO, formatPeruLongDateTime } from '../../utils/dateUtils';
import { Calendar, Clock } from 'lucide-react';

interface NewRecordProps {
  onNavigate: (path: string) => void;
}

type EmotionKey = 'ansiedad' | 'miedo' | 'tristeza' | 'molestia' | 'verguenza' | 'enojo';

export const NewRecord: React.FC<NewRecordProps> = ({ onNavigate }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recordDateLocal, setRecordDateLocal] = useState(() => toPeruDateTimeLocal());
  const [success, setSuccess] = useState(false);

  // Form State
  const [q1_whatHappened, setQ1] = useState('');
  const [q2_directObservation, setQ2] = useState<string[]>([]);
  const [q3_automaticThought, setQ3] = useState('');
  const [q4_emotions, setQ4] = useState<Record<EmotionKey, number>>({
    ansiedad: 0,
    miedo: 0,
    tristeza: 0,
    molestia: 0,
    verguenza: 0,
    enojo: 0
  });
  const [q5_intensity, setQ5] = useState(50);
  const [q6_supportingEvidence, setQ6] = useState('');
  const [q7_opposingEvidence, setQ7] = useState('');
  const [q8_alternativeExplanations, setQ8] = useState<string[]>(['']);
  const [q9_balancedExplanation, setQ9] = useState('');
  const [q10_whatLearned, setQ10] = useState('');

  const observationOptions = [
    'Escuché mi nombre',
    'Vi claramente a la persona',
    'Solo escuché palabras sueltas',
    'No pude escuchar toda la conversación',
    'Escuché la conversación completa',
    'No tengo suficiente información'
  ];

  const emotionColors: Record<EmotionKey, string> = {
    ansiedad: 'var(--accent-primary)',
    miedo: '#EAB308',
    tristeza: 'var(--accent-cyan)',
    molestia: '#10B981',
    verguenza: '#F59E0B',
    enojo: '#EF4444'
  };

  const handleCheckboxToggle = (option: string) => {
    setQ2(prev => 
      prev.includes(option) 
        ? prev.filter(item => item !== option) 
        : [...prev, option]
    );
  };

  const handleEmotionChange = (key: EmotionKey, val: number) => {
    setQ4(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleAddExplanation = () => {
    setQ8(prev => [...prev, '']);
  };

  const handleRemoveExplanation = (index: number) => {
    setQ8(prev => prev.filter((_, i) => i !== index));
  };

  const handleExplanationChange = (index: number, val: string) => {
    setQ8(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const repo = getRepository();
      // Eliminar explicaciones vacías de la lista
      const filteredExplanations = q8_alternativeExplanations.filter(e => e.trim() !== '');
      
      await repo.saveCbtRecord({
        q1_whatHappened,
        q2_directObservation,
        q3_automaticThought,
        q4_emotions,
        q5_intensity,
        q6_supportingEvidence,
        q7_opposingEvidence,
        q8_alternativeExplanations: filteredExplanations.length > 0 ? filteredExplanations : ['Ninguna otra explicación identificada'],
        q9_balancedExplanation,
        q10_whatLearned,
        date: fromPeruDateTimeLocalToISO(recordDateLocal)
      });
      setSuccess(true);
    } catch (error) {
      console.error("Error al guardar registro de TCC:", error);
      alert("Hubo un error al guardar el registro en la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return q1_whatHappened.trim().length > 3;
      case 2: return q2_directObservation.length > 0;
      case 3: return q3_automaticThought.trim().length > 3;
      case 6: return q6_supportingEvidence.trim().length > 3;
      case 7: return q7_opposingEvidence.trim().length > 3;
      case 9: return q9_balancedExplanation.trim().length > 3;
      case 10: return q10_whatLearned.trim().length > 3;
      default: return true; // los sliders y explicaciones dinámicas tienen valores por defecto o son opcionales
    }
  };

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '24px' }} className="fade-in">
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent-success-light)',
          color: 'var(--accent-success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px'
        }}>
          <CheckCircle2 size={48} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '12px' }}>Registro Guardado Correctamente</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
            Felicitaciones por tomarte el tiempo de observar tu mente. Cada vez que realizas un registro de pensamientos, entrenas tu capacidad de responder en lugar de reaccionar.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button onClick={() => onNavigate('/historial')} className="btn btn-primary">
            Ver mi Historial
          </button>
          <button onClick={() => onNavigate('/')} className="btn btn-secondary">
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      
      {/* Progreso del Formulario */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>
          <span>Paso {step} de 10</span>
          <span>{Math.round((step / 10) * 100)}% Completado</span>
        </div>
        <div style={{ height: '4px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${(step / 10) * 100}%`, height: '100%', backgroundColor: 'var(--accent-primary)', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </div>
      </div>

      {/* Caja Conversacional */}
      <div className="card fade-in" style={{ padding: '36px', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {/* Pregunta 1 */}
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                <Compass size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. La Situación</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4' }}>
                ¿Qué ocurrió?
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                Describe brevemente el evento desencadenante de forma objetiva. Evita juzgar la situación o a ti mismo; solo describe lo que una cámara de video habría grabado.
              </p>
              
              <div style={{
                backgroundColor: 'var(--bg-primary)',
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span>Fecha y Hora del Suceso (Hora de Perú - UTC-5):</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="datetime-local"
                    value={recordDateLocal}
                    onChange={(e) => setRecordDateLocal(e.target.value)}
                    className="form-input"
                    style={{ maxWidth: '270px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} />
                    {recordDateLocal ? formatPeruLongDateTime(fromPeruDateTimeLocalToISO(recordDateLocal)) : ''}
                  </span>
                </div>
              </div>
              <textarea
                value={q1_whatHappened}
                onChange={(e) => setQ1(e.target.value)}
                placeholder="Ejemplo: Envié una propuesta por correo a mi jefe y pasaron cuatro horas sin recibir respuesta..."
                className="form-textarea"
                rows={5}
                autoFocus
              />
            </div>
          )}

          {/* Pregunta 2 */}
          {step === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                <Clipboard size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Hechos Percibidos</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4' }}>
                ¿Qué observaste directamente?
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                Es común sacar conclusiones apresuradas. Selecciona qué hechos específicos presenciaste con tus propios sentidos en la situación:
              </p>
              <div className="checkbox-grid">
                {observationOptions.map((option) => (
                  <div
                    key={option}
                    onClick={() => handleCheckboxToggle(option)}
                    className={`checkbox-card ${q2_directObservation.includes(option) ? 'selected' : ''}`}
                  >
                    <input 
                      type="checkbox" 
                      checked={q2_directObservation.includes(option)}
                      onChange={() => {}} // Manejado por el click del contenedor
                    />
                    <span style={{ fontSize: '0.9rem' }}>{option}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pregunta 3 */}
          {step === 3 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                <Brain size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. Pensamiento Automático</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4' }}>
                ¿Qué pensamiento apareció automáticamente?
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                ¿Qué historia te contaste sobre lo que ocurrió? ¿Qué creíste que significaba la situación para ti en ese preciso instante?
              </p>
              <textarea
                value={q3_automaticThought}
                onChange={(e) => setQ3(e.target.value)}
                placeholder="Ejemplo: Piensa que mi trabajo es malo y por eso no me contesta. Seguramente me van a despedir..."
                className="form-textarea"
                rows={4}
                autoFocus
              />
            </div>
          )}

          {/* Pregunta 4 */}
          {step === 4 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                <Heart size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>4. Identificar Emociones</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4' }}>
                ¿Qué emoción sentiste?
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                Mueve los selectores para indicar la presencia y nivel de las siguientes emociones durante la situación:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(Object.keys(q4_emotions) as EmotionKey[]).map((emoKey) => (
                  <div key={emoKey} className="slider-container" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ width: '90px', textTransform: 'capitalize', fontWeight: 600, fontSize: '0.9rem' }}>{emoKey}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={q4_emotions[emoKey]}
                      onChange={(e) => handleEmotionChange(emoKey, parseInt(e.target.value))}
                      className="custom-slider"
                      style={{ flex: 1, accentColor: emotionColors[emoKey] }}
                    />
                    <span style={{ width: '40px', textAlign: 'right', fontSize: '0.9rem', fontWeight: '600', color: q4_emotions[emoKey] > 0 ? emotionColors[emoKey] : 'var(--text-muted)' }}>
                      {q4_emotions[emoKey]}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pregunta 5 */}
          {step === 5 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                <Heart size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>5. Intensidad de Malestar</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4' }}>
                ¿Qué intensidad tuvo esa emoción?
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                A nivel global, ¿qué tan fuerte fue el malestar o la perturbación emocional que experimentaste?
              </p>
              
              <div style={{ textAlign: 'center', margin: '40px 0' }}>
                <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{q5_intensity}</span>
                <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/ 100</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={q5_intensity}
                onChange={(e) => setQ5(parseInt(e.target.value))}
                className="custom-slider"
              />
              <div className="slider-labels">
                <span>Leve (0)</span>
                <span>Moderado (50)</span>
                <span>Severo (100)</span>
              </div>
            </div>
          )}

          {/* Pregunta 6 */}
          {step === 6 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                <Compass size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>6. Evidencia A Favor</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4' }}>
                ¿Qué evidencia objetiva apoya ese pensamiento?
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                Seamos científicos de nuestra mente. Escribe únicamente hechos objetivos y comprobados del mundo real que demuestren que tu pensamiento ("{q3_automaticThought}") es correcto.
              </p>
              <textarea
                value={q6_supportingEvidence}
                onChange={(e) => setQ6(e.target.value)}
                placeholder="Ejemplo: Es verdad que mi jefe me solicitó cambios en el correo anterior..."
                className="form-textarea"
                rows={4}
                autoFocus
              />
            </div>
          )}

          {/* Pregunta 7 */}
          {step === 7 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                <Compass size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>7. Evidencia En Contra</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4' }}>
                ¿Qué evidencia objetiva NO lo apoya?
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                ¿Qué hechos contradicen el pensamiento automático? Piensa en cosas que le dirías a un amigo para ayudarlo a ver que su preocupación podría estar exagerada.
              </p>
              <textarea
                value={q7_opposingEvidence}
                onChange={(e) => setQ7(e.target.value)}
                placeholder="Ejemplo: Mi jefe suele tardar en responder porque está en reuniones. En mi evaluación trimestral pasada me calificaron con notas sobresalientes..."
                className="form-textarea"
                rows={4}
                autoFocus
              />
            </div>
          )}

          {/* Pregunta 8 */}
          {step === 8 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                <Brain size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>8. Explicaciones Alternativas</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4' }}>
                ¿Qué otras explicaciones razonables podrían existir?
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                Escribe otras interpretaciones posibles para la situación. ¿Qué otros factores podrían explicar lo ocurrido sin necesidad de que signifique algo catastrófico?
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {q8_alternativeExplanations.map((exp, index) => (
                  <div key={index} className="dynamic-list-item">
                    <input
                      type="text"
                      value={exp}
                      onChange={(e) => handleExplanationChange(index, e.target.value)}
                      placeholder={`Explicación alternativa ${index + 1}`}
                      className="form-input"
                      autoFocus={index === q8_alternativeExplanations.length - 1 && index > 0}
                    />
                    {q8_alternativeExplanations.length > 1 && (
                      <button 
                        onClick={() => handleRemoveExplanation(index)}
                        className="btn btn-secondary" 
                        style={{ padding: '12px', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.1)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddExplanation}
                className="btn btn-secondary"
                style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 16px' }}
              >
                <Plus size={14} />
                Agregar Otra Explicación
              </button>
            </div>
          )}

          {/* Pregunta 9 */}
          {step === 9 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                <Compass size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>9. Pensamiento Equilibrado</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4' }}>
                ¿Cuál parece ser la explicación más equilibrada?
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                Considerando la evidencia a favor y en contra y las explicaciones alternativas: redacta un pensamiento nuevo, más matizado, realista y compasivo.
              </p>
              <textarea
                value={q9_balancedExplanation}
                onChange={(e) => setQ9(e.target.value)}
                placeholder="Ejemplo: Aunque me da algo de ansiedad no recibir respuesta, mi jefe probablemente está ocupado. No hay motivos reales para creer que me van a despedir..."
                className="form-textarea"
                rows={4}
                autoFocus
              />
            </div>
          )}

          {/* Pregunta 10 */}
          {step === 10 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                <CheckCircle2 size={20} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>10. Integración del Aprendizaje</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4' }}>
                ¿Qué aprendiste hoy?
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                ¿Qué te enseña este ejercicio sobre tus pensamientos y emociones automáticas? ¿Cómo te ayuda esta reflexión a afrontar situaciones similares en el futuro?
              </p>
              <textarea
                value={q10_whatLearned}
                onChange={(e) => setQ10(e.target.value)}
                placeholder="Ejemplo: He aprendido que tiendo a asumir el peor de los casos de inmediato ante la falta de comunicación de otras personas..."
                className="form-textarea"
                rows={4}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Botones de Navegación */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setStep(prev => Math.max(prev - 1, 1))}
            disabled={step === 1}
            className="btn btn-secondary"
            style={{ display: step === 1 ? 'none' : 'flex' }}
          >
            <ArrowLeft size={16} />
            Anterior
          </button>
          
          <div style={{ marginLeft: 'auto' }}>
            {step < 10 ? (
              <button
                onClick={() => setStep(prev => prev + 1)}
                disabled={!isStepValid()}
                className="btn btn-primary"
              >
                Siguiente
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!isStepValid() || loading}
                className="btn btn-success"
              >
                {loading ? 'Guardando...' : 'Guardar Registro'}
                <CheckCircle2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
export default NewRecord;
