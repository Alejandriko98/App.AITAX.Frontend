import React from 'react';
import { Shield, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function VIESInfo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-gray-500 hover:text-gray-700">
          <Info className="w-4 h-4" />
          ¿Cómo se validan los NIF/VAT?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Validación de NIF/VAT intracomunitarios
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            <strong>AITAX valida los NIF/VAT intracomunitarios utilizando VIES</strong>, 
            el sistema oficial de la Comisión Europea.
          </p>
          
          <p>
            Si un número no está registrado en VIES, la operación no puede tratarse como B2B intracomunitaria.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <p className="font-semibold text-green-700 mb-1">✓ Válido en VIES</p>
              <p className="text-xs text-gray-600">
                El NIF/VAT está registrado como operador intracomunitario. 
                La operación puede tratarse como B2B con inversión del sujeto pasivo.
              </p>
            </div>

            <div>
              <p className="font-semibold text-red-700 mb-1">✗ No válido en VIES</p>
              <p className="text-xs text-gray-600">
                El NIF/VAT no figura en el registro. La operación debe tratarse como B2C 
                con IVA del país de destino.
              </p>
            </div>

            <div>
              <p className="font-semibold text-amber-700 mb-1">⚠ No verificado</p>
              <p className="text-xs text-gray-600">
                El servicio VIES no pudo verificar el número en este momento. 
                Recomendamos revisar manualmente antes de procesar como B2B.
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 border-t border-gray-200 pt-3">
            VIES (VAT Information Exchange System) es el sistema oficial de verificación 
            de números de IVA de la Unión Europea mantenido por la Comisión Europea.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}