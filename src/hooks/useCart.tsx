import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stock = (await api.get<Stock>(`/stock/${productId}`)).data;
      const productQuantity = stock.amount;

      if (productQuantity == 0) {
        toast.error("Produto esta sem estoque!");
        return;
      }

      const productExists = cart.find(product => product.id === productId);
      
      if (productExists) {
        if (productQuantity <= productExists.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        //produto ja esta no carrinho
        const newCart = [...cart]
        const productIndex = newCart.findIndex(product => product.id === productId);
        newCart[productIndex].amount += 1;
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
      }
      else {
        //adicionar produto ao carrinho
        const product = (await api.get<Product>(`/products/${productId}`)).data;
        product.amount = 1;
        const newCart = [...cart, product];
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];
      const productExists = newCart.find(product => product.id === productId)
      if (!productExists) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const productIndex = newCart.findIndex(product => product.id === productId);

      newCart.splice(productIndex);
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = (await api.get<Stock>(`/stock/${productId}`)).data;
      const productQuantity = stock.amount;

      if (amount > productQuantity) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = [...cart];
      const productIndex = newCart.findIndex(product => product.id === productId);
      newCart[productIndex].amount = amount;
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
