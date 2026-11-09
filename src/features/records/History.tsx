import React, { useEffect, useState } from 'react';
import {
  Search,
  Trash2,
  Eye,
  Calendar,
  X,
  ClipboardPen,
  Download,
  FileJson,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { getRepository } from '../../services';
import type { CbtRecord } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { exportToJSON, exportToCSV, exportToPDF } from '../../utils/exportRecords';

export const History: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<CbtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<CbtRecord | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [emotionFilter, setEmotionFilter] = useState<string>('all');
  const [intensityFilter, setIntensityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'intensity-desc'>('date-desc');

  useEffect(() => {
    fetchRecords();
  }, [user]);

  const fetchRecords = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const repo = getRepository();
      const data = await repo.getCbtRecords();
      setRecords(data);
    } catch (error) {
      console.error("Error al cargar registros del historial:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro de tu historial?')) {
      try {
        const repo = getRepository();
        await repo.deleteCbtRecord(id);
        setRecords(prev => prev.filter(r => r.id !== id));
        if (selectedRecord && selectedRecord.id === id) {
          setSelectedRecord(null);
        }
      } catch (error) {
        console.error("Error al eliminar registro:", error);
      }
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    if (filteredRecords.length === 0) return;
    setExporting(true);
    setExportMenuOpen(false);
    try {
      if (format === 'json') exportToJSON(filteredRecords);
      else if (format === 'csv') exportToCSV(filteredRecords);
      else if (format === 'pdf') exportToPDF(filteredRecords);
    } catch (err) {
      console.error('Error al exportar:', err);
    } finally {
      setExporting(false);
    }
  };

  // Filtrado y ordenamiento de registros
  const filteredRecords = records
    .filter(record => {
      // 1. Buscador de texto (situación, pensamiento o aprendizaje)
      const matchesSearch =
        record.q1_whatHappened.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.q3_automaticThought.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.q10_whatLearned.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Filtro por emoción predominante (>30% de intensidad)
      let matchesEmotion = true;
      if (emotionFilter !== 'all') {
        const key = emotionFilter as keyof typeof record.q4_emotions;
        matchesEmotion = record.q4_emotions[key] >= 30;
      }

      // 3. Filtro por intensidad general
      let matchesIntensity = true;
      if (intensityFilter === 'high') {
        matchesIntensity = record.q5_intensity >= 70;
      } else if (intensityFilter === 'medium') {
        matchesIntensity = record.q5_intensity >= 40 && record.q5_intensity < 70;
      } else if (intensityFilter === 'low') {
        matchesIntensity = record.q5_intensity < 40;
      }

      return matchesSearch && matchesEmotion && matchesIntensity;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'intensity-desc') {
        return b.q5_intensity - a.q5_intensity;
      }
      return 0;
    });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        Cargando historial de registros...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Controles de Filtros + Exportar */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>

          {/* Buscador */}
          <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por situación, pensamiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>

          {/* Emoción */}
          <div style={{ minWidth: '150px' }}>
            <select
              value={emotionFilter}
              onChange={(e) => setEmotionFilter(e.target.value)}
              className="form-select"
            >
              <option value="all">Todas las Emociones</option>
              <option value="ansiedad">Ansiedad alta</option>
              <option value="miedo">Miedo alto</option>
              <option value="tristeza">Tristeza alta</option>
              <option value="molestia">Molestia alta</option>
              <option value="verguenza">Vergüenza alta</option>
              <option value="enojo">Enojo alto</option>
            </select>
          </div>

          {/* Intensidad */}
          <div style={{ minWidth: '150px' }}>
            <select
              value={intensityFilter}
              onChange={(e) => setIntensityFilter(e.target.value)}
              className="form-select"
            >
              <option value="all">Cualquier Intensidad</option>
              <option value="high">Intensidad Alta (≥ 70)</option>
              <option value="medium">Intensidad Media (40 - 69)</option>
              <option value="low">Intensidad Baja (&lt; 40)</option>
            </select>
          </div>

          {/* Ordenar */}
          <div style={{ minWidth: '150px' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date-desc' | 'date-asc' | 'intensity-desc')}
              className="form-select"
            >
              <option value="date-desc">Fecha: Más reciente</option>
              <option value="date-asc">Fecha: Más antiguo</option>
              <option value="intensity-desc">Intensidad: Mayor a menor</option>
            </select>
          </div>

          {/* Botón Exportar */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-primary"
              onClick={() => setExportMenuOpen(prev => !prev)}
              disabled={exporting || filteredRecords.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
            >
              <Download size={16} />
              {exporting ? 'Exportando...' : `Exportar (${filteredRecords.length})`}
            </button>

            {/* Dropdown menú */}
            {exportMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  zIndex: 100,
                  minWidth: '200px',
                  overflow: 'hidden',
                }}
              >
                {/* Header del menú */}
                <div style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Formato de exportación
                </div>

                {/* Opción JSON */}
                <button
                  onClick={() => handleExport('json')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <FileJson size={16} color="#D97706" />
                  </span>
                  <div>
                    <div style={{ fontWeight: 600 }}>JSON</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Backup completo de datos</div>
                  </div>
                </button>

                {/* Opción CSV */}
                <button
                  onClick={() => handleExport('csv')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <FileSpreadsheet size={16} color="#16A34A" />
                  </span>
                  <div>
                    <div style={{ fontWeight: 600 }}>CSV</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Compatible con Excel / Sheets</div>
                  </div>
                </button>

                {/* Opción PDF */}
                <button
                  onClick={() => handleExport('pdf')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <FileText size={16} color="#7C3AED" />
                  </span>
                  <div>
                    <div style={{ fontWeight: 600 }}>PDF</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reporte profesional detallado</div>
                  </div>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Listado de Registros */}
      {filteredRecords.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredRecords.map((record) => {
            const dateObj = new Date(record.date);
            const weekdayStr = dateObj.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
            const dayStr = dateObj.toLocaleDateString('es-ES', { day: 'numeric' });

            return (
              <div
                key={record.id}
                className="card fade-in"
                onClick={() => setSelectedRecord(record)}
                style={{
                  cursor: 'pointer',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: 0 }}>

                  {/* Badge de Fecha */}
                  <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {weekdayStr}
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '-2px' }}>
                      {dayStr}
                    </span>
                  </div>

                  {/* Detalle Breve */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {record.q1_whatHappened}
                    </p>
                    <p style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      Pensamiento: "{record.q3_automaticThought}"
                    </p>
                  </div>

                </div>

                {/* Badge de Intensidad y Acciones */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    backgroundColor: record.q5_intensity > 70 ? 'var(--accent-warning-light)' : 'var(--accent-success-light)',
                    color: record.q5_intensity > 70 ? 'var(--accent-warning)' : 'var(--accent-success)'
                  }}>
                    {record.q5_intensity}%
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '8px' }}
                      title="Ver Detalles"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(record.id, e)}
                      className="btn btn-secondary"
                      style={{ padding: '8px', color: '#EF4444' }}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <ClipboardPen size={48} strokeWidth={1.5} style={{ marginBottom: '16px', color: 'var(--text-muted)' }} />
          <h3>No se encontraron registros</h3>
          <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>
            Prueba a cambiar los filtros o agrega un nuevo registro de pensamiento TCC para comenzar.
          </p>
        </div>
      )}

      {/* Modal de Detalle */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedRecord(null)}>
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                Registro del {new Date(selectedRecord.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  1. Situación (¿Qué ocurrió?)
                </h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  {selectedRecord.q1_whatHappened}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  2. Observaciones Directas (Hechos)
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                  {selectedRecord.q2_directObservation.map((obs) => (
                    <span key={obs} style={{
                      fontSize: '0.8rem',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)'
                    }}>
                      {obs}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  3. Pensamiento Automático
                </h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: '1.5' }}>
                  "{selectedRecord.q3_automaticThought}"
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  4. Emociones e Intensidad
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '12px',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  {Object.entries(selectedRecord.q4_emotions).map(([key, val]) => {
                    if (val === 0) return null;
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{key}:</span>
                        <span style={{ fontWeight: 600 }}>{val}%</span>
                      </div>
                    );
                  })}
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                    <span>Malestar General:</span>
                    <span style={{ color: selectedRecord.q5_intensity > 70 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                      {selectedRecord.q5_intensity}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  6. Evidencia A Favor del Pensamiento
                </h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  {selectedRecord.q6_supportingEvidence}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  7. Evidencia En Contra del Pensamiento
                </h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  {selectedRecord.q7_opposingEvidence}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  8. Explicaciones Alternativas
                </h4>
                <ul style={{ paddingLeft: '20px', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedRecord.q8_alternativeExplanations.map((exp, idx) => (
                    <li key={idx} style={{ lineHeight: '1.4' }}>{exp}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  9. Pensamiento Equilibrado
                </h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: '1.5', backgroundColor: 'var(--accent-primary-light)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)' }}>
                  {selectedRecord.q9_balancedExplanation}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  10. Aprendizaje Clave
                </h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  {selectedRecord.q10_whatLearned}
                </p>
              </div>

            </div>

            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={(e) => {
                  handleDelete(selectedRecord.id, e);
                }}
                className="btn btn-secondary"
                style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <Trash2 size={16} />
                Eliminar Registro
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="btn btn-primary"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-away para cerrar el menú de exportación */}
      {exportMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setExportMenuOpen(false)}
        />
      )}

    </div>
  );
};
export default History;
