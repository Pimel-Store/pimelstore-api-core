export interface Expense{
    _company_id: string;
    description: string;
    category: 'rent' | 'payroll' | 'supplier' | 'tax' | 'utilities' | 'other';
    payment_method: 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'other';
    value: number;
    expensed_at: Date;
    created_at?: Date;
    updated_at?: Date;
}
