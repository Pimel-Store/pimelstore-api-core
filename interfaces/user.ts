export interface User{
    _uuid: string;
    _company_id: string;
    name: string;
    email: string;
    password: string;
    created_at?: Date;
    updated_at?: Date;
}