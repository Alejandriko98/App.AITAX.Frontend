import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, AlertCircle, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

const REQUIRED_COLUMNS = [
  'seller_country',
  'customer_country', 
  'customer_vat_number',
  'invoice_date',
  'net_amount',
  'vat_applied_percent'
];

const MAX_FILE_SIZE_MB = 5;
const MAX_ROWS = 500;

const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

export default function UploadZone({ onFileValidated, isProcessing }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [validationStatus, setValidationStatus] = useState(null);

  const downloadTemplate = () => {
    const data = [
      REQUIRED_COLUMNS,
      ['ES', 'DE', 'DE123456789', '2024-01-15', 1500.00, 0],
      ['ES', 'FR', '', '2024-01-16', 250.00, 21],
      ['ES', 'ES', 'ESB12345678', '2024-01-17', 800.00, 21],
      ['ES', 'US', '', '2024-01-18', 500.00, 0]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, 'aitax_template.xlsx');
  };

  const validateCSV = useCallback((content, fileName) => {
    // Remove BOM if present
    content = content.replace(/^\uFEFF/, '');
    
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return { valid: false, error: 'El archivo debe contener al menos una cabecera y una fila de datos' };
    }

    // Parse headers - remove quotes, trim, lowercase
    const headers = lines[0].split(',').map(h => 
      h.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/\r/g, '')
    );
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      return { 
        valid: false, 
        error: `Faltan columnas obligatorias: ${missingColumns.join(', ')}` 
      };
    }

    const data = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = lines[i].split(',').map(v => 
        v.trim().replace(/^["']|["']$/g, '').replace(/\r/g, '')
      );
      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      data.push({
        ...row,
        net_amount: parseFloat(row.net_amount) || 0,
        vat_applied_percent: row.vat_applied_percent === '' ? null : parseFloat(row.vat_applied_percent) || 0,
        row_number: i
      });
    }

    if (errors.length > 0 && errors.length <= 5) {
      return { valid: false, error: errors.join('\n') };
    } else if (errors.length > 5) {
      return { valid: false, error: `${errors.slice(0, 5).join('\n')}\n...y ${errors.length - 5} errores más` };
    }

    // Check row limit
    if (data.length > MAX_ROWS) {
      return { 
        valid: false, 
        error: `El archivo contiene ${data.length} filas, pero el límite es de ${MAX_ROWS} operaciones. Por favor, divide el archivo en partes más pequeñas.` 
      };
    }

    return { valid: true, data, headers };
  }, []);

  const handleFile = useCallback((uploadedFile) => {
    setError(null);
    setValidationStatus(null);

    if (!uploadedFile) return;

    // Check file size
    const fileSizeMB = uploadedFile.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setError(`El archivo supera el límite de ${MAX_FILE_SIZE_MB}MB. Por favor, reduce el tamaño del archivo o divídelo en varios archivos más pequeños.`);
      return;
    }

    const fileExtension = uploadedFile.name.split('.').pop().toLowerCase();
    
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      setError('Por favor sube un archivo CSV o Excel (.xlsx, .xls)');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        let content;
        
        if (fileExtension === 'csv') {
          content = e.target.result;
        } else {
          // Parse Excel file
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          content = XLSX.utils.sheet_to_csv(firstSheet);
        }
        
        const validation = validateCSV(content, uploadedFile.name);
        
        if (!validation.valid) {
          setError(validation.error);
          setFile(null);
        } else {
          setFile(uploadedFile);
          setValidationStatus({ rows: validation.data.length });
          onFileValidated(validation.data, uploadedFile.name);
        }
      } catch (err) {
        setError('Error al procesar el archivo: ' + err.message);
        setFile(null);
      }
    };
    
    if (fileExtension === 'csv') {
      reader.readAsText(uploadedFile);
    } else {
      reader.readAsArrayBuffer(uploadedFile);
    }
  }, [validateCSV, onFileValidated]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    handleFile(selectedFile);
  }, [handleFile]);

  const clearFile = () => {
    setFile(null);
    setValidationStatus(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Download Template Button */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex justify-center"
      >
        <Button
          variant="outline"
          onClick={downloadTemplate}
          className="gap-2 text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all"
        >
          <Download className="w-4 h-4" />
          Descargar plantilla Excel
        </Button>
      </motion.div>

      {/* Drop Zone */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' 
            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/50'
          }
          ${error ? 'border-red-300 bg-red-50/30' : ''}
          ${validationStatus ? 'border-green-300 bg-green-50/30' : ''}
        `}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />

        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
              <p className="text-gray-600 font-medium">Analizando operaciones...</p>
            </motion.div>
          ) : validationStatus ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold">{file?.name}</p>
                <p className="text-gray-500 text-sm mt-1">{validationStatus.rows} operaciones detectadas</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4 mr-1" /> Cambiar archivo
              </Button>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="text-red-700 font-medium">Error de validación</p>
                <p className="text-red-600 text-sm mt-2 whitespace-pre-line max-w-md">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className="text-gray-500 hover:text-gray-700"
              >
                Intentar de nuevo
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div 
                animate={{ y: isDragging ? -5 : 0 }}
                className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center"
              >
                <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-blue-600' : 'text-blue-400'}`} />
              </motion.div>
              <div>
                <p className="text-gray-900 font-semibold">
                  {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo CSV o Excel'}
                </p>
                <p className="text-gray-500 text-sm mt-1">o haz clic para seleccionar (.csv, .xlsx, .xls)</p>
                <p className="text-gray-400 text-xs mt-2">Límite: {MAX_ROWS} filas • {MAX_FILE_SIZE_MB}MB máx.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Format hint */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100"
      >
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-2">
              AITAX analiza archivos con una estructura concreta para garantizar resultados fiables.
            </p>
            <p className="text-blue-800">
              Descarga la plantilla y copia tus datos antes de subir el archivo.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}