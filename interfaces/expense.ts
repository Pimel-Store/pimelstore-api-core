export interface Expense{
    _company_id: string;
    description: string;
    category_id: string;
    payment_method: 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'other';
    value: number;
    expensed_at: Date;
    created_at?: Date;
    updated_at?: Date;
}
