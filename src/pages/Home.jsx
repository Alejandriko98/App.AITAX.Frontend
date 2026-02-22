import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, TrendingUp, FileText, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import UploadZone from '@/components/UploadZone';
import StatsCard from '@/components/StatsCard';
import ResultsTable from '@/components/ResultsTable';
import VIESInfo from '@/components/VIESInfo';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleFileValidated = async (data, name) => {
    setIsProcessing(true);
    setFileName(name);
    
    try {
      const response = await base44.functions.invoke('analyzeVAT', {
        rows: data,
        fileName: name
      });

      if (response.data && response.data.results) {
        setResults(response.data.results);
        setSummary(response.data.summary);
        setAnalysisComplete(true);
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (error) {
      console.error('Error al analizar:', error);
      alert('Error al analizar el archivo: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysisComplete(false);
    setResults([]);
    setSummary(null);
    setFileName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">AITAX</h1>
                <p className="text-xs text-gray-500">Validador IVA Intracomunitario</p>
              </div>
            </div>
            
            {analysisComplete && (
              <Button
                onClick={resetAnalysis}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="w-4 h-4" />
                Corregir y volver a analizar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!analysisComplete ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Hero Section */}
              <div className="text-center max-w-2xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
                    <Shield className="w-4 h-4" />
                    MVP v1.0
                  </span>
                  <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
                    Detecta riesgos fiscales
                    <br />
                    <span className="text-blue-600">en segundos</span>
                  </h2>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Analiza tus ventas transfronterizas UE y detecta 
                    incoherencias en el tratamiento del IVA de forma automática.
                  </p>
                </motion.div>
              </div>

              {/* Upload Zone */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <UploadZone 
                  onFileValidated={handleFileValidated}
                  isProcessing={isProcessing}
                />
              </motion.div>

              {/* How it works */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8"
              >
                {[
                  { 
                    step: '01', 
                    title: 'Sube tu CSV', 
                    desc: 'Con tus operaciones de venta intracomunitarias' 
                  },
                  { 
                    step: '02', 
                    title: 'Análisis automático', 
                    desc: 'Motor de 8 reglas fiscales aplicadas a cada fila' 
                  },
                  { 
                    step: '03', 
                    title: 'Resultados claros', 
                    desc: 'Visualiza riesgos, impacto y descarga el informe' 
                  }
                ].map((item, i) => (
                  <div key={item.step} className="relative">
                    <div className="text-center">
                      <span className="text-5xl font-bold text-gray-100">{item.step}</span>
                      <h3 className="text-lg font-semibold text-gray-900 -mt-4">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-2">{item.desc}</p>
                    </div>
                    {i < 2 && (
                      <ArrowRight className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 text-gray-200" />
                    )}
                  </div>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Results Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Resultados del análisis</h2>
                  <p className="text-gray-500 mt-1">
                    {fileName} · {summary?.total_rows} operaciones analizadas
                  </p>
                </div>
              </div>

              {/* Process explanation */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border border-blue-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Importante:</strong> AITAX analiza tus datos, pero las correcciones deben hacerse siempre en tu sistema de origen para mantener coherencia fiscal y trazabilidad.
                  </p>
                  <VIESInfo />
                </div>
              </motion.div>

              {/* Stats Cards */}
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatsCard
                    title="Total operaciones"
                    value={summary.total_rows}
                    icon={FileText}
                    color="blue"
                    delay={0}
                  />
                  <StatsCard
                    title="Riesgo alto"
                    value={summary.high_risk}
                    subtitle={summary.high_risk > 0 ? "Requiere atención" : "Todo correcto"}
                    icon={AlertTriangle}
                    color="red"
                    delay={0.1}
                  />
                  <StatsCard
                    title="Riesgo medio"
                    value={summary.medium_risk}
                    icon={AlertTriangle}
                    color="amber"
                    delay={0.2}
                  />
                  <StatsCard
                    title="Impacto estimado"
                    value={`€${summary.total_impact?.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}
                    subtitle="Potencial regularización"
                    icon={TrendingUp}
                    color="red"
                    delay={0.3}
                  />
                </div>
              )}

              {/* Results Table */}
              <ResultsTable results={results} fileName={fileName} />

              {/* Disclaimer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-amber-50 border border-amber-200 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold">
                      AITAX detecta riesgos frecuentes. No sustituye asesoramiento fiscal.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>AITAX · Validador de riesgo IVA intracomunitario</span>
            </div>
            <div className="max-w-2xl text-center text-xs text-gray-400 leading-relaxed">
              <p className="mb-2">
                <strong className="text-gray-600">Aviso legal completo:</strong>
              </p>
              <p>
                AITAX detecta incoherencias fiscales frecuentes basadas en datos proporcionados por el usuario.
                Esta herramienta utiliza un conjunto limitado de reglas de validación y no constituye una auditoría fiscal completa.
                No sustituye asesoramiento profesional. Los resultados son orientativos y deben ser revisados por un experto fiscal
                antes de tomar decisiones basadas en ellos. AITAX no se responsabiliza de las consecuencias derivadas del uso de esta información.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}