export interface OrderItem {
    productId: string;
    quantity: number;
    price: number; // Precio unitario capturado al momento de la compra
}

export interface Order {
    orderId: string;
    userId: string;
    items: OrderItem [];
    total: number;
    status: "pending" | "confirmed" | "completed" | "cancelled";
    createdAt: string;
    updatedAt: string;
}
