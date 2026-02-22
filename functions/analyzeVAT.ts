import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// Standard VAT rates by country (simplified for MVP)
const VAT_RATES = {
  'AT': [20, 13, 10, 0],
  'BE': [21, 12, 6, 0],
  'BG': [20, 9, 0],
  'HR': [25, 13, 5, 0],
  'CY': [19, 9, 5, 0],
  'CZ': [21, 15, 10, 0],
  'DK': [25, 0],
  'EE': [22, 9, 0],
  'FI': [24, 14, 10, 0],
  'FR': [20, 10, 5.5, 2.1, 0],
  'DE': [19, 7, 0],
  'GR': [24, 13, 6, 0],
  'HU': [27, 18, 5, 0],
  'IE': [23, 13.5, 9, 4.8, 0],
  'IT': [22, 10, 5, 4, 0],
  'LV': [21, 12, 5, 0],
  'LT': [21, 9, 5, 0],
  'LU': [17, 14, 8, 3, 0],
  'MT': [18, 7, 5, 0],
  'NL': [21, 9, 0],
  'PL': [23, 8, 5, 0],
  'PT': [23, 13, 6, 0],
  'RO': [19, 9, 5, 0],
  'SK': [20, 10, 0],
  'SI': [22, 9.5, 5, 0],
  'ES': [21, 10, 4, 0],
  'SE': [25, 12, 6, 0]
};

