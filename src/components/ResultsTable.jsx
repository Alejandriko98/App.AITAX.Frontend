import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Filter, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import RiskBadge from './RiskBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ResultsTable({ results, fileName }) {
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortField, setSortField] = useState('row_number');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedRow, setSelectedRow] = useState(null);

  const filteredResults = useMemo(() => {
    let filtered = [...results];
    
    if (riskFilter !== 'all') {
      filtered = filtered.filter(r => r.risk_level === riskFilter);
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [results, riskFilter, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const downloadResults = () => {
    const today = new Date().toISOString().split('T')[0];

    // Información inicial
    const infoLine = '"Informe generado por AITAX - Validador de riesgo IVA intracomunitario. Detecta incoherencias frecuentes basadas en los datos proporcionados. No sustituye asesoramiento fiscal profesional."';

    // Headers en español (cliente-facing)
    const headers = [
      'País vendedor',
      'País cliente',
      'NIF/VAT cliente',
      'Fecha operación',
      'Importe neto (€)',
      'IVA aplicado (%)',
      'Nivel de riesgo',
      'Motivo del riesgo',
      'Impacto estimado (€)'
    ];

    const riskLevelMap = {
      'ALTO': 'Alto',
      'MEDIO': 'Medio',
      'BAJO': 'Sin riesgo'
    };

    const rows = filteredResults.map(row => {
      const impactValue = row.impact_estimate > 0 
        ? row.impact_estimate.toFixed(2)
        : '—';

      return [
        row.seller_country,
        row.customer_country,
        row.customer_vat_number || '—',
        row.invoice_date,
        row.net_amount?.toFixed(2) || '0.00',
        row.vat_applied_percent,
        riskLevelMap[row.risk_level] || row.risk_level,
        row.error_type || 'Sin anomalías detectadas',
        impactValue
      ].map(val => {
        const strVal = String(val);
        return strVal.includes(',') || strVal.includes('"') ? `"${strVal.replace(/"/g, '""')}"` : strVal;
      }).join(',');
    });

    const csvContent = [
      infoLine,
      '',
      headers.join(','),
      ...rows
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AITAX_resultados_IVA_intracomunitario_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />;
  };

  const riskCounts = useMemo(() => ({
    all: results.length,
    ALTO: results.filter(r => r.risk_level === 'ALTO').length,
    MEDIO: results.filter(r => r.risk_level === 'MEDIO').length,
    BAJO: results.filter(r => r.risk_level === 'BAJO').length
  }), [results]);

  return (
    <div className="w-full">
      {/* Filters and Actions */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6"
      >
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por riesgo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({riskCounts.all})</SelectItem>
              <SelectItem value="ALTO">Alto riesgo ({riskCounts.ALTO})</SelectItem>
              <SelectItem value="MEDIO">Riesgo medio ({riskCounts.MEDIO})</SelectItem>
              <SelectItem value="BAJO">Sin riesgo ({riskCounts.BAJO})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={downloadResults}
          variant="outline"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Descargar resultados
        </Button>
      </motion.div>

      {/* Table */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th 
                  onClick={() => handleSort('row_number')}
                  className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    # <SortIcon field="row_number" />
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Países
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  NIF/VAT
                </th>
                <th 
                  onClick={() => handleSort('net_amount')}
                  className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Importe <SortIcon field="net_amount" />
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  IVA
                </th>
                <th 
                  onClick={() => handleSort('risk_level')}
                  className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Riesgo <SortIcon field="risk_level" />
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Motivo
                </th>
                <th 
                  onClick={() => handleSort('impact_estimate')}
                  className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Impacto <SortIcon field="impact_estimate" />
                    <Popover>
                      <PopoverTrigger asChild>
                        <button 
                          className="inline-flex items-center" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-gray-600" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="max-w-xs bg-gray-900 text-white p-3 border-gray-800">
                        <p className="text-sm leading-relaxed">El impacto económico no se calcula cuando no puede determinarse con certeza la corrección del IVA.</p>
                      </PopoverContent>
                    </Popover>
                  </div>
                </th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Info
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filteredResults.map((row, index) => (
                  <motion.tr
                    key={row.row_number}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-4 text-sm text-gray-500 font-mono">
                      {row.row_number}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-sm">
                        <span className="font-medium text-gray-900">{row.seller_country}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-gray-900">{row.customer_country}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {row.customer_vat_number ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-mono ${
                            row.vat_status === 'VALID' ? 'text-green-600' : 
                            row.vat_status === 'INVALID' ? 'text-red-600' : 
                            'text-amber-600'
                          }`}>
                            {row.customer_vat_number}
                          </span>
                          {row.vat_status === 'VALID' && (
                            <span className="text-xs text-green-600" title="Validado en VIES">✓</span>
                          )}
                          {row.vat_status === 'INVALID' && (
                            <span className="text-xs text-red-600" title="No válido en VIES">✗</span>
                          )}
                          {row.vat_status === 'NOT_VERIFIED' && (
                            <span className="text-xs text-amber-600" title="No verificado">⚠</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      €{row.net_amount?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {row.vat_applied_percent}%
                    </td>
                    <td className="px-4 py-4">
                      <RiskBadge level={row.risk_level} size="small" />
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity text-left">
                            <span className="text-gray-700 max-w-[200px] truncate">
                              {row.error_type || 'Sin anomalías detectadas'}
                            </span>
                            <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="max-w-sm bg-gray-900 text-white p-3 border-gray-800">
                          <p className="text-sm leading-relaxed">{row.error_type || 'No se detectan incoherencias según las reglas actuales de AITAX.'}</p>
                        </PopoverContent>
                      </Popover>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-center">
                      {row.impact_estimate > 0 ? (
                        <span className="text-red-600">
                          €{row.impact_estimate?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-gray-400 cursor-help">—</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">El impacto económico no se calcula cuando no puede determinarse con certeza la corrección del IVA.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedRow(row)}
                      >
                        <Info className="w-4 h-4 text-gray-400" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredResults.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            No hay operaciones que coincidan con el filtro seleccionado
          </div>
        )}
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Operación #{selectedRow?.row_number}
              {selectedRow && <RiskBadge level={selectedRow.risk_level} size="small" />}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRow && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">País vendedor</p>
                  <p className="font-medium">{selectedRow.seller_country}</p>
                </div>
                <div>
                  <p className="text-gray-500">País cliente</p>
                  <p className="font-medium">{selectedRow.customer_country}</p>
                </div>
                <div>
                  <p className="text-gray-500">NIF/VAT cliente</p>
                  <p className={`font-mono ${
                    selectedRow.vat_status === 'VALID' ? 'text-green-600' : 
                    selectedRow.vat_status === 'INVALID' ? 'text-red-600' : 
                    selectedRow.vat_status === 'NOT_VERIFIED' ? 'text-amber-600' : 
                    'text-gray-700'
                  }`}>
                    {selectedRow.customer_vat_number || '(vacío)'}
                  </p>
                  {selectedRow.vat_message && (
                    <p className="text-xs text-gray-600 mt-1">
                      {selectedRow.vat_message}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500">Fecha</p>
                  <p className="font-medium">{selectedRow.invoice_date}</p>
                </div>
                <div>
                  <p className="text-gray-500">Importe neto</p>
                  <p className="font-medium">€{selectedRow.net_amount?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-gray-500">IVA aplicado</p>
                  <p className="font-medium">{selectedRow.vat_applied_percent}%</p>
                </div>
              </div>

              {selectedRow.error_type && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-gray-500 text-sm mb-1">Motivo del riesgo</p>
                  <p className="font-medium text-gray-900">{selectedRow.error_type}</p>
                </div>
              )}

              {selectedRow.explanation && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-blue-800 text-sm">{selectedRow.explanation}</p>
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <p className="font-semibold text-gray-900 text-sm mb-2">💡 Qué hacer ahora</p>
                <p className="text-gray-700 text-sm">
                  {selectedRow.risk_level === 'ALTO' || selectedRow.risk_level === 'MEDIO' 
                    ? 'Revisa esta operación en tu sistema de origen (Excel/ERP), corrige el tratamiento del IVA y vuelve a subir el archivo para validar los cambios.'
                    : 'Esta operación no presenta riesgos detectables según las reglas actuales de AITAX. Continúa con tu proceso habitual.'}
                </p>
              </div>

              {selectedRow.impact_estimate > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-red-700 text-sm">
                    <span className="font-semibold">Posible regularización del IVA:</span>{' '}
                    €{selectedRow.impact_estimate?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-red-600 text-xs mt-2 opacity-90">
                    Estimación basada en IVA aplicado incorrectamente. No incluye sanciones ni recargos.
                  </p>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-900 text-xs">
                  <span className="font-semibold">Aviso importante:</span> AITAX detecta incoherencias frecuentes basadas en reglas predefinidas. 
                  No sustituye una auditoría fiscal completa ni asesoramiento profesional. 
                  Revisa siempre con tu asesor fiscal antes de tomar decisiones.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}