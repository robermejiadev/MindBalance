import React, { useState } from 'react';
import {
  X,
  Save,
  Calendar,
  Clock,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import type { CbtRecord } from '../../services';
import { toPeruDateTimeLocal, fromPeruDateTimeLocalToISO, formatPeruLongDateTime } from '../../utils/dateUtils';

interface EditRecordModalProps {
  record: CbtRecord;
  onClose: () => void;
  onSave: (updatedRecord: CbtRecord) => Promise<void>;
}

type EmotionKey = 'ansiedad' | 'miedo' | 'tristeza' | 'molestia' | 'verguenza' | 'enojo';

export const EditRecordModal: React.FC<EditRecordModalProps> = ({ record, onClose, onSave }) => {
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State initialized from record
  const [dateTimeLocal, setDateTimeLocal] = useState(() => toPeruDateTimeLocal(record.date));
  const [q1_whatHappened, setQ1] = useState(record.q1_whatHappened || '');
  const [q2_directObservation, setQ2] = useState<string[]>(record.q2_directObservation || []);
  const [q3_automaticThought, setQ3] = useState(record.q3_automaticThought || '');
  const [q4_emotions, setQ4] = useState<Record<EmotionKey, number>>({
    ansiedad: record.q4_emotions?.ansiedad ?? 0,
    miedo: record.q4_emotions?.miedo ?? 0,
    tristeza: record.q4_emotions?.tristeza ?? 0,
    molestia: record.q4_emotions?.molestia ?? 0,
    verguenza: record.q4_emotions?.verguenza ?? 0,
    enojo: record.q4_emotions?.enojo ?? 0,
  });
  const [q5_intensity, setQ5] = useState(record.q5_intensity ?? 50);
  const [q6_supportingEvidence, setQ6] = useState(record.q6_supportingEvidence || '');
  const [q7_opposingEvidence, setQ7] = useState(record.q7_opposingEvidence || '');
  const [q8_alternativeExplanations, setQ8] = useState<string[]>(
    record.q8_alternativeExplanations && record.q8_alternativeExplanations.length > 0
      ? record.q8_alternativeExplanations
      : ['']
  );
  const [q9_balancedExplanation, setQ9] = useState(record.q9_balancedExplanation || '');
  const [q10_whatLearned, setQ10] = useState(record.q10_whatLearned || '');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q1_whatHappened.trim()) {
      setErrorMessage('La situación (pregunta 1) no puede quedar vacía.');
      return;
    }
    if (!q3_automaticThought.trim()) {
      setErrorMessage('El pensamiento automático (pregunta 3) no puede quedar vacío.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const filteredExplanations = q8_alternativeExplanations
        .map(e => e.trim())
        .filter(e => e.length > 0);

      const isoDate = fromPeruDateTimeLocalToISO(dateTimeLocal);

      const updatedRecord: CbtRecord = {
        ...record,
        date: isoDate,
        q1_whatHappened: q1_whatHappened.trim(),
        q2_directObservation,
        q3_automaticThought: q3_automaticThought.trim(),
        q4_emotions,
        q5_intensity,
        q6_supportingEvidence: q6_supportingEvidence.trim(),
        q7_opposingEvidence: q7_opposingEvidence.trim(),
        q8_alternativeExplanations: filteredExplanations.length > 0 ? filteredExplanations : ['Ninguna otra explicación identificada'],
        q9_balancedExplanation: q9_balancedExplanation.trim(),
        q10_whatLearned: q10_whatLearned.trim()
      };

      await onSave(updatedRecord);
      onClose();
    } catch (err: any) {
      console.error('Error al actualizar registro:', err);
      setErrorMessage(err.message || 'Error al actualizar el registro. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 120 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Cabecera del Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Editar Registro de Pensamiento TCC
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Modifica las respuestas o la fecha/hora según la zona horaria de Perú (UTC-5).
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #EF4444',
            borderRadius: '8px',
            color: '#EF4444',
            marginBottom: '20px',
            fontSize: '0.9rem'
          }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECCIÓN FECHA Y HORA (PERÚ) */}
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
              <label htmlFor="edit-record-datetime" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Fecha y Hora del Registro (Zona Horaria Perú - UTC-5)
              </label>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <input
                id="edit-record-datetime"
                type="datetime-local"
                value={dateTimeLocal}
                onChange={(e) => setDateTimeLocal(e.target.value)}
                className="form-input"
                style={{ maxWidth: '280px', fontWeight: 500 }}
                required
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} />
                {dateTimeLocal ? formatPeruLongDateTime(fromPeruDateTimeLocalToISO(dateTimeLocal)) : ''}
              </span>
            </div>
          </div>

          {/* 1. SITUACIÓN */}
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              1. Situación (¿Qué ocurrió?) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              className="form-input"
              rows={3}
              value={q1_whatHappened}
              onChange={(e) => setQ1(e.target.value)}
              placeholder="Describe objetivamente lo que ocurrió..."
              required
            />
          </div>

          {/* 2. OBSERVACIONES DIRECTAS */}
          <div>
            <label className="form-label" style={{ fontWeight: 600, marginBottom: '8px' }}>
              2. Observaciones Directas (Hechos verificables)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {observationOptions.map((opt) => (
                <label 
                  key={opt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: q2_directObservation.includes(opt) ? 'var(--accent-primary-light)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.15s'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={q2_directObservation.includes(opt)}
                    onChange={() => handleCheckboxToggle(opt)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 3. PENSAMIENTO AUTOMÁTICO */}
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              3. Pensamiento Automático <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              className="form-input"
              rows={2}
              value={q3_automaticThought}
              onChange={(e) => setQ3(e.target.value)}
              placeholder="¿Qué pensamiento automático vino a tu mente?"
              required
            />
          </div>

          {/* 4. EMOCIONES */}
          <div>
            <label className="form-label" style={{ fontWeight: 600, marginBottom: '8px' }}>
              4. Emociones sentidas (0 a 100%)
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '14px',
              backgroundColor: 'var(--bg-primary)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              {(Object.keys(q4_emotions) as EmotionKey[]).map((emo) => (
                <div key={emo} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600, color: emotionColors[emo] }}>
                      {emo}
                    </span>
                    <span style={{ fontWeight: 700 }}>{q4_emotions[emo]}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={q4_emotions[emo]}
                    onChange={(e) => handleEmotionChange(emo, Number(e.target.value))}
                    style={{ accentColor: emotionColors[emo], width: '100%', cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 5. INTENSIDAD GENERAL */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                5. Nivel de Malestar / Intensidad General:
              </label>
              <span style={{ fontWeight: 700, color: q5_intensity > 70 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                {q5_intensity}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={q5_intensity}
              onChange={(e) => setQ5(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* 6. EVIDENCIA A FAVOR */}
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              6. Evidencia A Favor del Pensamiento
            </label>
            <textarea
              className="form-input"
              rows={2}
              value={q6_supportingEvidence}
              onChange={(e) => setQ6(e.target.value)}
              placeholder="¿Qué hechos objetivos respaldan tu pensamiento?"
            />
          </div>

          {/* 7. EVIDENCIA EN CONTRA */}
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              7. Evidencia En Contra del Pensamiento
            </label>
            <textarea
              className="form-input"
              rows={2}
              value={q7_opposingEvidence}
              onChange={(e) => setQ7(e.target.value)}
              placeholder="¿Qué hechos objetivos contradicen tu pensamiento?"
            />
          </div>

          {/* 8. EXPLICACIONES ALTERNATIVAS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                8. Explicaciones Alternativas
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddExplanation}
                style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Añadir otra
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {q8_alternativeExplanations.map((exp, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={exp}
                    onChange={(e) => handleExplanationChange(idx, e.target.value)}
                    placeholder={`Explicación alternativa ${idx + 1}...`}
                  />
                  {q8_alternativeExplanations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExplanation(idx)}
                      className="btn btn-secondary"
                      style={{ padding: '8px', color: '#EF4444' }}
                      title="Eliminar esta explicación"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 9. PENSAMIENTO EQUILIBRADO */}
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              9. Pensamiento Equilibrado / Reestructurado
            </label>
            <textarea
              className="form-input"
              rows={2}
              value={q9_balancedExplanation}
              onChange={(e) => setQ9(e.target.value)}
              placeholder="Una forma más justa, objetiva y amable de ver lo ocurrido..."
            />
          </div>

          {/* 10. APRENDIZAJE CLAVE */}
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>
              10. Aprendizaje Clave
            </label>
            <textarea
              className="form-input"
              rows={2}
              value={q10_whatLearned}
              onChange={(e) => setQ10(e.target.value)}
              placeholder="¿Qué lección te deja haber reflexionado sobre esto?"
            />
          </div>

          {/* ACCIONES DEL FORMULARIO */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '20px',
            marginTop: '10px'
          }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} />
              {saving ? 'Guardando cambios...' : 'Guardar Cambios'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
export default EditRecordModal;
