const API_URL = import.meta.env.VITE_API_URL || 'https://app-aitax-backend.onrender.com';

export const base44 = {
  functions: {
    async analyzeVAT(rows) {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
      }

      return await response.json();
    },

    // AÑADE ESTE MÉTODO:
    async invoke(functionName, params) {
      if (functionName === 'analyzeVAT') {
        return this.analyzeVAT(params.rows);
      }
      throw new Error(`Function ${functionName} not found`);
    }
  },

  async getOrders(shop) {
    const response = await fetch(`${API_URL}/api/orders?shop=${shop}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }
};
