export interface User {
    id?: string;
    email: string;
    name: string;
    role: string;
    department?: string;
    signature?: string;
    token: string;
}

export interface LoginResponse extends User { }
