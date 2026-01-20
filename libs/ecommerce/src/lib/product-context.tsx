'use client';

import React, { createContext, useContext } from 'react';
import { Product } from './types';

interface ProductContextType {
  product: Product;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ product: Product; children: React.ReactNode }> = ({ 
  product, 
  children 
}) => {
  return (
    <ProductContext.Provider value={{ product }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used within a ProductProvider. Ensure the component is wrapped in a ProductProvider.');
  }
  return context.product;
};
