export interface Sale{
    _company_id: string;
    product: string;
    payment_method: 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'other';
    value: number;
    sold_at: Date;
    created_at?: Date;
    updated_at?: Date;
}