// Validate VAT number using VIES API Checker as infrastructure layer
async function validateVAT(vatNumber) {
  if (!vatNumber || vatNumber.trim() === '') {
    return { valid: false, status: 'INVALID', reason: 'empty', message: 'NIF/VAT no proporcionado' };
  }

  const cleanVAT = vatNumber.replace(/\s/g, '').toUpperCase();
  const countryCode = cleanVAT.substring(0, 2);
  const vatNumberOnly = cleanVAT.substring(2);
  
  if (!EU_COUNTRIES.includes(countryCode)) {
    return { valid: false, status: 'INVALID', reason: 'non_eu_prefix', message: 'El NIF/VAT no figura como operador intracomunitario en VIES.' };
  }

  // Use VIES API Checker as infrastructure layer for stability and error handling
  try {
    const response = await fetch(
      `https://api.viesapi.eu/api/check/${countryCode}/${vatNumberOnly}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      
      // Map VIES API Checker response to our business logic states
      if (data.valid === true) {
        return { 
          valid: true, 
          status: 'VALID', 
          countryCode, 
          message: 'NIF/VAT validado correctamente en VIES.' 
        };
      } else if (data.valid === false) {
        return { 
          valid: false, 
          status: 'INVALID', 
          countryCode, 
          message: 'El NIF/VAT no figura como operador intracomunitario en VIES.' 
        };
      } else {
        // VIES couldn't verify (service unavailable, timeout, etc.)
        return { 
          valid: false, 
          status: 'NOT_VERIFIED', 
          countryCode, 
          message: 'No ha sido posible validar el NIF/VAT en VIES en este momento.' 
        };
      }
    } else {
      // API error
      return { 
        valid: false, 
        status: 'NOT_VERIFIED', 
        countryCode, 
        message: 'No ha sido posible validar el NIF/VAT en VIES en este momento.' 
      };
    }
  } catch (error) {
    // Network error
    return { 
      valid: false, 
      status: 'NOT_VERIFIED', 
      countryCode, 
      message: 'No ha sido posible validar el NIF/VAT en VIES en este momento.' 
    };
  }
}

function isEUCountry(countryCode) {
  return EU_COUNTRIES.includes(countryCode?.toUpperCase());
}

function isValidVATRate(countryCode, rate) {
  const rates = VAT_RATES[countryCode?.toUpperCase()];
  if (!rates) return true; // Unknown country, don't flag
  return rates.includes(rate);
}

async function analyzeRow(row, allRows) {
  const result = {
    ...row,
    risk_level: 'BAJO',
    error_type: null,
    impact_estimate: 0,
    explanation: null,
    rule_triggered: null,
    vat_valid: false,
    vat_status: null,
    vat_message: null
  };

  const sellerCountry = row.seller_country?.toUpperCase();
  const customerCountry = row.customer_country?.toUpperCase();
  const vatNumber = row.customer_vat_number?.trim() || '';
  const netAmount = parseFloat(row.net_amount) || 0;
  const vatApplied = parseFloat(row.vat_applied_percent);
  const vatAppliedIsNull = row.vat_applied_percent === null || row.vat_applied_percent === undefined || row.vat_applied_percent === '';

  const isInternational = sellerCountry !== customerCountry;
  const isCustomerEU = isEUCountry(customerCountry);
  const isSellerEU = isEUCountry(sellerCountry);

  // Validate VAT number using VIES only if needed for business rules
  let vatValidation;
  if (isCustomerEU && vatNumber && vatNumber.trim() !== '') {
    vatValidation = await validateVAT(vatNumber);
  } else if (!vatNumber || vatNumber.trim() === '') {
    vatValidation = { valid: false, status: 'INVALID', reason: 'empty', message: 'NIF/VAT no proporcionado' };
  } else {
    vatValidation = { valid: false, status: 'INVALID', reason: 'non_eu', message: 'Cliente fuera de la UE' };
  }
  
  result.vat_valid = vatValidation.status === 'VALID';
  result.vat_status = vatValidation.status;
  result.vat_message = vatValidation.message;

  // ========================================
  // REGLA 0 — PRIORIDAD ABSOLUTA
  // ========================================
  if (isCustomerEU && vatValidation.status === 'NOT_VERIFIED') {
    result.risk_level = 'MEDIO';
    result.error_type = 'NIF/VAT no verificable en VIES en este momento';
    result.rule_triggered = 'Regla 0: NIF/VAT no verificable';
    result.explanation = vatValidation.message + ' Revisa manualmente este NIF/VAT antes de procesar la operación como B2B.';
    return result;
  }

  // ========================================
  // REGLAS HIGH
  // ========================================

  // REGLA 1 — B2B intracomunitario con IVA aplicado
  if (sellerCountry !== customerCountry && 
      isSellerEU && 
      isCustomerEU && 
      vatValidation.status === 'VALID' && 
      !vatAppliedIsNull && 
      vatApplied > 0) {
    result.risk_level = 'ALTO';
    result.error_type = 'Venta B2B intracomunitaria con IVA aplicado';
    result.impact_estimate = netAmount * (vatApplied / 100);
    result.rule_triggered = 'Regla 1: B2B intracomunitario con IVA';
    result.explanation = `Esta operación es B2B transfronteriza (el cliente tiene NIF válido en VIES). En operaciones B2B intracomunitarias debe aplicarse inversión del sujeto pasivo con IVA 0%. Se detectó ${vatApplied}% cuando debería ser 0%.`;
    return result;
  }

  // REGLA 2 — B2C intracomunitario sin IVA
  if (sellerCountry !== customerCountry && 
      isSellerEU && 
      isCustomerEU && 
      vatValidation.status === 'INVALID' && 
      (!vatAppliedIsNull && vatApplied === 0)) {
    result.risk_level = 'ALTO';
    result.error_type = 'Venta B2C intracomunitaria sin IVA aplicado';
    result.impact_estimate = netAmount * (VAT_RATES[customerCountry]?.[0] || 21) / 100;
    result.rule_triggered = 'Regla 2: B2C intracomunitario sin IVA';
    result.explanation = `Venta B2C entre ${sellerCountry} y ${customerCountry} sin IVA aplicado. En ventas a particulares entre países UE diferentes, debe aplicarse el IVA del país de destino según normativa OSS.`;
    return result;
  }

  // REGLA 3 — OSS aplicado fuera de UE
  if (!isCustomerEU && !vatAppliedIsNull && vatApplied > 0) {
    result.risk_level = 'ALTO';
    result.error_type = 'IVA aplicado en operación fuera del ámbito UE';
    result.impact_estimate = netAmount * (vatApplied / 100);
    result.rule_triggered = 'Regla 3: IVA aplicado fuera UE';
    result.explanation = `Se aplicó ${vatApplied}% de IVA a una venta hacia ${customerCountry}, que no pertenece a la UE. Las exportaciones fuera de la UE suelen estar exentas de IVA.`;
    return result;
  }

  // ========================================
  // REGLAS MEDIUM
  // ========================================

  // REGLA 4 — Tipo de IVA no reconocido en país destino
  if (!vatAppliedIsNull && vatApplied > 0 && !isValidVATRate(customerCountry, vatApplied) && isCustomerEU) {
    result.risk_level = 'MEDIO';
    result.error_type = 'Porcentaje de IVA no reconocido para el país de destino';
    result.rule_triggered = 'Regla 4: Tipo IVA no reconocido';
    result.explanation = `El ${vatApplied}% aplicado no coincide con los tipos de IVA vigentes en ${customerCountry}. Tipos válidos: ${VAT_RATES[customerCountry]?.join('%, ')}%.`;
    return result;
  }

  // REGLA 5 — Operación nacional sin IVA
  if (sellerCountry === customerCountry && 
      isSellerEU && 
      !vatAppliedIsNull && 
      vatApplied === 0) {
    result.risk_level = 'MEDIO';
    result.error_type = 'Operación nacional sin IVA aplicado';
    result.impact_estimate = netAmount * (VAT_RATES[sellerCountry]?.[0] || 21) / 100;
    result.rule_triggered = 'Regla 5: Nacional sin IVA';
    result.explanation = `Operación nacional en ${sellerCountry} sin IVA. Las ventas dentro del mismo país normalmente deben incluir IVA, salvo excepciones específicas.`;
    return result;
  }

  // REGLA 6 — B2B intracomunitario repetido con IVA (detectado después en patrones)
  // Se marca en detectPatterns()

  // REGLA 7 — País UE sin IVA informado
  if (isCustomerEU && vatAppliedIsNull) {
    result.risk_level = 'MEDIO';
    result.error_type = 'Operación en UE sin IVA informado';
    result.rule_triggered = 'Regla 7: UE sin IVA informado';
    result.explanation = `No se ha informado el IVA aplicado en esta operación con ${customerCountry} (UE). Revisa que el campo no esté vacío.`;
    return result;
  }

  // ========================================
  // REGLAS NO_RISK
  // ========================================

  // REGLA 8 — Operación fuera UE sin IVA
  if (!isCustomerEU && (!vatAppliedIsNull && vatApplied === 0)) {
    result.risk_level = 'BAJO';
    result.error_type = 'Operación fuera de UE sin IVA';
    result.rule_triggered = 'Regla 8: Fuera UE sin IVA';
    result.explanation = `Exportación a ${customerCountry} (fuera UE) sin IVA aplicado. Tratamiento correcto según normativa de exportaciones.`;
    return result;
  }

  // REGLA 9 — Operación UE coherente
  if (vatValidation.status === 'VALID') {
    if ((sellerCountry !== customerCountry && (!vatAppliedIsNull && vatApplied === 0)) ||
        (sellerCountry === customerCountry && !vatAppliedIsNull && vatApplied > 0)) {
      result.risk_level = 'BAJO';
      result.error_type = 'Operación coherente según reglas actuales';
      result.rule_triggered = 'Regla 9: Operación coherente';
      result.explanation = `La operación sigue las reglas de IVA intracomunitario correctamente.`;
      return result;
    }
  }

  // Default: sin riesgo detectado
  result.risk_level = 'BAJO';
  result.error_type = 'Sin anomalías detectadas';
  result.explanation = 'No se detectan incoherencias según las reglas actuales de AITAX.';
  return result;
}

// REGLA 6 — Pattern detection: B2B intracomunitario repetido con IVA
function detectPatterns(results) {
  const b2bWithVAT = results.filter(r => 
    r.vat_status === 'VALID' && 
    r.seller_country !== r.customer_country && 
    r.vat_applied_percent > 0
  );

  if (b2bWithVAT.length >= 3) {
    b2bWithVAT.forEach(row => {
      if (row.risk_level === 'ALTO') {
        row.rule_triggered = 'Regla 6: Patrón B2B repetido con IVA + ' + row.rule_triggered;
        row.explanation = `⚠️ PATRÓN SISTÉMICO: Se detectaron ${b2bWithVAT.length} operaciones B2B intracomunitarias con IVA aplicado. Esto puede indicar un error de configuración fiscal. ` + row.explanation;
      }
    });
  }

  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { rows, fileName } = await req.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'No se proporcionaron datos válidos' }, { status: 400 });
    }

    // Analyze each row (async)
    let results = await Promise.all(rows.map(row => analyzeRow(row, rows)));
    
    // Apply pattern detection
    results = detectPatterns(results);

    // Calculate summary stats
    const highRisk = results.filter(r => r.risk_level === 'ALTO').length;
    const mediumRisk = results.filter(r => r.risk_level === 'MEDIO').length;
    const noRisk = results.filter(r => r.risk_level === 'BAJO').length;
    const totalImpact = results.reduce((sum, r) => sum + (r.impact_estimate || 0), 0);

    return Response.json({
      success: true,
      summary: {
        total_rows: rows.length,
        high_risk: highRisk,
        medium_risk: mediumRisk,
        no_risk: noRisk,
        total_impact: totalImpact
      },
      results
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});