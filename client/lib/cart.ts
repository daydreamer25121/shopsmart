export type CartItem = {
  productId: string;
  quantity: number;
};

const CART_KEY = "shopsmart_cart_items_v1";

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x.productId === "string")
      .map((x) => ({ productId: x.productId, quantity: Math.max(1, Number(x.quantity || 1)) }));
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function addToCart(productId: string, quantity = 1) {
  const items = loadCart();
  const idx = items.findIndex((x) => x.productId === productId);
  if (idx >= 0) {
    items[idx] = { ...items[idx], quantity: items[idx].quantity + Math.max(1, quantity) };
  } else {
    items.push({ productId, quantity: Math.max(1, quantity) });
  }
  saveCart(items);
  return items;
}

export function setQty(productId: string, quantity: number) {
  const q = Math.max(1, Number(quantity || 1));
  const items = loadCart();
  const next = items.map((x) => (x.productId === productId ? { ...x, quantity: q } : x));
  saveCart(next);
  return next;
}

export function removeFromCart(productId: string) {
  const items = loadCart();
  const next = items.filter((x) => x.productId !== productId);
  saveCart(next);
  return next;
}

export function clearCart() {
  saveCart([]);
}

