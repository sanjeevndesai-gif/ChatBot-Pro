export interface User {
    usersId: string;
    name: string;
    phone: string;
    email?: string;
    specialization?: string;
    role: 'Admin' | 'Doctor' | 'Staff';
}

export interface AuthUser {
    userId: string;
    mongoId?: string;
    fullname: string;
    email: string;
    phone?: string;
    occupation?: string;
    address?: string;
    orgname?: string;
    country?: string;
    country_code?: string;
    language?: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user?: AuthUser;
    message?: string;
}
