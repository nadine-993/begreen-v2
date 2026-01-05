export interface User {
    email: string;
    name: string;
    role: string;
    department?: string;
    token: string;
}

export interface LoginResponse extends User { }
